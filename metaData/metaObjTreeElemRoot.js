if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../resman/dataTypes/resElem', './metaModel', './metaModelField', './metaDefs'],
    function (ResElem, MetaModel, MetaModelField, Meta) {
        var MetaObjTreeElemRoot = ResElem.extend({

            className: "MetaObjTreeElemRoot",
            classGuid: UCCELLO_CONFIG.classGuids.MetaObjTreeElemRoot,
            metaFields: [
                {
                    fname: "ModelRef", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.MetaModel,
                        res_elem_type: UCCELLO_CONFIG.classGuids.MetaModel
                    }
                },
            ],

            metaCols: [
                { "cname": "Childs", "ctype": "MetaObjTreeElem" }
            ],

            name: function (value) {
                return this._genericSetter("ResElemName", value);
            },

            modelRef: function (value) {
                return this._genericSetter("ModelRef", value);
            },

            alias: function (value) {
                return null;
            },

            init: function (cm, params) {

                UccelloClass.super.apply(this, [cm, params]);
                this._childs = {};

                if (params) {
                    this._childsCol = this.getCol("Childs");
                    this._childsCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddElem
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteElem
                    });
                };
            },

            getRootDS: function () {
                return this.getRoot().getRootDS();
            },

            getDataSource: function (ds_name) {
                return this._childs[ds_name] ? this._childs[ds_name].treeElem : null;
            },

            makeRequest: function (type) {
                var result = this._getReqElem();

                if ((type === Meta.ReqLevel.All) || (type === Meta.ReqLevel.AllAndEmptyChilds)) {
                    function make_all(curr_res, elem, is_childs_empty) {
                        for (var i = 0; i < elem._childsCol.count() ; i++) {
                            var cur_elem = elem._childsCol.get(i);
                            var req_elem = cur_elem._getReqElem();
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
                            var req_elem = this._childsCol.get(i)._getReqElem();
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

            deleteDataSource: function (ds) {
                var _ds = null;
                if (typeof ds === "string")
                    _ds = this.getDataSource(ds);
                else
                    if (ds instanceof this.getRoot().getDSConstructor())
                        _ds = ds
                    else
                        throw new Error("MetaObjTreeElemRoot::deleteDataSource: Invalid argument type.");
                if (_ds)
                    this._childsCol._del(_ds);
            },

            addDataSource: function (ds_def) {
                if (!ds_def)
                    throw new Error("MetaObjTreeElemRoot::addDataSource: Empty argument!");

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
                        if(ds_def.model.resName)
                            fields.Alias = ds_def.model.resName;
                        else
                            throw new Error("MetaObjTreeElemRoot::addDataSource: Model name is empty!");
                    }
                    else
                        throw new Error("MetaObjTreeElemRoot::addDataSource: Model argument is empty!");

                if (typeof (ds_def.alias) === "string")
                    fields.Alias = ds_def.alias;
                else
                    if (!fields.Alias)
                        throw new Error("MetaObjTreeElemRoot::addDataSource: Alias argument is empty!");

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
                            throw new Error("MetaObjTree::addDataSource: Field name is undefined!");
                    };

                var params = {
                    ini: {
                        fields: fields
                    },
                    parent: this,
                    colName: "Childs"
                };
                var elem_constr = this.getRoot().getDSConstructor();
                new elem_constr(this.getDB(), params);
                return this;
            },

            _getReqElem: function () {
                var result = {};
                if (this._childsCol.count() > 0)
                    result.childs = [];
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
                    throw new Error("MetaObjTreeElemRoot::makeRequest: Invalid model reference in \"" +
                        this.getRoot().resName() + "." + this.resElemName() + "\".");
                if (name)
                    result.name = name;
                if (guid)
                    result.guid = guid;

                return result;
            },

            _onAddElem: function (args) {
                var treeElem = args.obj;
                var col = args.target;
                var alias = treeElem.alias();
                if (this._childs[alias] !== undefined) {
                    col._del(treeElem);
                    throw new Error("\"" + alias + "\" is already defined.");
                }
                var handler = {
                    type: 'mod%Alias',
                    subscriber: this,
                    callback: this._getOnAliasChangeProc(treeElem)
                };
                this._childs[alias] = {
                    treeElem: treeElem,
                    handler: handler
                };
                treeElem.event.on(handler);
            },

            _onDeleteElem: function (args) {
                var treeElem = args.obj;
                var obj = this._childs[treeElem.alias()];
                if (obj) {
                    delete this._childs[treeElem.alias()];
                    obj.treeElem.event.on(obj.handler);
                };
            },

            _getOnAliasChangeProc: function (treeElem) {
                var self = this;
                var oldAlias = treeElem.alias();

                return function (args) {
                    var alias = treeElem.alias();

                    if (alias !== oldAlias) {

                        if (self._childs[alias] !== undefined) {
                            treeElem.set("alias", oldAlias);
                            throw new Error("Can't change alias from \"" +
                                oldAlias + "\" to \"" + alias + "\". \"" + alias + "\" is already defined.");
                        };

                        var obj = self._childs[oldAlias];
                        delete self._childs[oldAlias];
                        self._childs[alias] = obj;

                        oldAlias = alias;
                    };
                };
            }
        });

        return MetaObjTreeElemRoot;
    }
);