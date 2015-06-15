if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaModel'],
    function (UObject, MetaModel) {
        var MetaDataMgr = UObject.extend({

            className: "MetaDataMgr",
            classGuid: UCCELLO_CONFIG.classGuids.MetaDataMgr,
            metaCols: [{ "cname": "Models", "ctype": "MetaModel" }],
            metaFields: [],

            init: function (cm, params) {
                this._modelsByName = {};
                this._modelsByGuid = {};

                UccelloClass.super.apply(this, [cm, params]);

                if (params) {
                    this._modelsCol = this.getCol("Models");
                    this._modelsCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddModel
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteModel
                    });
                };
            },

            addModel: function (name, guid) {
                if (name) {
                    var params = {
                        ini: {
                            fields: {
                                Name: name,
                                DataObjectGuid: guid ? guid : this.getDB().getController().guid()
                            }
                        },
                        parent: this,
                        colName: "Models"
                    };
                    return new MetaModel(this.getDB(), params);

                } else
                    throw new Error("Model name is undefined.");
            },

            deleteModel: function (model) {
                if (typeof model === "string") {
                    var _model = this.getModel(model);
                    if (_model)
                        this._modelsCol._del(_model);
                } else
                    if (model instanceof MetaModel) {
                        this._modelsCol._del(model);
                    }else
                        throw new Error("MetaDataMgr::deleteModel: Invalid argument type.");
            },

            getModel: function (name) {
                return this._modelsByName[name];
            },

            getModelByGuid: function (guid) {
                return this._modelsByGuid[guid];
            },

            _onAddModel: function (args) {
                var model = args.obj;
                var name = model.get("Name");
                var guid = model.get("DataObjectGuid");
                if (this._modelsByName[name] !== undefined) {
                    this._modelsCol._del(model);
                    throw new Error("Model \"" + name + "\" is already defined.");
                };
                if (this._modelsByGuid[guid] !== undefined) {
                    this._modelsCol._del(model);
                    throw new Error("Model \"" + guid + "\" is already defined.");
                };
                this._modelsByName[name] = model;
                this._modelsByGuid[guid] = model;
            },

            _onDeleteModel: function (args) {
                var model = args.obj;
                var name = model.get("Name");
                var guid = model.get("DataObjectGuid");
                delete this._modelsByName[name];
                delete this._modelsByGuid[guid];
            }
        });
        return MetaDataMgr;
    }
);