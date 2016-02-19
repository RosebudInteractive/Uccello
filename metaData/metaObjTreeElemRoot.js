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

            deleteDataSource: function (ds) {
                var _ds = null;
                if (typeof ds === "string")
                    _ds = this.getDataSource(ds);
                else
                    if (ds instanceof this.getRoot().getDSConstructor())
                        _ds = ds
                    else
                        throw new Error("MetaObjTree::deleteDataSource: Invalid argument type.");
                if (_ds)
                    this._childsCol._del(_ds);
            },

            addDataSource: function (ds_def) {
                if (!ds_def)
                    throw new Error("MetaObjTree::addDataSource: Empty argument!");

                var fields = {};
                if (typeof (ds_def.name) === "string")
                    fields.ResElemName = ds_def.name;
                else
                    fields.ResElemName = this.getRoot().getNextElemName();

                if (ds_def.model instanceof MetaModel) {
                    fields.ModelRef = {
                        guidInstanceRes: ds_def.model.getGuid(),
                        guidInstanceElem: ds_def.model.getGuid(),
                    };
                    fields.Alias = ds_def.model.name();
                }
                else
                    if (ds_def.model) {
                        fields.ModelRef = ds_def.model;
                        if(ds_def.model.resName)
                            fields.Alias = ds_def.model.resName;
                    }
                    else
                        throw new Error("MetaObjTree::addDataSource: Model argument is empty!");

                if (typeof (ds_def.alias) === "string")
                    fields.Alias = ds_def.alias;
                else
                    if (!fields.Alias)
                        throw new Error("MetaObjTree::addDataSource: Alias argument is empty!");

                if (ds_def.field instanceof MetaModelField)
                    fields.FieldRef = {
                        guidInstanceRes: ds_def.field.getRoot().getGuid(),
                        guidInstanceElem: ds_def.field.getGuid(),
                    }
                else
                    if (ds_def.field) {
                        fields.FieldRef = ds_def.field;
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