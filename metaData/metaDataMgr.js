if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaModel', '../dataman/dataobject', '../dataman/dataRoot'],
    function (UObject, MetaModel, DataObject, DataRoot) {

        var REMOTE_RESULT = "XXX";

        var typeProviderInterfaceGUID = "90122ac9-2d4a-493a-b6ac-8f5fe3c46590";

        var typeProviderInterface = {

            className: "TypeProviderInterf",
            classGuid: typeProviderInterfaceGUID,

            getConstructors: "function"
        }

        var MetaDataMgr = UObject.extend({

            className: "MetaDataMgr",
            classGuid: UCCELLO_CONFIG.classGuids.MetaDataMgr,
            metaCols: [{ "cname": "Models", "ctype": "MetaModel" }],
            metaFields: [],

            init: function (cm, params) {
                this._modelsByName = {};
                this._modelsByGuid = {};

                this._constrByName = {};
                this._router = null;

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

            router: function (aRouter) {
                if (aRouter) {
                    this._router = aRouter;
                    var self = this;
                    this._router.add('typeProviderInterface', function (data, done) {
                        typeProviderInterface.classGuid = self.getGuid();
                        done({ intf: typeProviderInterface });
                    });
                };
                return this._router;
            },


            getInterface: function () {
                typeProviderInterface.classGuid = this.getGuid();
                return typeProviderInterface;
            },

            createObjByName: function (name, params) {
                var obj = null;
                var model = this._modelsByName[name];
                if (model)
                    obj = this._createObj(model, params, name);
                return obj;
            },

            createObjByGuid: function (guid, params) {
                var obj = null;
                var model = this._modelsByGuid[guid];
                if (model)
                    obj = this._createObj(model, params, model.get("Name"));
                return obj;
            },

            getObjConstrByName: function (name) {
                var obj = null;
                var model = this._modelsByName[name];
                if (model)
                    obj = this._getObjConstr(model);
                return obj;
            },

            getObjConstrByGuid: function (guid) {
                var obj = null;
                var model = this._modelsByGuid[guid];
                if (model)
                    obj = this._getObjConstr(model);
                return obj;
            },

            getConstructors: function (guids, callback) {
                var constrArr = [];

                for (var i = 0; i < guids.length; i++) {
                    var code = this.getObjConstrByGuid(guids[i]);
                    if (code)
                        constrArr.push({ guid: guids[i], code: code });
                };

                if (callback)
                    setTimeout(function () {
                        callback(constrArr);
                    }, 0);

                return callback ? REMOTE_RESULT : constrArr;
            },

            _createObj: function (model, params, name) {
                var obj = null;
                if (model) {
                    var constr = null;
                    if (!this._constrByName[name])
                        constr = this._buildConstr(model);
                    if (constr) {
                        obj = new constr(this.getDB(), params);
                    };
                };
                return obj;
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

            _genGetterName: function (fname) {
                var res = fname;
                if (fname.length > 0) {
                    res = fname[0].toLowerCase() + fname.substring(1);
                };
                return res;
            },

            _getObjConstr: function (model) {

                var header =
                 "return Parent.extend({\n";

                var footer = ",\n\n" +
                    "\t\tinit: function(cm,params){\n" +
                    "\t\t\tUccelloClass.super.apply(this, [cm, params]);\n" +
                    "\t\t}\n" +
                    "\t});";

                var constr = header +
                    "\t\tclassName: \"" + model.get("Name") + "\",\n" +
                    "\t\tclassGuid: \"" + model.get("DataObjectGuid") + "\",\n" +
                    "\t\tmetaFields: [\n";

                var fields = model.fields();
                for (var i = 0; i < fields.length; i++) {
                    if (i > 0)
                        constr += ",\n";
                    constr += "\t\t\t{fname: \"" + fields[i].get("Name") + "\", ftype: " +
                        JSON.stringify(fields[i].get("FieldType").serialize()) + "}";
                };
                constr += "\n\t\t],\n";

                for (var i = 0; i < fields.length; i++) {
                    if (i > 0)
                        constr += ",\n";
                    constr += "\n\t\t" + this._genGetterName(fields[i].get("Name")) + ": function (value) {\n" +
                        "\t\t\treturn this._genericSetter(\"" + fields[i].get("Name") + "\", value);\n\t\t}";
                };

                return { parentGuid: UCCELLO_CONFIG.classGuids.DataObject, constrBody: constr + footer };
            },

            _buildConstr: function (model) {
                var Constructor = null;
                var code = this._getObjConstr(model);
                var parent = null;

                switch (code.parentGuid) {

                    case UCCELLO_CONFIG.classGuids.DataObject:
                        parent = DataObject;
                        break;

                    case UCCELLO_CONFIG.classGuids.DataRoot:
                        parent = DataRoot;
                        break;
                };

                if (parent) {
                    var constrFunc = new Function("Parent", code.constrBody);
                    Constructor = constrFunc(parent);
                }
                return Constructor;
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