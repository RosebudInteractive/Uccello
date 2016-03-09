if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent', '../system/event', '../metaData/metaDefs', '../predicate/predicate'],
    function (AComponent, Event, Meta, Predicate) {
        var Dataset = AComponent.extend({

            className: "Dataset",
            classGuid: UCCELLO_CONFIG.classGuids.Dataset,
            metaFields: [
                {
                    fname: "Root", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.DataRoot,
                        res_elem_type: UCCELLO_CONFIG.classGuids.DataRoot
                    }
                },
                {
                    fname: "ObjectTree", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.MetaObjTree,
                        res_elem_type: UCCELLO_CONFIG.classGuids.MetaObjTreeElemRoot
                    }
                },
				/* {fname: "RootInstance", ftype: "string"}, */
                { fname: "Cursor", ftype: "string" },
                { fname: "Active", ftype: "boolean" },
                {
                    fname: "Master", ftype: {
                        type: "ref",
                        res_elem_type: UCCELLO_CONFIG.classGuids.Dataset
                    }
                },
				{ fname: "OnMoveCursor", ftype: "event" },
				{ fname: "ObjType", ftype: "string" },
				{ fname: "AutoEdit", ftype: "boolean" },
				{ fname: "CachedUpdates", ftype: "boolean" }
            ],
            metaCols: [
				{ "cname": "Fields", "ctype": "DataField" },
				{ "cname": "Indexes", "ctype": "CollectionIndex" }
            ],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                if (!params) return;
                this.pvt.params = params;
                this.pvt.dataObj = null;
                this._predicate = null;
                this._isWaitingForData = false;
                this._isRootSwitched = false;
                this._moveCursorEventEnabled = true;
                this._isParentChangingState = false;

                if (this.get("OnMoveCursor"))
                    /*jshint evil: true */
                    this.onMoveCursor = new Function("newVal", this.get("OnMoveCursor"));

            },

            subsInit: function () {
                var master = this.master(); // подписаться на обновление данных мастер датасета

                if (master && this.active()) {
                    master.event.on({
                        type: 'refreshData',
                        subscriber: this,
                        callback: function () { this._dataInit(false); }
                    });
                    master.event.on({
                        type: 'moveCursor',
                        subscriber: this,
                        callback: function () { this._dataInit(false); }
                    });
                    master.event.on({
                        type: 'switchRoot',
                        subscriber: this,
                        callback: function () { this._switchRoot(); }
                    });
                    master.event.on({
                        type: 'beforeStateChange',
                        subscriber: this,
                        callback: function (args) { this._propagateChangeStateEvent(args); }
                    });
                    master.event.on({
                        type: 'afterStateChange',
                        subscriber: this,
                        callback: function (args) { this._propagateChangeStateEvent(args); }
                    });
                }
            },

            dataInit: function () {
                if (this.active()) this._dataInit(true);
            },

            _onMasterSwitchRoot: function () {
                var objTree = this.getSerialized("ObjectTree") ? this.getSerialized("ObjectTree") : undefined;
                var master = this.master();
                var result = objTree && master;
                if (result) {
                    if (!this.objectTree())
                        throw new Error("Dataset::_onMasterSwitchRoot: Undefined \"ObjectTree\" reference!");
                    var currObj = master.getCurrentDataObject();
                    if (currObj) {
                        var alias = this.objectTree().alias();
                        var dataRoot = currObj.getDataRoot(alias);
                        this.root(dataRoot);
                        this._setDataObj(this.cursor());
                    }
                    else
                        this.pvt.dataObj = null;
                }
                return result;
            },

            _switchRoot: function () {
                if (this._onMasterSwitchRoot()) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" fires \"switchRoot\" in method \"_switchRoot\".");
                    this.event.fire({ type: 'switchRoot', target: this });
                };
            },

            processDelta: function () {
                //
                // Вне зависимости от того, поменялся ли курсор обновляем ссылку
                //   на текущий объект данных: данные могли поменяться !!!
                //   (надо научиться проверять поменялись ли данные)
                //
                //if (this.isFldModified("Cursor", "pd")) {
                    if (!this._onMasterSwitchRoot())
                        this._setDataObj(this.cursor());
                //}
                this._isProcessed(true);
            },

            _dataInit: function (onlyMaster) {

                if (!this.active()) return;

                if (this._isParentChangingState)
                {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" receives \"_dataInit\" request while parent is changing STATE.");
                    return;
                };

                if (this._isWaitingForData) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" receives \"_dataInit\" request while it's waiting for data.");
                    return;
                };

                var that = this;

                function icb(res) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + that.name() + "\" receives data.");

                    var dataRoot = that.getDB().getObj(res.guids[0]);
                    if (dataRoot)
                        that.root(dataRoot);
                    that._initCursor(true);
                    that._isWaitingForData = false;
                }

                var dataRoot = this.root();
                var dataRootGuid = this.getSerialized("Root") ? this.getSerialized("Root").guidInstanceRes : undefined;
                var rg = this.objtype(), rgi = dataRootGuid || rg;

                var master = this.master();
                var needToQuery = true;
                if (rg) {
                    if (!dataRoot || !onlyMaster) {
                        if (onlyMaster && master) return; // если НЕ мастер, а детейл, то пропустить
                        var params = { rtype: "data" };

                        var rgp = rg;
                        if (rgi) rgp = rgi;

                        // Если (dataRootGuid && onlyMaster) === true, то это означает, что у нас есть ссылка на инстанс рута данных на сервере
                        //   и происходит начальная ициализация данных - в этом случае необходимо просто запросить рут данных,
                        //   не делая запрос к БД.
                        if (!(dataRootGuid && onlyMaster)) {

                            var objTree = this.getSerialized("ObjectTree") ? this.getSerialized("ObjectTree") : undefined;

                            if (objTree) {
                                if (!this.objectTree())
                                    throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                                params.expr = { model: this.objectTree().makeRequest(Meta.ReqLevel.AllAndEmptyChilds) };

                                if (master) {
                                    var currObj = master.getCurrentDataObject();
                                    if (currObj) {
                                        var alias = this.objectTree().alias();
                                        var dataRoot = currObj.getDataRoot(alias);
                                        if (dataRoot) {

                                            if (master.getState() === Meta.State.Edit) {
                                                this.root(dataRoot);
                                                this._isRootSwitched = true;
                                                this._initCursor(true);
                                                needToQuery = false;
                                            }
                                            else {

                                                params.path = {
                                                    globalRoot: dataRoot.getRoot().getGuid(),
                                                    dataRoot: dataRoot.getGuid(),
                                                    parent: dataRoot.getParent().getGuid(),
                                                    parentColName: dataRoot.getColName()
                                                };

                                                var keyVal = master.getField(currObj._keyField);
                                                var parentField = dataRoot.parentField();
                                                if (!parentField)
                                                    throw new Error("Dataset::_dataInit: \"" + alias + "\" Undefined \"ParentField\"!");

                                                if (!this._predicate)
                                                    this._predicate = new Predicate(this.getDB(), {});
                                                this._predicate
                                                    .addConditionWithClear({ field: parentField, op: "=", value: keyVal });

                                                params.expr.predicate = this.getDB().serialize(this._predicate);
                                                rgp = params.path.dataRoot;
                                            }

                                        }
                                        else
                                            throw new Error("Dataset::_dataInit: Undefined \"DataRoot\"!");
                                    }
                                    else {
                                        // Родительский DataSet пустой!
                                        this._isRootSwitched = true;
                                        this.root(null);
                                        this._initCursor(true);
                                        needToQuery = false;
                                        //throw new Error("Dataset::_dataInit: Undefined \"CurrentDataObject\"!");
                                    }
                                };
                            }
                            else {
                                if (master) { // если детейл, то экспрешн
                                    params.expr = master.getField("Id");
                                }
                            };
                        };

                        if (needToQuery) {
                            this._isWaitingForData = true;
                            if (DEBUG)
                                console.warn("### WARNING: \"" + this.name() + "\" requests data.");
                            this.dataLoad([rgp], params, icb);
                        };
                    }
                    else this._initCursor();
                }
            },

            // forceRefresh - возбудить событие даже если курсор "не двигался" - это нужно для случая загрузки данных
            _initCursor: function (forceRefresh) {
                var dataRoot = this.root();
                if (forceRefresh)
                    this._moveCursorEventEnabled = false;

                if (dataRoot) {
                    var col = dataRoot.getCol("DataElements");
                    if (!dataRoot.getCol("DataElements").getObjById(this.cursor())) {
                        if (col.count() > 0) this.cursor(col.get(0).id()); // установить курсор в новую позицию (наверх)
                        else this.cursor(null);
                    }
                    else {
                        this._setDataObj(this.cursor());
                        //if (forceRefresh) this.event.fire({type: 'refreshData', target: this });
                    };
                };

                if (forceRefresh) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" fires \"refreshData\" in method \"_initCursor\".");
                    this._moveCursorEventEnabled = true;
                    this.event.fire({ type: 'refreshData', target: this });
                }
            },

            getField: function (name) {
                if (this.pvt.dataObj)
                    return this.pvt.dataObj.get(name);
                else
                    return undefined;

            },

            setField: function (name, value) {
                if (this.pvt.dataObj) {
                    var vold = this.pvt.dataObj.get(name);
                    var nameLow = name.charAt(0).toLowerCase() + name.slice(1);
                    this.pvt.dataObj[nameLow](value);
                    if (value != vold) // если значение действительно изменено, то возбуждаем событие
                        this.event.fire({
                            type: 'modFld',
                            target: this
                        });
                }
            },


            // были ли изменены данные датасета
            isDataSourceModified: function () {
                if (this._isRootSwitched) {
                    //this._isRootSwitched = false;
                    return true;
                }
                var rootObj = this.root();
                if (rootObj) return (rootObj.isDataModified());
                else return true; // TODO можно оптимизировать - если хотим не перерисовывать пустой грид
            },

            // Properties

            root: function (value) {

                var oldVal = this._genericSetter("Root");
                var newVal = this._genericSetter("Root", value);
                return newVal;
            },

            objectTree: function (value) {
                return this._genericSetter("ObjectTree", value);
            },

            canMoveCursor: function () {
                result = this.cachedUpdates();
                if (!result) {
                    var curr_obj = this.getCurrentDataObject();
                    if (curr_obj) {
                        var curr_state = curr_obj._currState();
                        result = curr_state === Meta.State.Browse;
                        if ((!result) && this.master())
                            result = this.master().getState() === Meta.State.Edit;
                    }
                    else
                        result = true;
                };
                return result;
            },

            cursor: function (value) {
                var oldVal = this._genericSetter("Cursor");
                var newVal = this._genericSetter("Cursor", value);
                if (newVal !== oldVal) {

                    if (!this.canMoveCursor()) {
                        throw new Error("Can't move cursor because current object is not in \"Browse\" state.");
                    }

                    this._setDataObj(value);
                    if ("onMoveCursor" in this) this.onMoveCursor(newVal);

                    if (this._moveCursorEventEnabled) {
                        if (DEBUG)
                            console.warn("### WARNING: \"" + this.name() + "\" fires \"moveCursor\" in method \"cursor\".");

                        this.event.fire({
                            type: 'moveCursor',
                            target: this
                        });
                    }
                }

                return newVal;
            },

            first: function () {
                var dataRoot = this.root();
                if (dataRoot) {
                    var col = dataRoot.getCol("DataElements");
                    if (col.count() > 0)
                        this.cursor(col.get(0).id());
                }
            },

            prev: function () {
                var dataRoot = this.root();
                if (dataRoot) {
                    var col = dataRoot.getCol("DataElements");
                    var index = this.getCursorIndex();
                    if (index > 0)
                        this.cursor(col.get(index - 1).id());
                }
            },

            next: function () {
                var dataRoot = this.root();
                if (dataRoot) {
                    var col = dataRoot.getCol("DataElements");
                    var index = this.getCursorIndex();
                    if (index < col.count() - 1)
                        this.cursor(col.get(index + 1).id());
                }
            },

            getCursorIndex: function () {
                var dataRoot = this.root();
                if (dataRoot) {
                    var col = dataRoot.getCol("DataElements");
                    var cursor = this.cursor();
                    if (cursor)
                        for (var i = 0, len = col.count() ; i < len; i++) {
                            if (cursor == col.get(i).id()) {
                                return i;
                            }
                        }
                }
                return false;
            },

            // установить "курсор" на внутренний объект dataobj
            _setDataObj: function (value) {
                this.pvt.dataObj = this.root().getCol("DataElements").getObjById(value); // TODO поменять потом
            },

            active: function (value) {
                return this._genericSetter("Active", value);
            },

            master: function (value) {
                return this._genericSetter("Master", value);
            },

            objtype: function (value) {
                return this._genericSetter("ObjType", value);
            },

            autoEdit: function (value) {
                return this._genericSetter("AutoEdit", value);
            },

            cachedUpdates: function (value) {
                return this._genericSetter("CachedUpdates", value);
            },

            getState: function () {
                var state = Meta.State.Unknown;
                var curr_obj = this.getCurrentDataObject();
                if (curr_obj)
                    state = curr_obj._currState()
                else
                    if (this.cachedUpdates() === true) {
                        var root = this.root();
                        if (root)
                            state = root._currState();
                    };
                return state;
            },

            dataLoad: function (rootGuids, params, cb) {
                if (this.isMaster())
                    this.getControlMgr().getRoots(rootGuids, params, cb);
                else {
                    params.subDbGuid = this.getControlMgr().getGuid();

                    this.remoteCall('dataLoad', [rootGuids, params], cb);
                }
            },

            getCurrentDataObject: function () {
                return this.pvt.dataObj;
            },

            /**
         *  добавить новый объект в коллекцию
         * @param flds - поля объекта для инициализации
         */
            //addObject: function (flds, cb) {

            //    var args = {
            //        dbGuid: this.getDB().isMaster() ? this.getDB().getGuid() : this.getDB().getProxyMaster().guid,
            //        rootGuid: this.root() ? this.root().getGuid() : null,
            //        objTypeGuid: this.objtype(),
            //        flds: flds
            //    };
            //    this.getDB().getContext().execWorkFlowMethod("addObject", this, this._addObject, [args, cb]);
            //},

            _getFinalizeCallback: function (action, cb) {
                var old_state = this.getState();
                var self = this;
                return function (result) {
                    var is_succeed = result.result === "OK";
                    self.event.fire({
                        type: 'afterStateChange',
                        target: this,
                        action: action,
                        isSucceeded: result.result === "OK",
                        prevState: old_state,
                        currState: self.getState()
                    });
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };
            },

            reloadCurrObject: function (cb) {
                var obj = this.getCurrentDataObject();
                if(obj)
                    this._reloadObject(obj, cb);
                else
                    if (cb)
                        cb({ result: "ERROR", message: "Current object is undefined." });
            },

            _reloadObject: function (currObj, cb) {

                var result = { result: "OK" };
                var self = this;
                var params = { rtype: "data" };

                function icb(res) {
                    self._isWaitingForData = false;
                    if (!(res && res.guids && (res.guids.length === 1)))
                        result = { result: "ERROR", message: "Data Object \"" + params.path.dataRoot + "\" doesn't longer exist!" };
                    else
                        self._setDataObj(self.cursor());
                    if (DEBUG)
                        console.warn("### WARNING: \"" + self.name() + "\" fires \"switchRoot\" in method \"_reloadObject\".");
                    self.event.fire({ type: 'switchRoot', target: self });
                    if (cb) {
                        cb(result);
                    }
                }

                if (this._isWaitingForData)
                    result = { result: "ERROR", message: "Data Set is waiting for data!" };

                var objTree = this.getSerialized("ObjectTree") ? this.getSerialized("ObjectTree") : undefined;

                if (objTree && (!this._isWaitingForData)) {
                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    params.expr = { model: this.objectTree().makeRequest(Meta.ReqLevel.All), is_single: true };

                    var dataRoot = currObj.getParent();
                    if (dataRoot) {
                        params.path = {
                            globalRoot: currObj.getRoot().getGuid(),
                            dataRoot: currObj.getGuid(),
                            parent: dataRoot.getGuid(),
                            parentColName: currObj.getColName()
                        };

                        var keyVal = this.getField(currObj._keyField);

                        if (!this._predicate)
                            this._predicate = new Predicate(this.getDB(), {});
                        this._predicate
                            .addConditionWithClear({ field: currObj._keyField, op: "=", value: keyVal });

                        params.expr.predicate = this.getDB().serialize(this._predicate);
                    }
                    else
                        throw new Error("Dataset::_reloadObject: Undefined \"DataRoot\"!");

                    this._isWaitingForData = true;
                    this.dataLoad([currObj.getGuid()], params, icb);

                }
                else
                    if (cb)
                        cb(result);
            },

            _propagateChangeStateEvent: function (args) {
                var keys = Object.keys(args);
                var out_args = {};
                for (var i = 0; i < keys.length ; i++)
                    out_args[keys[i]] = args[keys[i]];
                out_args.target = this;
                this._isParentChangingState = args.type === 'beforeStateChange';
                this.event.fire(out_args);
            },

            // $u.r2(function(){$u.get("DatasetCompany").edit(function(){console.log("Done!")})});
            //
            edit: function (cb) {
                try {
                    var action = "edit";
                    var obj = this.getCurrentDataObject();
                    var err_msg = "Current object is undefined.";
                    if (this.cachedUpdates() === true) {
                        obj = this.root();
                        var err_msg = "Data Root is undefined.";
                        // Временно не поддерживаем !!!
                        throw new Error("Cached Updates mode isn't supported currently !!!");
                    };
                    if (!obj)
                        throw new Error(err_msg);
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Edit
                    });

                    var self = this;
                    this._reloadObject(obj, function (result) {
                        if (result.result === "OK") {
                            var edt_obj=(self.cachedUpdates() ? self.root() : self.getCurrentDataObject());
                            edt_obj.edit(function (result) {
                                // Processing of data reloading should be here !!!
                                console.log("Current state: " + edt_obj._currState());
                                self._getFinalizeCallback(action, cb)(result);
                            });
                        }
                        else
                            if (cb)
                                setTimeout(function () {
                                    cb(result);
                                }, 0)
                    });
                }
                catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0)
                    else
                        throw err;
                };
            },

            save: function (options, cb) {
                try {
                    var action = "save";
                    var obj = this.getCurrentDataObject();
                    var err_msg = "Current object is undefined.";
                    if (!obj)
                        throw new Error(err_msg);
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Browse
                    });
                    obj.save(options, this._getFinalizeCallback(action, cb));
                }
                catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0)
                    else
                        throw err;
                };
            },

            cancel: function (cb) {
                try {
                    var action = "cancel";
                    var obj = this.getCurrentDataObject();
                    var err_msg = "Current object is undefined.";
                    if (!obj)
                        throw new Error(err_msg);
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Browse
                    });
                    obj.cancel(this._getFinalizeCallback(action, cb));
                }
                catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0)
                    else
                        throw err;
                };
            },

            applyUpdates: function (options, cb) {
                try {
                    if (this.cachedUpdates() !== true)
                        throw new Error("Can't run \"applyUpdates\" when \"CachedUpdates\" == false.");

                    var action = "applyUpdates";
                    var obj = this.root();
                    var err_msg = "Data Root is undefined.";
                    if (!obj)
                        throw new Error(err_msg);
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Browse
                    });
                    obj.save(options, this._getFinalizeCallback(action, cb));
                }
                catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0)
                    else
                        throw err;
                };
            },

            cancelUpdates: function (cb) {
                try {
                    if (this.cachedUpdates() !== true)
                        throw new Error("Can't run \"cancelUpdates\" when \"CachedUpdates\" == false.");

                    var action = "cancelUpdates";
                    var obj = this.root();
                    var err_msg = "Data Root is undefined.";
                    if (!obj)
                        throw new Error(err_msg);
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Browse
                    });
                    obj.cancel(this._getFinalizeCallback(action, cb));
                }
                catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0)
                    else
                        throw err;
                };
            },

            addObject: function (flds, cb) {

                var self = this;

                function addObjectCallback(result) {

                    if (DEBUG)
                        console.log("### addObjectCallback: " + JSON.stringify(result));

                    if (result && (result.result === "OK") && result.keyValue) {
                        self.cursor(result.keyValue);
                    };

                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };

                this.root().newObject(flds, {}, addObjectCallback);

            }
        });
        return Dataset;
    }
);
