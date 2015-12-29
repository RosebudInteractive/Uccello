if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaModel', '../dataman/dataobject', '../dataman/dataRoot',
        './metaDefs', './metaModelRef', './metaLinkRef'],
    function (UObject, MetaModel, DataObject, DataRoot, Meta, MetaModelRef, MetaLinkRef) {

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
            metaCols: [{ "cname": "ModelRefs", "ctype": "MetaModelRef" }],
            metaFields: [],

            init: function (cm, params) {
                this._modelsByName = {};
                this._modelsByGuid = {};

                this._modelsByRootName = {};
                this._modelsByRootGuid = {};
                this._modelRefs = {};

                this._router = null;

                this._linksTo = {};         // исходящие ссылки (по таблицам)
                this._linksFrom = {};       // входящие ссылки (по таблицам)
                this._linksUnresolved = {}; // неразрешенные ссылки

                this._isConstrReady = false;
                this._constructors = { byName: {}, byGuid: {} };

                UccelloClass.super.apply(this, [cm, params]);

                if (params) {

                    this._modelsCol = this.getCol("ModelRefs");
                    this._modelsCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddModelRef
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteModelRef
                    });
                    
                    this.getDB().event.on({
                        type: 'addRoot',
                        subscriber: this,
                        callback: this._onAddModel
                    }).on({
                        type: 'beforeDelRoot',
                        subscriber: this,
                        callback: this._onBeforeDelModel
                    });

                    new DataObject(this.getDB());
                    this._dataObjectType = this.getDB().getObj(DataObject.prototype.classGuid);
                    this._addExistingModels();
                    if (!this.getDB()._metaDataMgr)
                        this.getDB()._metaDataMgr = this;

                };
            },

            models: function () {
                var result = [];
                var keys = Object.keys(this._modelsByName);
                for (var i = 0; i < keys.length; i++)
                    result.push(this._modelsByName[keys[i]]);
                return result;
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
                var code = this.getObjConstrByName(name);
                if (code)
                    obj = this._createObj(code, params, name);
                return obj;
            },

            createObjByGuid: function (guid, params) {
                var obj = null;
                var code = this.getObjConstrByGuid(guid);
                if (code)
                    obj = this._createObj(code, params, model.get("Name"));
                return obj;
            },

            getObjConstrByName: function (name) {
                var constr = null;
                this._rebuildConstructors();
                var obj = this._constructors.byName[name];
                if (obj)
                    constr = obj.constr;
                return constr;
            },

            getObjConstrByGuid: function (guid) {
                var constr = null;
                this._rebuildConstructors();
                var obj = this._constructors.byGuid[guid];
                if (obj)
                    constr = obj.constr;
                return constr;
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

            addModel: function (name, guid, rootName, rootGuid) {
                if (name) {
                    var params = {
                        ini: {
                            fields: {
                                Name: name,
                                DataObjectGuid: guid ? guid : this.getDB().getController().guid(),
                                DataRootName: rootName ? rootName : "Root" + name,
                                DataRootGuid: rootGuid ? rootGuid : this.getDB().getController().guid(),
                            }
                        }
                    };
                    var model = new MetaModel(this.getDB(), params);
                    return model
                        .addField("Id", { type: "int", allowNull: false }, Meta.Field.System | Meta.Field.PrimaryKey | Meta.Field.AutoIncrement)
                        .addField("Guid", { type: "guid", allowNull: true }, Meta.Field.System | Meta.Field.Hidden)
                        .addField(Meta.ROW_VERSION_FNAME, { type: "rowversion", allowNull: false }, Meta.Field.System | Meta.Field.RowVersion);

                } else
                    throw new Error("Model name is undefined.");
            },

            deleteModel: function (model) {
                var _model;
                if (typeof model === "string") {
                    _model = this.getModel(model);
                } else
                    if (model instanceof MetaModel) {
                        _model = model;
                    } else
                        throw new Error("MetaDataMgr::deleteModel: Invalid argument type.");
                if(_model)
                    // TODO: вместо этого здесь д.б. удаление root-а memDB
                    this._modelsCol._del(this._getModelRef(_model));
            },

            getModel: function (name) {
                return this._modelsByName[name];
            },

            getModelByGuid: function (guid) {
                return this._modelsByGuid[guid];
            },

            getModelByRootName: function (name) {
                return this._modelsByRootName[name];
            },

            getModelByRootGuid: function (guid) {
                return this._modelsByRootGuid[guid];
            },

            getModelByRootGuid: function (guid) {
                return this._modelsByRootGuid[guid];
            },

            outgoingLinks: function (model) {
                var result = {};
                var keys = [];
                if (!model)
                    keys = Object.keys(this._linksTo)
                else {
                    var key = model.toString();
                    if (model instanceof MetaModel)
                        key = model.name();
                    if (this._linksTo[key])
                        keys.push(key);
                };
                for (var i = 0; i < keys.length; i++)
                    result[keys[i]] = this._linksTo[keys[i]];
                return result;
            },

            _addExistingModels: function () {
                var db = this.getDB();
                var root_count = db.countRoot();
                for (var i = 0; i < root_count; i++) {
                    this._onAddModel({
                        type: "addRoot",
                        target: this.getDB(),
                        obj: db.getRoot(i).obj
                    });
                };
            },

            _createObj: function (code, params, name) {
                var obj = null;
                if (code) {
                    var constr = this._buildConstr(code);
                    if (constr) {
                        obj = new constr(this.getDB(), params);
                    };
                };
                return obj;
            },

            _getModelRef: function (model) {
                 return this._modelRefs[model.dataObjectGuid()];
            },

            _rebuildConstructors: function () {
                if (!this._isConstrReady) {
                    if (Object.keys(this._linksUnresolved).length > 0)
                        throw new Error("Schema contains unresolved references.");

                    this._constructors = { byName: {}, byGuid: {} };

                    var names = Object.keys(this._modelsByName);

                    for (var i = 0; i < names.length; i++) {
                        var model = this._modelsByName[names[i]];
                        var name = model.name();
                        var guid = model.dataObjectGuid();
                        var rootName = model.dataRootName();
                        var rootGuid = model.dataRootGuid();
                        var objConstr = { constr: this._getObjConstr(model), objGuid: null, rootGuid: rootGuid };
                        var rootConstr = { constr: this._getRootConstr(model), objGuid: guid, rootGuid: null };
                        this._constructors.byGuid[guid] = objConstr;
                        this._constructors.byGuid[rootGuid] = rootConstr;
                        this._constructors.byName[name] = objConstr;
                        this._constructors.byName[rootName] = rootConstr;
                    };

                    this._isConstrReady = true;
                };
            },

            _genGetterName: function (fname) {
                var res = fname;
                if (fname.length > 0) {
                    res = fname[0].toLowerCase() + fname.substring(1);
                };
                return res;
            },

            _getObjConstr: function (model) {

                var fields = model.fields();
                var header =
                 "return Parent.extend({\n";

                var footer = ",\n\n" +
                    "\t\tinit: function(cm,params){\n" +
                    "\t\t\tUccelloClass.super.apply(this, [cm, params]);\n";

                for (var i = 0; i < fields.length; i++) {
                    var flags = fields[i].get("Flags");
                    if (!(flags & Meta.Field.Hidden)) {
                        footer += "\t\t\tthis._persFields[\"" + fields[i].get("Name") + "\"] = true;\n";
                        if (flags & Meta.Field.PrimaryKey)
                            footer += "\t\t\tthis._keyField = \"" + fields[i].get("Name") + "\";\n";
                    };
                };

                footer += "\t\t}\n" + "\t});";

                var constr = header +
                    "\t\tclassName: \"" + model.get("Name") + "\",\n" +
                    "\t\tclassGuid: \"" + model.get("DataObjectGuid") + "\",\n" +
                    "\t\tmetaFields: [\n";

                var is_first = true;
                for (i = 0; i < fields.length; i++) {
                    if ((fields[i].flags() & (Meta.Field.Internal | Meta.Field.Hidden)) === 0) {
                        if (!is_first)
                            constr += ",\n";
                        is_first = false;
                        constr += "\t\t\t{fname: \"" + fields[i].get("Name") + "\", ftype: " +
                            JSON.stringify(fields[i].get("FieldType").serialize()) + "}";
                    }
                };
                constr += "\n\t\t],\n";

                if (model.getRowVersionField())
                    constr += "\t\trowVersionFname: \"" + model.getRowVersionField().name() + "\",\n";

                is_first = true;
                for (var i = 0; i < fields.length; i++) {
                    if ((fields[i].flags() & (Meta.Field.Internal | Meta.Field.Hidden)) === 0) {
                        if (!is_first)
                            constr += ",\n";
                        is_first = false;
                        constr += "\n\t\t" + this._genGetterName(fields[i].get("Name")) + ": function (value) {\n" +
                            "\t\t\treturn this._genericSetter(\"" + fields[i].get("Name") + "\", value);\n\t\t}";
                    };
                };

                return { parentGuid: UCCELLO_CONFIG.classGuids.DataObject, constrBody: constr + footer };
            },

            _getRootConstr: function (model) {

                var constr = "return Parent.extend({\n" +
                    "\t\tclassName: \"" + model.get("DataRootName") + "\",\n" +
                    "\t\tclassGuid: \"" + model.get("DataRootGuid") + "\",\n" +
                    "\t\tmetaCols: [{ \"cname\": \"DataElements\", \"ctype\": \"" + model.get("Name") + "\" }],\n" +
                    "\t\tmetaFields: [],\n";

                if (model.getRowVersionField())
                    constr += "\t\trowVersionFname: \"" + model.getRowVersionField().name() + "\",\n";

                constr += "\n" +
                    "\t\tinit: function(cm,params){\n" +
                    "\t\t\tUccelloClass.super.apply(this, [cm, params]);\n";

                if (model.getPrimaryKey())
                    constr += "\t\t\tthis._keyField = \"" + model.getPrimaryKey().name() + "\";\n";

                constr +=
                    "\t\t\tif(params)\n" +
                    "\t\t\t\tcm.registerDataRoot(\"" + model.get("Name") + "\", this);\n" +
                    "\t\t}\n" +
                    "\t});";

                return { parentGuid: UCCELLO_CONFIG.classGuids.DataRoot, constrBody: constr };
            },

            _buildConstr: function (code) {
                var Constructor = null;
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

            _getOnChangeModelReadOnlyProp: function (model, prop_name) {
                var self = this;
                var oldVal = model._genericSetter(prop_name);

                return function (args) {
                    var newVal = model._genericSetter(prop_name);
                    if (!model.getFieldType(prop_name).isEqual(oldVal, newVal)) {
                        model.set(prop_name, oldVal);
                        throw new Error("Property \"" + prop_name + "\" is READONLY.");
                    };
                };
            },

            _addLink: function (args) {
                this._isConstrReady = false;

                var model = args.target;
                var modelName = model.name();
                var dstName = args.link.model();
                var fieldName = args.fieldName;
                var link = {
                    src: model,
                    type: args.link,
                    field: fieldName,
                    dstName: dstName,
                    dst: this._modelsByName[dstName] ? this._modelsByName[dstName] : null
                };
                var linksTo = this._linksTo[modelName];
                if (!linksTo)
                    linksTo = this._linksTo[modelName] = {};
                linksTo[fieldName] = link;
                if (link.dst) {
                    var linksFrom = this._linksFrom[dstName];
                    if (!linksFrom)
                        linksFrom = this._linksFrom[dstName] = {};
                    linksFrom[modelName + "_" + fieldName] = link;
                }
                else {
                    this._linksUnresolved[modelName + "_" + fieldName] = link;
                };
                link.src._addRef(link.field, link.dstName, link.dst);
            },

            _removeLink: function (args) {
                this._isConstrReady = false;

                var model = args.target;
                var modelName = model.name();
                var fieldName = args.fieldName;
                var link = this._linksTo[modelName] && this._linksTo[modelName][fieldName] ? this._linksTo[modelName][fieldName] : null;
                if (link) {
                    link.src._deleteRef(link.field, link.dstName);
                    if (link.dst)
                        delete this._linksFrom[link.dst.name()][modelName + "_" + fieldName];
                    else
                        delete this._linksUnresolved[modelName + "_" + fieldName];
                    delete this._linksTo[link.src.name()][fieldName];
                };
            },

            _addModelToLinks: function (name, model) {
                this._isConstrReady = false;

                var linksFrom = null;
                var links = Object.keys(this._linksUnresolved);
                for (var i = 0; i < links.length; i++) {
                    var link = this._linksUnresolved[links[i]];
                    if (link.type.model() === name) {
                        link.dst = model;
                        if (!linksFrom)
                            linksFrom = this._linksFrom[name] = {};
                        linksFrom[link.src.name() + "_" + link.field] = link;
                        delete this._linksUnresolved[links[i]];
                        link.src._addRef(link.field, link.dstName, link.dst);
                    };
                };
            },

            _removeModelFromLinks: function (name) {
                this._isConstrReady = false;

                var linksTo = this._linksTo[name];
                if (linksTo) {
                    var links = Object.keys(linksTo);

                    for (var i = 0; i < links.length; i++) {
                        var link = linksTo[links[i]];
                        if (link.dst) {
                            var linksFrom = this._linksFrom[link.dst.name()];
                            if (linksFrom)
                                delete linksFrom[name + "_" + links[i]];
                        } else
                            delete this._linksUnresolved[name + "_" + links[i]];
                    };
                    delete this._linksTo[name];
                };

                var linksFrom = this._linksFrom[name];
                if (linksFrom) {
                    var links = Object.keys(linksFrom);
                    for (var i = 0; i < links.length; i++) {
                        var link = linksFrom[links[i]];
                        link.dst = null;
                        this._linksUnresolved[link.src.name() + "_" + link.field] = link;
                        link.src._addRef(link.field, link.dstName); // Ссылка становится неопределенной
                    };
                    delete this._linksFrom[name];
                };
            },

            _onAddModel: function (args) {
                var model = args.obj;
                if (model instanceof MetaModel) {
                    var name = model.name();
                    var guid = model.dataObjectGuid();

                    var root_name = model.dataRootName();
                    var root_guid = model.dataRootGuid();

                    if ((this._modelsByName[name] !== undefined)
                            || (this._modelsByRootName[name] !== undefined)) {
                        this.getDB()._deleteRoot(model);
                        throw new Error("Model \"" + name + "\" is already defined.");
                    };
                    if ((this._modelsByGuid[guid] !== undefined)
                            || (this._modelsByRootGuid[guid] !== undefined)) {
                        this.getDB()._deleteRoot(model);
                        throw new Error("Model \"" + guid + "\" is already defined.");
                    };

                    if ((this._modelsByName[root_name] !== undefined)
                            || (this._modelsByRootName[root_name] !== undefined)) {
                        this.getDB()._deleteRoot(model);
                        throw new Error("Model with Root Name: \"" + root_name + "\" is already defined.");
                    };
                    if ((this._modelsByGuid[root_guid] !== undefined)
                            || (this._modelsByRootGuid[root_guid] !== undefined)) {
                        this.getDB()._deleteRoot(model);
                        throw new Error("Model with Root Guid: \"" + root_guid + "\" is already defined.");
                    };
                    new MetaModelRef(this.getDB(), {
                        ini: {
                            fields: {
                                TableName: name,
                                TableRef: {
                                    guidInstanceRes: model.getGuid(),
                                    guidInstanceElem: model.getGuid()
                                }
                            }
                        },
                        parent: this,
                        colName: "ModelRefs"
                    });
                    var fields = model.fields();
                    for (var i = 0; i < fields.length; i++)
                        model._addLinkIfRef(fields[i]);
                };
            },

            _onBeforeDelModel: function (args) {
                var model = args.obj;
                if (model instanceof MetaModel) {
                    var guid = model.dataObjectGuid();
                    var ref = this._modelRefs[guid];
                    if (ref)
                        this._modelsCol._del(ref);
                };
            },

            _onAddModelRef: function (args) {
                this._isConstrReady = false;

                var model = args.obj.tableRef();
                if(!model)
                    throw new Error("MetaDataMgr::_onAddModelRef: Empty or unresolved table reference.");

                var name = model.name();
                var guid = model.dataObjectGuid();

                var root_name = model.dataRootName();
                var root_guid = model.dataRootGuid();

                this._modelsByName[name] = model;
                this._modelsByGuid[guid] = model;
                this._modelRefs[guid] = args.obj;

                this._modelsByRootName[root_name] = model;
                this._modelsByRootGuid[root_guid] = model;

                this._addModelToLinks(name, model);

                var self = this;
                model.handlers = [];

                var hdesc = {
                    obj: model,
                    handler: {
                        type: 'addLink',
                        subscriber: this,
                        callback: this._addLink
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);

                hdesc = {
                    obj: model,
                    handler: {
                        type: 'removeLink',
                        subscriber: this,
                        callback: this._removeLink
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);

                hdesc = {
                    obj: model,
                    handler: {
                        type: 'modelModified',
                        subscriber: this,
                        callback: function (args) {
                            self._isConstrReady = false;
                        }
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);

                hdesc = {
                    obj: model.event,
                    handler: {
                        type: 'mod%Name',
                        subscriber: this,
                        callback: this._getOnChangeModelReadOnlyProp(model, "Name")
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);

                hdesc = {
                    obj: model.event,
                    handler: {
                        type: 'mod%DataObjectGuid',
                        subscriber: this,
                        callback: this._getOnChangeModelReadOnlyProp(model, "DataObjectGuid")
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);

                hdesc = {
                    obj: model.event,
                    handler: {
                        type: 'mod%DataRootName',
                        subscriber: this,
                        callback: this._getOnChangeModelReadOnlyProp(model, "DataRootName")
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);

                hdesc = {
                    obj: model.event,
                    handler: {
                        type: 'mod%DataRootGuid',
                        subscriber: this,
                        callback: this._getOnChangeModelReadOnlyProp(model, "DataRootGuid")
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);
            },

            _onDeleteModelRef: function (args) {
                this._isConstrReady = false;

                var model = args.obj.tableRef();
                if (!model)
                    throw new Error("MetaDataMgr::_onAddModelRef: Empty or unresolved table reference.");

                var name = model.get("Name");
                var guid = model.get("DataObjectGuid");

                var root_name = model.get("DataRootName");
                var root_guid = model.get("DataRootGuid");

                this._removeModelFromLinks(name);

                delete this._modelsByName[name];
                delete this._modelsByGuid[guid];
                delete this._modelRefs[guid];

                delete this._modelsByRootName[root_name];
                delete this._modelsByRootGuid[root_guid];

                for (var i = 0; i < model.handlers.length; i++) {
                    var hdesc = model.handlers[i];
                    hdesc.obj.off(hdesc.handler);
                };
            }
        });
        return MetaDataMgr;
    }
);