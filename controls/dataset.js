if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent', '../system/event', '../metaData/metaDefs'],
    function (AComponent, Event, Meta) {
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
                }
            },

            dataInit: function () {
                if (this.active()) this._dataInit(true);
            },

            processDelta: function () {

                if (this.isFldModified("Cursor", "pd")) this._setDataObj(this.cursor());

                this._isProcessed(true);

            },

            _dataInit: function (onlyMaster) {

                if (!this.active()) return;
                var that = this;
                function icb(res) {
                    var dataRoot = that.getDB().getObj(res.guids[0]);
                    if (dataRoot)
                        that.root(dataRoot);
                    that._initCursor(true);
                }

                var dataRoot = this.root();
                var dataRootGuid = this.getSerialized("Root") ? this.getSerialized("Root").guidInstanceRes : undefined;
                var rg = this.objtype(), rgi = dataRootGuid || rg;

                var master = this.master();
                if (rg) {
                    if (!dataRoot || !onlyMaster) {
                        if (onlyMaster && master) return; // если НЕ мастер, а детейл, то пропустить
                        var params = { rtype: "data" };
                        if (master) { // если детейл, то экспрешн
                            params.expr = master.getField("Id");
                        }
                        var rgp = rg;
                        if (rgi) rgp = rgi;
                        this.dataLoad([rgp], params, icb);
                    }
                    else this._initCursor();
                }
            },

            // forceRefresh - возбудить событие даже если курсор "не двигался" - это нужно для случая загрузки данных
            _initCursor: function (forceRefresh) {
                var dataRoot = this.root();
                if (dataRoot) {
                    var col = dataRoot.getCol("DataElements");
                    if (!dataRoot.getCol("DataElements").getObjById(this.cursor())) {
                        if (col.count() > 0) this.cursor(col.get(0).id()); // установить курсор в новую позицию (наверх)
                        else this.cursor(null);
                    }
                    else {
                        this._setDataObj(this.cursor());
                        //if (forceRefresh) this.event.fire({type: 'refreshData', target: this });
                    }
                    if (forceRefresh) this.event.fire({ type: 'refreshData', target: this });
                };
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

            cursor: function (value) {
                var oldVal = this._genericSetter("Cursor");
                var newVal = this._genericSetter("Cursor", value);
                if (newVal !== oldVal) {

                    if (this.cachedUpdates() !== true) {
                        var curr_obj = this.getCurrentDataObject();
                        if (curr_obj) {
                            var curr_state = curr_obj._currState();
                            if (curr_state !== Meta.State.Browse)
                                throw new Error("Can't move cursor because current object is in state \"" +
                                    Meta.stateToString(curr_state) + "\".");
                        };
                    }

                    this._setDataObj(value);
                    if ("onMoveCursor" in this) this.onMoveCursor(newVal);

                    this.event.fire({
                        type: 'moveCursor',
                        target: this
                    });
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

            edit: function (cb) {
                try {
                    var action = "edit";
                    var obj = this.getCurrentDataObject();
                    var err_msg = "Current object is undefined.";
                    if (this.cachedUpdates() === true) {
                        obj = this.root();
                        var err_msg = "Data Root is undefined.";
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
                    obj.edit(this._getFinalizeCallback(action, cb));
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

                function addObjectCallback(objGuid) {

                    //this.event.fire({ // TODO другое событие сделать
                    //    type: 'modFld',
                    //    target: this
                    //});
                    if (DEBUG)
                        console.log("### addObjectCallback: " + JSON.stringify(objGuid));

                    if (cb)
                        setTimeout(function () {
                            cb(objGuid);
                        }, 0);
                };

                this.root().newObject(flds, {}, addObjectCallback);

            }
        });
        return Dataset;
    }
);