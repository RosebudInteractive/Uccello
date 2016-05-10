if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./datasetBase', '../system/event', '../metaData/metaDefs', '../predicate/predicate'],
    function (DatasetBase, Event, Meta, Predicate) {
        var Dataset = DatasetBase.extend({

            className: "Dataset",
            classGuid: UCCELLO_CONFIG.classGuids.Dataset,
            metaFields: [
                {
                    fname: "ObjectTree", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.DataModel,
                        res_elem_type: UCCELLO_CONFIG.classGuids.BaseTreeModel
                    }
                },
                { fname: "Cursor", ftype: "string" },
                { fname: "Active", ftype: "boolean" },
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
                this._moveCursorEventEnabled = true;
                this._isParentChangingState = false;

                this._master = null;
                this._handlers = [];

                if (this.get("OnMoveCursor"))
                    /*jshint evil: true */
                    this.onMoveCursor = new Function("newVal", this.get("OnMoveCursor"));
            },

            subsInit: function () {
                if (this.objectTree())
                    this.objectTree().registerDataset(this);
            },

            dataInit: function () {
                if (this.active())
                    this._dataInit(true, "Dataset::dataInit");
            },

            refreshData: function () {
                if (this.active() && (this.getState() === Meta.State.Browse))
                    this._dataInit(false, "Dataset::refreshData");
            },

            _unSubscribeAll: function () {
                this._handlers.forEach(function (elem) {
                    elem.obj.off(elem.handler);
                });
                this._handlers.length = 0;
            },

            _subscribeAll: function () {
                var master = this._master;
                if (master) {
                    var h = {
                        type: 'refreshData',
                        subscriber: this,
                        callback: function () { this._dataInit(false, "Dataset::refreshData"); }
                    };
                    master.event.on(h);
                    this._handlers.push({ obj: master.event, handler: h });

                    h = {
                        type: 'beforeStateChange',
                        subscriber: this,
                        callback: function (args) { this._propagateChangeStateEvent(args); }
                    };
                    master.event.on(h);
                    this._handlers.push({ obj: master.event, handler: h });

                    h = {
                        type: 'afterStateChange',
                        subscriber: this,
                        callback: function (args) { this._propagateChangeStateEvent(args); }
                    };
                    master.event.on(h);
                    this._handlers.push({ obj: master.event, handler: h });
                };
            },

            onDataChanged: function (is_reloaded, collection, data_root) {
                this._initCursor(true);
            },

            onReloadObject: function (is_root) {
                this._setDataObj(this.cursor())
            },

            processDelta: function () {
                this._setDataObj(this.cursor());
                this._isProcessed(true);
            },

            _dataInit: function (onlyMaster, source) {

                if (!this.active()) return;

                if (!this.objectTree())
                    throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                if (this._isParentChangingState) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" receives \"_dataInit\" request while parent is changing STATE.");
                    return;
                };

                var master = this.master();

                if (!this.objectTree().hasData() || !onlyMaster) {
                    if (onlyMaster && master) return; // если НЕ мастер, а детейл, то пропустить

                    this.objectTree().loadData(onlyMaster, false, source);
                }
                else this._initCursor(false, "Dataset::_dataInit");
            },

            // forceRefresh - возбудить событие даже если курсор "не двигался" - это нужно для случая загрузки данных
            _initCursor: function (forceRefresh) {
                if (forceRefresh)
                    this._moveCursorEventEnabled = false;

                if (this.objectTree()) {
                    var obj = this.objectTree().getObjByCursor(this.cursor());
                    if (!obj)
                        this.first()
                    else
                        this.pvt.dataObj = obj;
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
            isDataSourceModified: function (log) {
                var result = false;
                if (this.objectTree())
                    result = this.objectTree().isDataSourceModified(log);
                return result;
            },

            // Properties

            getDataCollection: function () {
                return this.objectTree() ? this.objectTree().getDataCollection() : null;
            },

            objectTree: function (value) {
                return this._genericSetter("ObjectTree", value);
            },

            canMoveCursor: function () {
                result = false;
                if (this.objectTree())
                    result = this.objectTree().canMoveCursor(this.cachedUpdates());
                return result;
            },

            canEdit: function () {
                result = false;
                if (this.objectTree())
                    result = this.objectTree().canEdit();
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
                if (this.objectTree())
                    this.cursor(this.objectTree().getFirstCursorVal())
                else
                    this.cursor(null);
            },

            last: function () {
                if (this.objectTree())
                    this.cursor(this.objectTree().getLastCursorVal())
                else
                    this.cursor(null);
            },

            prev: function () {
                if (this.objectTree()){
                    var val = this.objectTree().getPrevCursorVal(this.cursor());
                    if (val !== null)
                        this.cursor(val);
                };
            },

            next: function () {
                if (this.objectTree()) {
                    var val = this.objectTree().getNextCursorVal(this.cursor());
                    if (val !== null)
                        this.cursor(val);
                };
            },

            // установить "курсор" на внутренний объект dataobj
            _setDataObj: function (value) {
                var obj = null;
                if (this.objectTree())
                    obj = this.objectTree().getObjByCursor(value);
                this.pvt.dataObj = obj;
            },

            active: function (value) {
                return this._genericSetter("Active", value);
            },

            master: function (value) {
                if ((value === null) || (value instanceof Dataset)) {
                    if (this._master)
                        this._unSubscribeAll();
                    this._master = value;
                    this._subscribeAll();
                };
                return this._master;
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
                if (!this.objectTree())
                    throw new Error("Dataset::getState: Undefined \"ObjectTree\" reference!");

                return this.objectTree().getState();
            },

            getCurrentDataObject: function () {
                var result = this.pvt.dataObj;
                if (result && this.objectTree()) {
                    var real_val = this.objectTree().getObjByCursor(this.cursor());
                    if (real_val) {
                        if (!(real_val === result)) {
                            result = this.pvt.dataObj = null;
                        };
                    }
                    else {
                        result = this.pvt.dataObj = null;
                    };
                };
                return result;
            },

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
                if (obj) {
                    if (!this.objectTree())
                        throw new Error("Dataset::reloadCurrObject: Undefined \"ObjectTree\" reference!");
                    this.objectTree().loadObject(obj, true, cb);
                }
                else
                    if (cb)
                        cb({ result: "ERROR", message: "Current object is undefined." });
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
                    ////if (this.cachedUpdates() === true) {
                    ////    // Временно не поддерживаем !!!
                    ////    throw new Error("Cached Updates mode isn't supported currently !!!");
                    ////};
                    ////if (!obj)
                    ////    throw new Error(err_msg);
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Edit
                    });

                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    var self = this;
                    this.objectTree().edit(this.cachedUpdates(), function (result) {
                        self._getFinalizeCallback(action, cb)(result);
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

                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    this.objectTree().save(this.cachedUpdates(), options, this._getFinalizeCallback(action, cb));
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
                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    this.objectTree().cancel(this.cachedUpdates(), this._getFinalizeCallback(action, cb));
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
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Browse
                    });

                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    this.objectTree().save(this.cachedUpdates(), options, this._getFinalizeCallback(action, cb));
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
                    this.event.fire({
                        type: 'beforeStateChange',
                        target: this,
                        action: action,
                        currState: this.getState(),
                        nextState: Meta.State.Browse
                    });

                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    this.objectTree().cancel(this.cachedUpdates(), this._getFinalizeCallback(action, cb));
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

                    if (result && (result.result === "OK") && result.newObject) {
                        self.cursor(result.newObject);
                    };

                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };

                try {
                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    this.objectTree().addObject(flds, {}, addObjectCallback);
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

            deleteObject: function (options, cb) {

                var self = this;

                function delObjectCallback(result) {

                    if (DEBUG)
                        console.log("### delObjectCallback: " + JSON.stringify(result));

                    if (result && (result.result === "OK")) {
                        self.cursor(result.newObject);
                    };

                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };

                try {
                    if (!this.objectTree())
                        throw new Error("Dataset::_dataInit: Undefined \"ObjectTree\" reference!");

                    this.objectTree().deleteObject(options, delObjectCallback);
                }
                catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0)
                    else
                        throw err;
                };
            }
        });
        return Dataset;
    }
);
