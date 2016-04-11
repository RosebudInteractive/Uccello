if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./baseTreeModel', './metaDefs'],
    function (BaseTreeModel, Meta) {
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

            edit: function (is_cached_upd, cb) {
                var result = { result: "OK" };

                try {
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                };
                if (cb)
                    cb(result);
            },

            save: function (is_cached_upd, options, cb) {
                throw new Error("BaseTreeModel: \"save\" wasn't implemented in descendant.");
            },

            cancel: function (is_cached_upd, cb) {
                throw new Error("BaseTreeModel: \"cancel\" wasn't implemented in descendant.");
            },

            addObject: function (flds, options, cb) {
                var result = { result: "OK" };

                try {
                    if (this._is_root)
                        throw new Error("MemTreeModelRoot::addObject: Can't insert into Root object dataset!");

                    var col = this.getDataCollection();
                    if (!col)
                        throw new Error("MemTreeModelRoot::addObject: Parent collection doesn't exist!");

                    var objType = col.getColType();
                    var params = { parent: col.getParent(), colName: col.getName(), ini: flds || {} };
                    var objGuid = objType.getGuid();
                    var cm = this.getControlMgr();
                    var constrHolder = cm.getConstructHolder() ? cm.getConstructHolder() :
                        (cm.getContext() ? cm.getContext().getConstructorHolder() : null);
                    if (!constrHolder)
                        throw new Error("MemTreeModelRoot::addObject: Undefined ConstructHolder !");
                    var constr = constrHolder.getComponent(objGuid).constr;
                    if (typeof (constr) !== "function")
                        throw new Error("MemTreeModelRoot::addObject: Undefined object constructor: \"" + objGuid + "\" !");

                    var obj = new constr(cm, params);
                    result.newObject = obj.getGuid();
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                };
                if (cb)
                    cb(result);
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

                    var idx = col._del(obj);
                    if (typeof (idx) === "number") {
                        var newIdx = col.count() > idx ? idx : (col.count() - 1);
                        if (newIdx >= 0) {
                            var newObj = col.get(newIdx);
                            if (newObj._keyField)
                                result.newObject = newObj.getGuid();
                        }
                        else
                            result.newObject = null;
                    }
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                };
                if (cb)
                    cb(result);
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
                return this.getRootTreeElem()._currState();
            },

            isDataSourceModified: function (log) {
                return true;
            },

            canMoveCursor: function (is_cached_updates) {
                return true;
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
                    var col_idx = col.indexOfGuid(curr_cursor);
                    if ((typeof (col_idx) === "number") && (col_idx > 0))
                        obj = col.get(--col_idx);
                };
                return obj ? obj.getGuid() : null;
            },

            getNextCursorVal: function (curr_cursor) {
                var obj = null;
                if (!this._is_root) {
                    var col = this.getDataCollection();
                    var col_idx = col.indexOfGuid(curr_cursor);
                    if ((typeof (col_idx) === "number") && (col_idx < (col.count() - 1)))
                        obj = col.get(++col_idx);
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
                    var col_idx = col.indexOfGuid(cursor_value);
                    if (typeof (col_idx) === "number")
                        obj = col.get(col_idx);
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
                if (this._is_root) {
                    if (!this.rootObj())
                        this._requestObject();
                }
                else {
                    this.getDataCollection();
                };
                if (this._dataset)
                    this._dataset.onDataChanged();
            },

            init: function (cm, params) {
                this._is_root = false;
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