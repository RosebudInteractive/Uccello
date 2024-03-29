if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaModel', '../dataman/dataobject', '../dataman/dataRoot',
        './metaDefs', './metaModelRef', './metaLinkRef', './dataModel', '../memDB/memMetaType', './metaModelVirtual'],
    function (UObject, MetaModel, DataObject, DataRoot, Meta,
        MetaModelRef, MetaLinkRef, DataModel, MetaTypes, MetaModelVirtual) {

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

                this._treesByName = {};

                this._modelsByRootName = {};
                this._modelsByRootGuid = {};
                this._modelRefs = {};
                this._maxModelId = 0;
                this._modelsByTypeId = {};
                this._typeModel = null;

                this._router = null;

                this._linksTo = {};         // ��������� ������ (�� ��������)
                this._linksFrom = {};       // �������� ������ (�� ��������)
                this._linksUnresolved = {}; // ������������� ������

                this._isConstrReady = false;
                this._constructors = { byName: {}, byGuid: {} };
                this._isClassFieldsReady = false;

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

            getTypeModel: function () {
                return this._typeModel;
            },

            models: function (exclude_virtual) {
                var result = [];
                var keys = Object.keys(this._modelsByName);
                for (var i = 0; i < keys.length; i++)
                    if (!(exclude_virtual && this._modelsByName[keys[i]].isVirtual()))
                        result.push(this._modelsByName[keys[i]]);
                return result;
            },

            objectTrees: function () {
                var result = [];
                var keys = Object.keys(this._treesByName);
                for (var i = 0; i < keys.length; i++)
                    result.push(this._treesByName[keys[i]].objTree);
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
                    obj = this._createObj(code, params, model.get("ResName"));
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
                    if (code) {
                        if (code.isDataObject) {
                            var model = this.getModelByGuid(guids[i]);
                            var ancestors = model.getAncestors();
                            if (ancestors && (ancestors.length > 0)) {
                                for (var j = 0; j < ancestors.length; j++) {
                                    var guid_ancestor = ancestors[j].dataObjectGuid();
                                    var code_ancestor = this.getObjConstrByGuid(guid_ancestor);
                                    if(code_ancestor)
                                        constrArr.push({ guid: guid_ancestor, code: code_ancestor });
                                };
                            };
                        }
                        constrArr.push({ guid: guids[i], code: code });
                    }
                };

                if (callback)
                    setTimeout(function () {
                        callback(constrArr);
                    }, 0);

                return callback ? REMOTE_RESULT : constrArr;
            },

            addDataModel: function (name) {
                if (name) {

                    var fields = {};
                    var ResName = name;

                    var data_model = new DataModel(this.getDB(), { ini: { fields: { ResName: ResName } } });
                    return data_model;

                }
                else
                    throw new Error("Name is undefined.");
            },

            deleteDataModel: function (model) {
                var _model;
                if (typeof model === "string") {
                    _model = this._treesByName[name];
                } else
                    if (model instanceof DataModel) {
                        _model = model;
                    } else
                        throw new Error("MetaDataMgr::deleteDataModel: Invalid argument type.");
                if (_model) {
                    this.getDB()._deleteRoot(_model);
                };
            },

            getObjectTree: function (name) {
                return this._treesByName[name];
            },

            addTypeObjModel: function () {
                var params = {
                    ini: {
                        fields: {
                            ResName: Meta.TYPE_MODEL_NAME,
                            DataObjectGuid: Meta.TYPE_MODEL_GUID,
                            DataRootName: Meta.TYPE_MODEL_RNAME,
                            DataRootGuid: Meta.TYPE_MODEL_RGUID,
                            IsTypeModel: true
                        }
                    }
                };
                var model = new MetaModel(this.getDB(), params);
                return model
                    .addField("Id", { type: "int", allowNull: false }, Meta.Field.System | Meta.Field.PrimaryKey)
                    .addField("Guid", { type: "guid", allowNull: false }, Meta.Field.System | Meta.Field.Hidden | Meta.Field.Guid)
                    .addField(Meta.ROW_VERSION_FNAME, { type: "guid", allowNull: false }, Meta.Field.System | Meta.Field.RowVersion)
                    .addField("TypeGuid", { type: "guid", allowNull: false })
                    .addField("ModelName", { type: "string", length: 255, allowNull: false })
                    .addField("ParentTypeId", { type: "dataRef", model: Meta.TYPE_MODEL_NAME, refAction: "parentRestrict", allowNull: true });

            },

            addModel: function (name, guid, rootName, rootGuid) {
                return this._addEmptyModel(name, guid, rootName, rootGuid)
                    .addField("Id", { type: "int", allowNull: false }, Meta.Field.System | Meta.Field.PrimaryKey)
                    .addField("Guid", { type: "guid", allowNull: false }, Meta.Field.System | Meta.Field.Hidden | Meta.Field.Guid)
                    .addField(Meta.ROW_VERSION_FNAME, { type: "guid", allowNull: false }, Meta.Field.System | Meta.Field.RowVersion)
                    .addField(Meta.TYPE_ID_FNAME, { type: "dataRef", model: Meta.TYPE_MODEL_NAME, refAction: "parentRestrict", allowNull: false },
                        Meta.Field.System | Meta.Field.TypeId);
            },

            addVirtualModel: function (name, guid, rootName, rootGuid) {
                return this._addEmptyModel(name, guid, rootName, rootGuid, true);
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
                if (_model) {
                    this.getDB()._deleteRoot(_model);
                }
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

            outgoingDbRefsLinks: function (model) {
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
                for (var i = 0; i < keys.length; i++) {
                    var model = this.getModel(keys[i]);
                    if (model && (!model.isVirtual()))
                        result[keys[i]] = this._linksTo[keys[i]];
                };
                return result;
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

            checkSchema: function () {
                if (Object.keys(this._linksUnresolved).length > 0)
                    throw new Error("Schema contains unresolved references.");
                var refs = Object.keys(this._linksFrom);
                for (var i = 0; i < refs.length; i++) {
                    var model = this.getModel(refs[i]);
                    if (!model)
                        throw new Error("Referenced model \"" + refs[i] + "\" doesn't exist!")
                    else
                        if (model.isVirtual())
                            throw new Error("References to virtual model \"" + refs[i] + "\" aren't allowed!")
                };
                this._rebuildClassFields();
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

            _addEmptyModel: function (name, guid, rootName, rootGuid, is_virtual) {
                if (name) {
                    var params = {
                        ini: {
                            fields: {
                                ResName: name,
                                DataObjectGuid: guid ? guid : this.getDB().getController().guid(),
                                DataRootName: rootName ? rootName : "Root" + name,
                                DataRootGuid: rootGuid ? rootGuid : this.getDB().getController().guid(),
                                IsTypeModel: false
                            }
                        }
                    };

                    if (!is_virtual)
                        params.ini.fields.TypeId = ++this._maxModelId;

                    var constr = is_virtual ? MetaModelVirtual : MetaModel;
                    var model = new constr(this.getDB(), params);
                    return model;
                } else
                    throw new Error("Model name is undefined.");
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

            _rebuildClassFields: function () {
                if (!this._isClassFieldsReady) {
                    var names = Object.keys(this._modelsByName);

                    for (var i = 0; i < names.length; i++) {
                        var model = this._modelsByName[names[i]];
                        model._ancestors = null;
                        model._descendants = null;
                        model._classFields = null;
                        model._ownFields = null;
                        model._classFieldsByName = null;
                        model._outgoingClassLinks = null;
                    };

                    var self = this;
                    function buildClassTbl(model, flds, class_fields, ancestors) {
                        if (!model._classFields) {

                            var parent_ref = model.getParentRefField();
                            if (parent_ref) {
                                var parent_name = parent_ref.fieldType().model();
                                var model_name = model.name();
                                var parent_model = self._linksTo[model_name] && self._linksTo[model_name][parent_ref.name()] ?
                                    self._linksTo[model_name][parent_ref.name()].dst : null;
                                if (parent_model)
                                    buildClassTbl(parent_model, flds, class_fields, ancestors)
                                else
                                    throw new Error("Undefined parent reference: " + model_name + " --> " + parent_name);
                                parent_model._descendants.push(model);
                            };

                            model._childLevel = ancestors.length;
                            model._ancestors = ancestors.concat();
                            model._classFields = class_fields.concat();
                            model._ownFields = [];
                            model._descendants = [];

                            var fields_arr = model.fields();
                            for (var i = 0; i < fields_arr.length; i++) {
                                var fname = fields_arr[i].name();
                                var flags = fields_arr[i].flags();
                                if ((model._childLevel === 0) ||
                                    ((flags & (Meta.Field.RowVersion + Meta.Field.ParentRef)) === 0)) {
                                    if (flds[fname])
                                        throw new Error("Field \"" + model.name() + "::" + fname + "\" is already defined in ancestors!");
                                    flds[fname] = true;
                                    model._classFields.push({ field: fields_arr[i], model: model, level: model._childLevel });
                                    model._ownFields.push(fields_arr[i]);
                                };
                            };
                        }
                        else {
                            for (var i = 0; i < model._classFields.length; i++) {
                                flds[model._classFields[i].field.name()] = true;
                            };
                        };

                        ancestors.length = 0;
                        class_fields.length = 0;
                        Array.prototype.push.apply(ancestors, model._ancestors);
                        Array.prototype.push.apply(class_fields, model._classFields);
                        ancestors.push(model);
                    };

                    for (var i = 0; i < names.length; i++) {
                        var model = this._modelsByName[names[i]];
                        buildClassTbl(model, {}, [], []);
                    };
                    this._isClassFieldsReady = true;
                };
            },

            _rebuildConstructors: function () {
                if (!this._isConstrReady) {

                    this.checkSchema();
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
                var classFields = model.getClassFields(); // ���� � ������ ������������
                var childLevel = model.getChildLevel();

                var header =
                 "return Parent.extend({\n";

                var footer = ",\n\n" +
                    "\t\tinit: function(cm,params){\n" +
                    "\t\t\tUccelloClass.super.apply(this, [cm, params]);\n";

                footer += "\t\t}\n" + "\t});";

                var constr = header +
                    "\t\tclassName: \"" + Meta.DATA_OBJECT_WORKSPACE + "." + model.get("ResName") + "\",\n" +
                    "\t\tclassGuid: \"" + model.get("DataObjectGuid") + "\",\n" +
                    "\t\tmodelName: \"" + model.get("ResName") + "\",\n" +
                    "\t\tmetaFields: [\n";

                var is_first = true;
                for (i = 0; i < fields.length; i++) {
                    var flags = fields[i].flags();
                    if (((flags & (Meta.Field.Internal | Meta.Field.Hidden | Meta.Field.ParentRef | Meta.Field.RowVersion)) === 0) ||
                        ((flags & (Meta.Field.RowVersion)) !== 0) && (childLevel === 0)) {
                        if (!is_first)
                            constr += ",\n";
                        is_first = false;
                        constr += "\t\t\t{fname: \"" + fields[i].get("ResElemName") + "\", ftype: " +
                            JSON.stringify(fields[i].get("FieldType").serialize()) + "}";
                    };
                };
                constr += "\n\t\t],\n";

                if (model.getRowVersionField() && (childLevel === 0))
                    constr += "\t\t_rowVersionFname: \"" + model.getRowVersionField().name() + "\",\n";

                is_first = true;
                constr += "\t\t_persFields: {";
                for (i = 0; i < classFields.length; i++) {
                    var flags = classFields[i].field.get("Flags");
                    if (!(flags & Meta.Field.Hidden)) {
                        if (!is_first)
                            constr += ",";
                        is_first = false;
                        constr += "\n\t\t\t\"" + classFields[i].field.get("ResElemName") + "\": true";
                    };
                };
                constr += "\n\t\t},\n";

                if (model.getPrimaryKey() && (childLevel === 0))
                    constr += "\t\t_keyField: \"" + model.getPrimaryKey().name() + "\",\n";

                if (model.getTypeIdField() && (childLevel === 0)) {
                    constr += "\t\t_typeIdField: \"" + model.getTypeIdField().name() + "\",\n";
                };
                constr += "\t\t_typeIdVal: " + model.getActualTypeId();

                if (model.isVirtual()) {
                    constr += ",\n\n\t\tisReadOnly: function () {\n\t\t\treturn true;\n\t\t}";
                    constr += ",\n\n\t\isPersistable: function () {\n\t\t\treturn false;\n\t\t}";
                };

                for (var i = 0; i < fields.length; i++) {
                    if ((fields[i].flags() & (Meta.Field.Internal | Meta.Field.Hidden)) === 0) {
                        var method_name = this._genGetterName(fields[i].get("ResElemName"));
                        if (DataObject.prototype[method_name] === undefined) {
                            constr += ",\n\n\t\t" + method_name + ": function (value) {\n" +
                                "\t\t\treturn this._genericSetter(\"" + fields[i].get("ResElemName") + "\", value);\n\t\t}";
                        };
                    };
                };

                var parentGuid = childLevel > 0 ? model.getAncestors()[childLevel - 1].dataObjectGuid() : UCCELLO_CONFIG.classGuids.DataObject;
                return { parentGuid: parentGuid, constrBody: constr + footer, isDataObject: true };
            },

            _getRootConstr: function (model) {

                var constr = "return Parent.extend({\n" +
                    "\t\tclassName: \"" + Meta.DATA_OBJECT_WORKSPACE + "." + model.get("DataRootName") + "\",\n" +
                    "\t\tclassGuid: \"" + model.get("DataRootGuid") + "\",\n" +
                    "\t\tmodelName: \"" + model.get("ResName") + "\",\n" +
                    "\t\tmetaCols: [{ \"cname\": \"DataElements\", \"ctype\": \"" + Meta.DATA_OBJECT_WORKSPACE + "."
                        + model.get("ResName") + "\" }],\n" +
                    "\t\tmetaFields: [],\n";

                if (model.getRowVersionField())
                    constr += "\t\t_rowVersionFname: \"" + model.getRowVersionField().name() + "\",\n";

                if (model.getClassPrimaryKey())
                    constr += "\t\t_keyField: \"" + model.getClassPrimaryKey().name() + "\",\n";

                if (model.getClassTypeIdField()) {
                    constr += "\t\t_typeIdField: \"" + model.getClassTypeIdField().name() + "\",\n";
                    constr += "\t\t_typeIdVal: " + model.getActualTypeId() + ",\n";
                };

                if (model.isVirtual())
                    constr += "\n\t\tisReadOnly: function () {\n\t\t\treturn true;\n\t\t},\n";

                constr += "\n" +
                    "\t\tinit: function(cm,params){\n" +
                    "\t\t\tUccelloClass.super.apply(this, [cm, params]);\n";

                constr +=
                    "\t\t\tif(params)\n" +
                    "\t\t\t\tcm.registerDataRoot(\"" + model.get("ResName") + "\", this);\n" +
                    "\t\t}\n" +
                    "\t});";

                return { parentGuid: UCCELLO_CONFIG.classGuids.DataRoot, constrBody: constr, isDataObject: false };
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
                this._isClassFieldsReady = false;

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
                this._isClassFieldsReady = false;

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
                this._isClassFieldsReady = false;

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
                this._isClassFieldsReady = false;

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
                        link.src._addRef(link.field, link.dstName); // ������ ���������� ��������������
                    };
                    delete this._linksFrom[name];
                };
            },

            _onAddModel: function (args) {
                var model = args.obj;
                var name;
                if (model instanceof MetaModel) {
                    name = model.name();
                    var guid = model.dataObjectGuid();

                    var root_name = model.dataRootName();
                    var root_guid = model.dataRootGuid();

                    if (model.isTypeModel()) {
                        if (this._typeModel) {
                            this.getDB()._deleteRoot(model);
                            throw new Error("Type Model \"" + this._typeModel.name() + "\" is already defined.");
                        };
                        this._typeModel = model;
                    }
                    else {
                        var type_id = model.getActualTypeId();
                        if ((this._modelsByTypeId[type_id] !== undefined)) {
                            type_id = ++this._maxModelId;
                            model._setActualTypeId(type_id);
                        };
                        this._modelsByTypeId[type_id] = model;
                        if (type_id > this._maxModelId)
                            this._maxModelId = type_id;
                    };

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
                }
                else
                    if (model instanceof DataModel) {
                        name = model.name();
                        if (this._treesByName[name] !== undefined) {
                            this.getDB()._deleteRoot(model);
                            throw new Error("Data Object Tree \"" + name + "\" is already defined.");
                        };

                        var hdesc = {
                            type: 'mod%ResName',
                            subscriber: this,
                            callback: this._getOnChangeModelReadOnlyProp(model, "ResName")
                        };
                        model.event.on(hdesc);

                        this._treesByName[name] = {
                            objTree: model,
                            hdesc: hdesc
                        };
                    };
            },

            _onBeforeDelModel: function (args) {
                var model = args.obj;
                if (model instanceof MetaModel) {
                    var guid = model.dataObjectGuid();
                    var ref = this._modelRefs[guid];
                    if (ref)
                        this._modelsCol._del(ref);
                }
                else
                    if (model instanceof DataModel) {
                        var name = model.name();
                        var obj = this._treesByName[name];
                        if (obj !== undefined) {
                            obj.objTree.event.off(obj.hdesc);
                            delete this._treesByName[name];
                        };
                    };
            },

            _onAddModelRef: function (args) {
                this._isConstrReady = false;
                this._isClassFieldsReady = false;

                var model = args.obj.tableRef();
                if (!model)
                    throw new Error("MetaDataMgr::_onAddModelRef: Empty or unresolved table reference.");

                var name = model.name();
                var guid = model.dataObjectGuid();

                var root_name = model.dataRootName();
                var root_guid = model.dataRootGuid();

                this._modelsByTypeId[model.getActualTypeId()] = model;
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
                            self._isClassFieldsReady = false;
                        }
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);

                hdesc = {
                    obj: model.event,
                    handler: {
                        type: 'mod%ResName',
                        subscriber: this,
                        callback: this._getOnChangeModelReadOnlyProp(model, "ResName")
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

                hdesc = {
                    obj: model.event,
                    handler: {
                        type: 'mod%IsTypeModel',
                        subscriber: this,
                        callback: this._getOnChangeModelReadOnlyProp(model, "IsTypeModel")
                    }
                };
                model.handlers.push(hdesc);
                hdesc.obj.on(hdesc.handler);
            },

            _onDeleteModelRef: function (args) {
                this._isConstrReady = false;
                this._isClassFieldsReady = false;

                var model = args.obj.tableRef();
                if (!model)
                    throw new Error("MetaDataMgr::_onAddModelRef: Empty or unresolved table reference.");

                var name = model.get("ResName");
                var guid = model.get("DataObjectGuid");

                var root_name = model.get("DataRootName");
                var root_guid = model.get("DataRootGuid");

                this._removeModelFromLinks(name);

                delete this._modelsByTypeId[model.getActualTypeId()];
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