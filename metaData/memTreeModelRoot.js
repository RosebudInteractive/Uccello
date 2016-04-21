if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./baseTreeModel', './metaDefs', '../memDB/memVirtualLog'],
    function (BaseTreeModel, Meta, MemVirtualLog) {
        var MemTreeModelRoot = BaseTreeModel.extend({

            className: "MemTreeModelRoot",
            classGuid: UCCELLO_CONFIG.classGuids.MemTreeModelRoot,
            metaFields: [
                { fname: "_EditSet", ftype: "string" },
                { fname: "_ChildEdCnt", ftype: "int" },
                { fname: "_CurrState", ftype: "int" },
                { fname: "_PrevState", ftype: "int" },
                { fname: "RootClassGuid", ftype: "guid" },
                {
                    fname: "RootObj", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.UObject,
                        res_elem_type: UCCELLO_CONFIG.classGuids.UObject
                    }
                }
            ],

            metaCols: [
                { "cname": "Childs", "ctype": "BaseTreeModel" }
            ],

            _editSet: function (value) {
                return this._genericSetter("_EditSet", value);
            },

            _childEdCnt: function (value) {
                return this._genericSetter("_ChildEdCnt", value);
            },

            _currState: function (value) {
                return this._genericSetter("_CurrState", value);
            },

            _prevState: function (value) {
                return this._genericSetter("_PrevState", value);
            },

            rootObj: function (value) {
                return this._genericSetter("RootObj", value);
            },

            rootClassGuid: function (value) {
                return this._genericSetter("RootClassGuid", value);
            },

            _childIncEditCounter: function (n) {
                for (var parent = this.getParent() ; parent; parent = parent.getParent()) {
                    if (typeof (parent._childEdCnt) === "function")
                        parent._childEdCnt(parent._childEdCnt() + n);
                };
            },

            _childEnterEdit: function () {
                var lvl = typeof (n) === "number" ? n : 1;
                this._childIncEditCounter(lvl);
            },

            _childLeaveEdit: function (n) {
                var lvl = typeof (n) === "number" ? (0 - n) : -1;
                this._childIncEditCounter(lvl);
            },

            edit: function (is_cached_upd, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("MemTreeModelRoot::edit: Dataset is not defined!");

                    var obj = this._dataset.getCurrentDataObject();
                    if (!obj)
                        throw new Error("MemTreeModelRoot::edit: Current DataObject is not defined!");

                    if (this._currState() !== Meta.State.Browse)
                        throw new Error("Can't set \"Edit\" state, because current state is \"" +
                            Meta.Meta.stateToString(this._currState()) + "\".");

                    if (this._childEdCnt() > 0)
                        throw new Error("Can't set \"Edit\" state, because some of childs are in  \"Edit\" state.");

                    this.getDB()._iterateChilds(this, true, function (tree_elem, lvl) {
                        tree_elem._currState(Meta.State.Edit);
                        tree_elem._editSet("");
                    });
                    this._editSet("current");
                    this._childEnterEdit();
                    // Включаем лог изменений на сервере !
                    this._createLog(obj.getGuid(), cb);

                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };
            },

            _createLog: function (obj_guid, cb) {
                if (this.isMaster()) {
                    var result = { result: "OK" };
                    try {
                        var obj = this.getDB().getObj(obj_guid);
                        if (!obj)
                            throw new Error("MemTreeModelRoot::_edit: DataObject \"" + obj_guid + "\" doesn't exist!");
                        this._editVLog = this.getDB().getDbLog().createVirtualLog(MemVirtualLog.SubscriptionMode.CurrentAndAllChilds, obj);
                    }
                    catch (err) {
                        result = { result: "ERROR", message: err.message };
                    };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                }
                else {
                    this.remoteCall('_createLog', [obj_guid], cb);
                };
            },

            save: function (is_cached_upd, options, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("MemTreeModelRoot::save: Dataset is not defined!");

                    var obj = this._dataset.getCurrentDataObject();
                    if (!obj)
                        throw new Error("MemTreeModelRoot::save: Current DataObject is not defined!");

                    if (this._currState() !== Meta.State.Edit)
                        throw new Error("Can't save object, because current state is \"" +
                            Meta.Meta.stateToString(this._currState()) + "\".");

                    if (this._editSet().length !== 0) {

                        this.getDB()._iterateChilds(this, true, function (tree_elem, lvl) {
                            tree_elem._currState(Meta.State.Browse);
                            tree_elem._editSet("");
                        });
                        this._childLeaveEdit();
                        // Удалить лог изменений
                        this._destroyLog(false, cb);
                    }
                    else
                        if (cb)
                            setTimeout(function () {
                                cb(result);
                            }, 0);
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };
            },

            cancel: function (is_cached_upd, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("MemTreeModelRoot::save: Dataset is not defined!");

                    var obj = this._dataset.getCurrentDataObject();
                    if (!obj)
                        throw new Error("MemTreeModelRoot::save: Current DataObject is not defined!");

                    if (this._currState() !== Meta.State.Edit)
                        throw new Error("Can't cancel edit, because current state is \"" +
                            Meta.Meta.stateToString(this._currState()) + "\".");

                    if (this._editSet().length !== 0) {

                        this.getDB()._iterateChilds(this, true, function (tree_elem, lvl) {
                            tree_elem._currState(Meta.State.Browse);
                            tree_elem._editSet("");
                        });

                        this._childLeaveEdit();
                        // Удалить лог с откатом изменений
                        this._destroyLog(true, cb);
                    }
                    else
                        throw new Error("Can't cancel edit, because parent object is in \"Edit\" state.");

                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };
            },

            _destroyLog: function (with_rollback, cb) {
                if (this.isMaster()) {
                    var result = { result: "OK" };
                    try {
                        if (this._editVLog && with_rollback)
                            result = this._editVLog.rollback();

                        if (this._editVLog) {
                            this.getDB().getDbLog().destroyVirtualLog(this._editVLog);
                            this._editVLog = null;
                        }
                    }
                    catch (err) {
                        result = { result: "ERROR", message: err.message };
                    };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                }
                else {
                    this.remoteCall('_destroyLog', [with_rollback], cb);
                };
            },

            addObject: function (flds, options, cb) {
                var result = { result: "OK" };

                try {
                    if (this._is_root)
                        throw new Error("MemTreeModelRoot::addObject: Can't insert into Root object dataset!");

                    var col = this.getDataCollection();
                    if (!col)
                        throw new Error("MemTreeModelRoot::addObject: Parent collection doesn't exist!");

                    this._addObject(flds, col.getParent().getGuid(), col.getName(), cb);
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };
            },

            _addObject: function (flds, parent_guid, col_name, cb) {
                if (this.isMaster()) {
                    var result = { result: "OK" };
                    try {
                        var parent = this.getDB().getObj(parent_guid);
                        if (!parent)
                            throw new Error("MemTreeModelRoot::_addObject: Parent DataObject \"" + parent_guid + "\" doesn't exist!");

                        var col = parent.getCol(col_name);
                        if (!col)
                            throw new Error("MemTreeModelRoot::_addObject: Parent collection \"" + col_name + "\" doesn't exist!");

                        var objType = col.getColType();
                        var params = { parent: parent, colName: col_name, ini: flds || {} };
                        var objGuid = objType.getGuid();
                        var cm = this.getControlMgr();
                        var constrHolder = cm.getConstructHolder() ? cm.getConstructHolder() :
                            (cm.getContext() ? cm.getContext().getConstructorHolder() : null);
                        if (!constrHolder)
                            throw new Error("MemTreeModelRoot::_addObject: Undefined ConstructHolder !");
                        var constr = constrHolder.getComponent(objGuid).constr;
                        if (typeof (constr) !== "function")
                            throw new Error("MemTreeModelRoot::_addObject: Undefined object constructor: \"" + objGuid + "\" !");

                        var obj = new constr(cm, params);
                        result.newObject = obj.getGuid();
                    }
                    catch (err) {
                        result = { result: "ERROR", message: err.message };
                    };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                }
                else {
                    this.remoteCall('_addObject', [flds, parent_guid, col_name], cb);
                };
            },

            deleteObject: function (options, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("MemTreeModelRoot::deleteObject: Dataset is not defined!");

                    var obj = this._dataset.getCurrentDataObject();
                    if (!obj)
                        throw new Error("MemTreeModelRoot::deleteObject: Current DataObject is not defined!");

                    if (this._is_root)
                        throw new Error("MemTreeModelRoot::deleteObject: Can't delete Root object!");

                    var col = this.getDataCollection();
                    if (!col)
                        throw new Error("MemTreeModelRoot::deleteObject: Parent collection doesn't exist!");

                    this._deleteObject(obj.getGuid(), cb);
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                };
            },

            _deleteObject: function (obj_guid, cb) {
                if (this.isMaster()) {
                    var result = { result: "OK" };
                    try {
                        var obj = this.getDB().getObj(obj_guid);
                        if (!obj)
                            throw new Error("MemTreeModelRoot::_addObject: Parent DataObject \"" + obj_guid + "\" doesn't exist!");

                        var parent = obj.getParent();
                        if (!parent)
                            throw new Error("MemTreeModelRoot::_addObject: Parent of DataObject \"" + obj_guid + "\" doesn't exist!");

                        var col = obj.getParentCol();
                        if (!col)
                            throw new Error("MemTreeModelRoot::_addObject: Parent collection doesn't exist!");

                        var idx = col._del(obj);
                        if (typeof (idx) === "number") {
                            var newIdx = col.count() > idx ? idx : (col.count() - 1);
                            if (newIdx >= 0) {
                                var newObj = col.get(newIdx);
                                if (newObj)
                                    result.newObject = newObj.getGuid();
                            }
                            else
                                result.newObject = null;
                        };
                    }
                    catch (err) {
                        result = { result: "ERROR", message: err.message };
                    };
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);
                }
                else {
                    this.remoteCall('_deleteObject', [obj_guid], cb);
                };
            },

            hasData: function () {
                var result = this.getRootTreeElem().rootObj();
                return result;
            },

            getDataCollection: function () {
                var result = null;
                if (!this._is_root) {
                    var master = this._masterDataset;
                    if (master) {
                        var currObj = master.getCurrentDataObject();
                        if (currObj)
                            result = currObj.getCol(this.parentCollection());
                    };
                };
                return result;
            },

            getState: function () {
                return this._currState();
            },

            isDataSourceModified: function (log) {
                return true;
            },

            canMoveCursor: function (is_cached_updates) {
                var result = false;
                var curr_state = this._currState();
                result = (curr_state === Meta.State.Browse) && (this._childEdCnt() === 0);
                if ((!result) && this.getParentTreeElem()) {
                    var master_state = this.getParentTreeElem().getState();
                    result = (master_state === Meta.State.Edit);
                };
                return result;
            },

            getFirstCursorVal: function () {
                var obj = null;
                if (this._is_root) {
                    obj = this.rootObj();
                }
                else {
                    var col = this.getDataCollection();
                    if (col && (col.count() > 0))
                        obj = col.get(0);
                };
                return obj ? obj.getGuid() : null;
            },

            getLastCursorVal: function () {
                var obj = null;
                if (this._is_root) {
                    obj = this.rootObj();
                }
                else {
                    var col = this.getDataCollection();
                    if (col && (col.count() > 0))
                        obj = col.get(col.count() - 1);
                };
                return obj ? obj.getGuid() : null;
            },

            getPrevCursorVal: function (curr_cursor) {
                var obj = null;
                if (!this._is_root) {
                    var col = this.getDataCollection();
                    if (col) {
                        var col_idx = col.indexOfGuid(curr_cursor);
                        if ((typeof (col_idx) === "number") && (col_idx > 0))
                            obj = col.get(--col_idx);
                    };
                };
                return obj ? obj.getGuid() : null;
            },

            getNextCursorVal: function (curr_cursor) {
                var obj = null;
                if (!this._is_root) {
                    var col = this.getDataCollection();
                    if (col) {
                        var col_idx = col.indexOfGuid(curr_cursor);
                        if ((typeof (col_idx) === "number") && (col_idx < (col.count() - 1)))
                            obj = col.get(++col_idx);
                    };
                };
                return obj ? obj.getGuid() : null;
            },

            getObjByCursor: function (cursor_value) {
                var obj = null;
                if (this._is_root) {
                    obj = this.rootObj();
                }
                else {
                    var col = this.getDataCollection();
                    if (col) {
                        var col_idx = col.indexOfGuid(cursor_value);
                        if (typeof (col_idx) === "number")
                            obj = col.get(col_idx);
                    };
                };
                return obj;
            },

            loadObject: function (singleObject, withSubTree, cb) {
                if (this._is_root) {
                    this._requestObject();
                };
                if (this._dataset)
                    this._dataset.onDataChanged();
            },

            loadData: function (isMasterOnly, withSubTree, source) {

                if (this._isWaitingForData) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" receives \"loadData\" request while it's waiting for data.");
                    return;
                };

                var self = this;

                function local_cb(res) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + self.name() + "\" has received data.");

                    var dataRoot = self.getDB().getObj(res.guids[0]);
                    self.rootObj(dataRoot ? dataRoot : null);
                    if (dataRoot && self._dataset)
                        self._dataset.onDataChanged();
                    self._isWaitingForData = false;
                };

                if (this._is_root) {

                    var dataRoot = this.rootObj();
                    var dataRootGuid = this.getSerialized("RootObj") ? this.getSerialized("RootObj").guidInstanceRes : undefined;
                    var rgp = dataRoot ? dataRoot.getGuid() : (dataRootGuid ? dataRootGuid : this.getDB().getController().guid());

                    var needToQuery = true;
                    var params = { expr: { adapter: "requestData" }, rtype: "data" };

                    // Если (dataRootGuid && isMasterOnly) === true, то это означает, что у нас есть ссылка на инстанс рута данных на сервере
                    //   и происходит начальная ициализация данных - в этом случае необходимо просто запросить рут данных,
                    //   не делая запрос к БД.
                    if (!(dataRootGuid && isMasterOnly)) {
                    };

                    self._isWaitingForData = false;
                    this._requestData([rgp], params, local_cb);
                }
                else {
                    this.getDataCollection();
                    if (this._dataset)
                        this._dataset.onDataChanged();
                };
            },

            _requestData: function (rootGuid, params, cb) {
                if (this.isMaster())
                    this.getControlMgr().getRoots(rootGuid, params, cb);
                else {
                    params.subDbGuid = this.getControlMgr().getGuid();
                    this.remoteCall('_requestData', [rootGuid, params], cb);
                }
            },

            init: function (cm, params) {
                this._is_root = false;
                this._editVLog = null;
                this._isWaitingForData = false;

                UccelloClass.super.apply(this, [cm, params]);

                if (params) {
                    if (!this._editSet())
                        this._editSet("");
                    if (!this._childEdCnt())
                        this._childEdCnt(0);
                    if (!this._currState())
                        this._currState(Meta.State.Browse);
                    if (!this._prevState())
                        this._prevState(Meta.State.Browse);
                    this._is_root = this.isInstanceOf(UCCELLO_CONFIG.classGuids.MemTreeModelRoot, true);
                };
            },

            deleteDataSource: function (ds) {
                var _ds = null;
                if (typeof ds === "string")
                    _ds = this.getDataSource(ds);
                else
                    if (ds instanceof this.getRoot().getMemDSConstructor())
                        _ds = ds
                    else
                        throw new Error("MemTreeModelRoot::deleteDataSource: Invalid argument type.");
                if (_ds)
                    this._childsCol._del(_ds);
            },

            addDataSource: function (collection_name, alias, res_elem_name) {
                if (typeof collection_name !== "string")
                    throw new Error("MemTreeModelRoot::addDataSource: Collection name arg is empty!");

                var fields = { ParentCollection: collection_name };

                if (typeof (alias) === "string")
                    fields.Alias = alias;
                else
                    fields.Alias = collection_name;

                if (typeof (res_elem_name) === "string")
                    fields.ResElemName = res_elem_name;
                else
                    fields.ResElemName = this.getRoot().getNextElemName();

                var params = {
                    ini: {
                        fields: fields
                    },
                    parent: this,
                    colName: "Childs"
                };
                var elem_constr = this.getRoot().getMemDSConstructor();
                new elem_constr(this.getDB(), params);
                return this;
            },

            _onMasterMoveCursor: function () {
                this.loadData(false, false, "DbTreeModelRoot::moveCursor");
            },

            _requestObject: function () {
                obj = this.getDB().getContext()
                    .getConstructorHolder()
                    .getComponent(UCCELLO_CONFIG.classGuids.MemCompanyTest).constr
                    .testData;

                var root = this.getDB().deserialize(obj, {},
                    this.getDB().getDefaultCompCallback());
                this.rootObj(root);
            },

        });

        return MemTreeModelRoot;
    }
);