if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/utils', './baseTreeModel', './metaModel', './metaModelField', './metaDefs', '../predicate/predicate'],
    function (Utils, BaseTreeModel, MetaModel, MetaModelField, Meta, Predicate) {
        var DbTreeModelRoot = BaseTreeModel.extend({

            className: "DbTreeModelRoot",
            classGuid: UCCELLO_CONFIG.classGuids.DbTreeModelRoot,
            metaFields: [
                {
                    fname: "ModelRef", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.MetaModel,
                        res_elem_type: UCCELLO_CONFIG.classGuids.MetaModel
                    }
                },
                {
                    fname: "Root", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.DataRoot,
                        res_elem_type: UCCELLO_CONFIG.classGuids.DataRoot
                    }
                }
            ],

            metaCols: [
                { "cname": "Childs", "ctype": "DbTreeModel" },
                { "cname": "Filter", "ctype": "Predicate" }
            ],

            name: function (value) {
                return this._genericSetter("ResElemName", value);
            },

            modelRef: function (value) {
                return this._genericSetter("ModelRef", value);
            },

            root: function (value) {
                return this._genericSetter("Root", value);
            },

            init: function (cm, params) {

                this._filter = null;

                UccelloClass.super.apply(this, [cm, params]);
                this._isWaitingForData = false;
                this._isRootSwitched = false;

                if (params) {
                    Utils.makeSingleItemCollection.apply(this, ["Filter", "_filter"]);
                }
            },

            getParameter: function (name) {
                var result = null;
                if (this._filter)
                    result = this._filter.getParameter(name);
                return result;
            },

            getParams: function () {
                var result = {};
                if (this._filter)
                    result = this._filter.getParams();
                return result;
            },

            getFieldDefs: function (cb) {
                try {
                    var model_desc = this._getModelData();
                    if (typeof ($data) !== "undefined") {
                        $data.getFieldDefs(model_desc, cb);
                    }
                    else
                        throw new Error("\"Dataman\" reference is not defined!");
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

            edit: function (is_cached_upd, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("DbTreeModelRoot::edit: Dataset is not defined!");

                    var self = this;
                    var edt_obj = (is_cached_upd ? self.root() : self._dataset.getCurrentDataObject());
                    this.loadObject(edt_obj, true, function (result) {
                        if (result.result === "OK") {
                            edt_obj = (is_cached_upd ? self.root() : self._dataset.getCurrentDataObject());
                            edt_obj.edit(cb);
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
                        cb({ result: "ERROR", message: err.message });
                };
            },

            save: function (is_cached_upd, options, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("DbTreeModelRoot::save: Dataset is not defined!");

                    var self = this;
                    var edt_obj = (is_cached_upd ? self.root() : self._dataset.getCurrentDataObject());
                    edt_obj.save(options, cb);
                }
                catch (err) {
                    if (cb)
                        cb({ result: "ERROR", message: err.message });
                };
            },

            cancel: function (is_cached_upd, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("DbTreeModelRoot::cancel: Dataset is not defined!");

                    var self = this;
                    var edt_obj = (is_cached_upd ? self.root() : self._dataset.getCurrentDataObject());
                    edt_obj.cancel(cb);
                }
                catch (err) {
                    if (cb)
                        cb({ result: "ERROR", message: err.message });
                };
            },

            addObject: function (flds, options, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("DbTreeModelRoot::addObject: Dataset is not defined!");

                    if (!this.root())
                        throw new Error("DbTreeModelRoot::addObject: Root is not defined!");

                    this.root().newObject(flds, options, cb);
                }
                catch (err) {
                    if (cb)
                        cb({ result: "ERROR", message: err.message });
                };
            },

            deleteObject: function (options, cb) {
                var result = { result: "OK" };

                try {
                    if (!this._dataset)
                        throw new Error("DbTreeModelRoot::deleteObject: Dataset is not defined!");

                    if (!this._dataset.getCurrentDataObject())
                        throw new Error("DbTreeModelRoot::deleteObject: Current DataObject is not defined!");

                    if (!this.root())
                        throw new Error("DbTreeModelRoot::deleteObject: Root is not defined!");

                    this.root().deleteObject(this._dataset.getCurrentDataObject().getGuid(), options, cb);
                }
                catch (err) {
                    if (cb)
                        cb({ result: "ERROR", message: err.message });
                };
            },

            hasData: function () {
                return this.root() && (!this.isNeedToRefresh()) ? true : false;
            },

            getDataCollection: function () {
                return this.root() ? this.root().getCol("DataElements") : null;
            },

            getState: function () {
                var state = Meta.State.Unknown;
                if (this._dataset) {
                    var curr_obj = this._dataset.getCurrentDataObject();
                    if (curr_obj)
                        state = curr_obj._currState()
                    else {
                        var root = this.root();
                        if (root)
                            state = root._currState();
                    };
                };
                return state;
            },

            isDataSourceModified: function (log) {
                // ѕока так, но с этим надо разбиратьс€ !!!
                //
                return true;
                //
                //
                var result = this._isRootSwitched;
                if (!result) {
                    result = true;
                    var rootObj = this.root();
                    if (rootObj)
                        result = rootObj.isDataModified(log);
                }
                return result;
            },

            canMoveCursor: function (is_cached_updates) {
                var result = is_cached_updates;
                if ((!result) && this._dataset) {
                    var curr_obj = this._dataset.getCurrentDataObject();
                    if (curr_obj) {
                        var curr_state = curr_obj._currState();
                        result = (curr_state === Meta.State.Browse) && (curr_obj._childEdCnt() === 0);
                        if ((!result) && this._masterDataset) {
                            var master_state = this._masterDataset.getState();
                            result = (master_state === Meta.State.Edit) || (master_state === Meta.State.Insert);
                        };
                    }
                    else
                        result = true;
                };
                return result;
            },

            canEdit: function () {
                return this.root() ? this.root().canEdit() : false;
            },

            getFirstCursorVal: function () {
                var res = null;
                var root = this.root();
                if (root) {
                    var col = root.getCol("DataElements");
                    if (col && (col.count() > 0))
                        res = col.get(0).getGuid();
                }
                return res;
            },

            getLastCursorVal: function () {
                var res = null;
                var root = this.root();
                if (root) {
                    var col = root.getCol("DataElements");
                    if (col && (col.count() > 0))
                        res = col.get(col.count() - 1).getGuid();
                }
                return res;
            },

            getPrevCursorVal: function (curr_cursor) {
                var res = null;
                var root = this.root();
                if (root) {
                    var col = root.getCol("DataElements");
                    var col_idx = col.indexOfGuid(curr_cursor);
                    if ((typeof (col_idx) === "number") && (col_idx > 0))
                        res = col.get(--col_idx).getGuid();
                }
                return res;
            },

            getNextCursorVal: function (curr_cursor) {
                var res = null;
                var root = this.root();
                if (root) {
                    var col = root.getCol("DataElements");
                    var col_idx = col.indexOfGuid(curr_cursor);
                    if ((typeof (col_idx) === "number") && (col_idx < (col.count() - 1)))
                        res = col.get(++col_idx).getGuid();
                }
                return res;
            },

            getObjByCursor: function (cursor_value) {
                var res = null;
                var root = this.root();
                if (root) {
                    var col = root.getCol("DataElements");
                    var col_idx = col.indexOfGuid(cursor_value);
                    if (typeof (col_idx) === "number")
                        res = col.get(col_idx);
                }
                return res;
            },

            loadObject: function (singleObject, withSubTree, cb) {

                var result = { result: "OK" };
                var params = { rtype: "data" };

                var self = this;
                function icb(res) {
                    self._isWaitingForData = false;

                    if (!(res && res.guids && (res.guids.length === 1)))
                        result = { result: "ERROR", message: "Data Object \"" + params.path.dataRoot + "\" doesn't longer exist!" }
                    else {

                        function refreshTree(elem, lvl) {
                            if (elem._dataset) {
                                if (lvl > 0) {
                                    var root = null;
                                    if (elem._masterDataset) {
                                        var currObj = elem._masterDataset.getCurrentDataObject();
                                        if (currObj)
                                            root = currObj.getDataRoot(elem.alias());
                                    };
                                    elem.root(root);
                                };
                                elem._dataset.onReloadObject(lvl === 0);
                            }
                            for (var i = 0; i < elem._childsCol.count() ; i++) {
                                var cur_elem = elem._childsCol.get(i);
                                refreshTree(cur_elem, lvl + 1);
                            };
                        };
                        refreshTree(self, 0);
                    };

                    if (cb)
                        cb(result);
                };

                try {
                    if (this._isWaitingForData)
                        throw new Error("DbTreeModelRoot::loadObject: Data Set is waiting for data!");

                    params.expr = { model: this.makeRequest(withSubTree ? Meta.ReqLevel.All : Meta.ReqLevel.AllAndEmptyChilds), is_single: true };
                    if (singleObject.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot)) {
                        // ѕри попытке перечитать DataRoot пока ничего не делаем !!!!
                        if (cb)
                            cb(result);
                    }
                    else {
                        var dataRoot = singleObject.getParent();
                        if (dataRoot) {
                            params.path = {
                                globalRoot: singleObject.getRoot().getGuid(),
                                dataRoot: singleObject.getGuid(),
                                parent: dataRoot.getGuid(),
                                parentColName: singleObject.getColName()
                            };

                            var keyVal = singleObject.get(singleObject._keyField);

                            if (!this._predicate)
                                this._predicate = new Predicate(this.getDB(), {});
                            this._predicate
                                .addConditionWithClear({ field: singleObject._keyField, op: "=", value: keyVal });

                            params.expr.predicate = this.getDB().serialize(this._predicate, true);

                            this._isWaitingForData = true;
                            this._requestData([singleObject.getGuid()], params, icb);
                        }
                        else
                            throw new Error("DbTreeModelRoot::loadData: Undefined \"DataRoot\"!");
                    }
                }
                catch (err) {
                    if (cb)
                        cb({ result: "ERROR", message: err.message });
                };
            },

            loadData: function (isMasterOnly, withSubTree, source) {

                if (this._isWaitingForData) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" receives \"loadData\" request while it's waiting for data.");
                    return;
                };

                var self = this;
                function icb(res) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + self.name() + "\" has received data.");

                    var dataRoot = (res && res.guids && (res.guids.length === 1)) ? self.getDB().getObj(res.guids[0]) : self.root();
                    self.root(dataRoot ? dataRoot : null);
                    if (dataRoot && self._dataset)
                        self._dataset.onDataChanged();
                    self._isWaitingForData = false;
                }

                var dataRoot = this.root();
                var dataRootGuid = this.getSerialized("Root") ? this.getSerialized("Root").guidInstanceRes : undefined;
                var rgp = dataRoot ? dataRoot.getGuid() : (dataRootGuid ? dataRootGuid : null);

                var master = this._masterDataset;
                var needToQuery = true;
                var params = { rtype: "data" };

                // ≈сли (dataRootGuid && isMasterOnly) === true, то это означает, что у нас есть ссылка на инстанс рута данных на сервере
                //   и происходит начальна€ ициализаци€ данных - в этом случае необходимо просто запросить рут данных,
                //   не дела€ запрос к Ѕƒ.
                if ((!(dataRootGuid && isMasterOnly)) || this.isNeedToRefresh()) {
                    if (this.isNeedToRefresh()) {
                        //rgp = null;
                        this.setRefreshedFlag();
                    };
                    params.expr = { model: this.makeRequest(withSubTree ? Meta.ReqLevel.All : Meta.ReqLevel.AllAndEmptyChilds) };
                    if (master) {
                        var currObj = master.getCurrentDataObject();
                        if (currObj) {
                            var alias = this.alias();
                            dataRoot = currObj.getDataRoot(alias);
                            if (dataRoot) {
                                var master_state = this.getParentTreeElem() ? this.getParentTreeElem().getState() : Meta.State.Unknown;
                                if ((master_state === Meta.State.Edit) || (master_state === Meta.State.Insert)) {
                                    this.root(dataRoot);
                                    needToQuery = false;
                                    this._isRootSwitched = true;
                                    if (this._dataset)
                                        this._dataset.onDataChanged();
                                }
                                else {

                                    params.path = {
                                        globalRoot: dataRoot.getRoot().getGuid(),
                                        dataRoot: dataRoot.getGuid(),
                                        parent: dataRoot.getParent().getGuid(),
                                        parentColName: dataRoot.getColName()
                                    };

                                    var keyVal = currObj.get(currObj._keyField);
                                    var parentField = dataRoot.parentField();
                                    if (!parentField)
                                        throw new Error("DbTreeModelRoot::loadData: \"" + alias + "\" Undefined \"ParentField\"!");

                                    if (!this._predicate)
                                        this._predicate = new Predicate(this.getDB(), {});
                                    this._predicate
                                        .addConditionWithClear({ field: parentField, op: "=", value: keyVal });

                                    params.expr.predicate = this.getDB().serialize(this._predicate, true);
                                    rgp = params.path.dataRoot;
                                }

                            }
                            else
                                throw new Error("DbTreeModelRoot::loadData: Undefined \"DataRoot\"!");
                        }
                        else {
                            // –одительский DataSet пустой!
                            this.root(null);
                            needToQuery = false;
                            this._isRootSwitched = true;
                            if (this._dataset)
                                this._dataset.onDataChanged();
                        }
                    };
                }
                else {
                    if (dataRoot) {
                        needToQuery = false;
                        if (this._dataset)
                            this._dataset.onDataChanged();
                    }
                };

                if (needToQuery) {
                    this._isWaitingForData = true;
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" requests data.");
                    if (!rgp)
                        rgp = this.getDB().getController().guid();

                    this._requestData([rgp], params, icb);
                };
            },

            _requestData: function (rootGuids, params, cb) {
                if (this.isMaster())
                    this.getControlMgr().getRoots(rootGuids, params, cb);
                else {
                    params.subDbGuid = this.getControlMgr().getGuid();
                    this.remoteCall('_requestData', [rootGuids, params], cb);
                }
            },

            _onMasterMoveCursor: function () {
                this.loadData(false, false, "DbTreeModelRoot::moveCursor");
            },

            makeRequest: function (type) {
                var result = this._getReqElem();

                if ((type === Meta.ReqLevel.All) || (type === Meta.ReqLevel.AllAndEmptyChilds)) {
                    function make_all(curr_res, elem, is_childs_empty) {
                        for (var i = 0; i < elem._childsCol.count() ; i++) {
                            var cur_elem = elem._childsCol.get(i);
                            var req_elem = cur_elem._getReqElem(is_childs_empty);
                            if (is_childs_empty)
                                req_elem.isStub = true;
                            make_all(req_elem, cur_elem, is_childs_empty);
                            curr_res.childs.push({ dataObject: req_elem });
                        };
                    };
                    make_all(result, this, type === Meta.ReqLevel.AllAndEmptyChilds);
                }
                else {
                    if (type !== Meta.ReqLevel.CurrentOnly) {
                        var isStub = type === Meta.ReqLevel.CurrentAndEmptyChilds;
                        for (var i = 0; i < this._childsCol.count() ; i++) {
                            var req_elem = this._childsCol.get(i)._getReqElem(isStub);
                            if (isStub)
                                req_elem.isStub = isStub;
                            delete req_elem.childs;
                            result.childs.push({ dataObject: req_elem });
                        };
                    }
                    else
                        delete result.childs;
                };
                return result;
            },

            getFilter: function () {
                var result = this._filter;
                if (!result)
                    result = new Predicate(this.getDB(), { parent: this, colName: "Filter" });
                return result;
            },

            clearFilter: function () {
                if (this._filter) {
                    this.getCol("Filter")._del(this._filter);
                };
            },

            deleteDataSource: function (ds) {
                var _ds = null;
                if (typeof ds === "string")
                    _ds = this.getDataSource(ds);
                else
                    if (ds instanceof this.getRoot().getDbDSConstructor())
                        _ds = ds
                    else
                        throw new Error("DbTreeModelRoot::deleteDataSource: Invalid argument type.");
                if (_ds)
                    this._childsCol._del(_ds);
            },

            addDataSource: function (ds_def) {
                if (!ds_def)
                    throw new Error("DbTreeModelRoot::addDataSource: Empty argument!");

                var fields = {};
                if (typeof (ds_def.name) === "string")
                    fields.ResElemName = ds_def.name;
                else
                    fields.ResElemName = this.getRoot().getNextElemName();

                if (ds_def.model instanceof MetaModel) {
                    fields.ModelRef = {
                        guidInstanceRes: ds_def.model.getGuid(),
                        guidInstanceElem: ds_def.model.getGuid(),
                        resName: ds_def.model.name(),
                    };
                    fields.Alias = ds_def.model.name();
                }
                else
                    if (ds_def.model) {
                        fields.ModelRef = ds_def.model;
                        if (ds_def.model.resName)
                            fields.Alias = ds_def.model.resName;
                        else
                            throw new Error("DbTreeModelRoot::addDataSource: Model name is empty!");
                    }
                    else
                        throw new Error("DbTreeModelRoot::addDataSource: Model argument is empty!");

                if (typeof (ds_def.alias) === "string")
                    fields.Alias = ds_def.alias;
                else
                    if (!fields.Alias)
                        throw new Error("DbTreeModelRoot::addDataSource: Alias argument is empty!");

                if (ds_def.field instanceof MetaModelField)
                    fields.FieldRef = {
                        guidInstanceRes: ds_def.field.getRoot().getGuid(),
                        guidInstanceElem: ds_def.field.getGuid(),
                        resName: ds_def.field.getRoot().name(),
                        elemName: ds_def.field.name()
                    }
                else
                    if (ds_def.field) {
                        if (ds_def.field.elemName)
                            fields.FieldRef = ds_def.field;
                        else
                            throw new Error("DbTreeModelRoot::addDataSource: Field name is undefined!");
                    };

                var params = {
                    ini: {
                        fields: fields
                    },
                    parent: this,
                    colName: "Childs"
                };
                var elem_constr = this.getRoot().getDbDSConstructor();
                new elem_constr(this.getDB(), params);
                return this;
            },

            _getModelData: function (res) {
                var result = res || {};
                var name, guid;
                var model = this.modelRef();
                if (model) {
                    name = model.name();
                    guid = model.dataObjectGuid();
                }
                else {
                    var model_ser = this.getSerialized("ModelRef");
                    if (model_ser.resName)
                        name = model_ser.resName;
                };
                if (!(name || guid))
                    throw new Error("DbTreeModelRoot::makeRequest: Invalid model reference in \"" +
                        this.getRoot().resName() + "." + this.resElemName() + "\".");
                if (name)
                    result.name = name;
                if (guid)
                    result.guid = guid;

                return result;
            },

            _getReqElem: function (is_stub) {
                var result = {};
                if (this._filter && (!is_stub))
                    result.filter = this.getDB().serialize(this._filter, true);
                if (this._childsCol.count() > 0)
                    result.childs = [];
                this._getModelData(result);
                return result;
            },

        });

        return DbTreeModelRoot;
    }
);