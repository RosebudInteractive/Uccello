if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../resman/dataTypes/resource', './metaModelField', './metaDefs', './metaLinkRef', '../system/event',
        '../memDB/memMetaType', '../dataman/dataobject'],
    function (Resource, MetaModelField, Meta, MetaLinkRef, Event, MemMetaType, DataObject) {

        var MetaModel = Resource.extend([new Event()], {

            className: "MetaModel",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModel,
            metaCols: [
                { "cname": "Fields", "ctype": "MetaModelField" },
                { "cname": "Refs", "ctype": "MetaLinkRef" }
            ],
            metaFields: [
                { fname: "DataObjectGuid", ftype: "string" },
                { fname: "DataRootName", ftype: "string" },
                { fname: "DataRootGuid", ftype: "string" },
                { fname: "IsTypeModel", ftype: "boolean" },
                { fname: "TypeId", ftype: "int" }
            ],

            elemNamePrefix: "Field",

            name: function (value) {
                return this._genericSetter("ResName", value);
            },

            dataObjectGuid: function (value) {
                return this._genericSetter("DataObjectGuid", value);
            },

            dataRootName: function (value) {
                return this._genericSetter("DataRootName", value);
            },

            dataRootGuid: function (value) {
                return this._genericSetter("DataRootGuid", value);
            },

            isTypeModel: function (value) {
                return this._genericSetter("IsTypeModel", value);
            },

            typeId: function (value) {
                return this._genericSetter("TypeId", value);
            },

            getActualTypeId: function () {
                return this._actTypeId === -1 ? this.typeId() : this._actTypeId;
            },

            isVirtual: function () {
                return false;
            },

            init: function (cm, params) {
                this._fieldsByName = {};
                this._fields = [];
                this._primaryKey = null;
                this._rowVersion = null;
                this._guidField = null;
                this._typeId = null;
                this._orderChangCounter = 0;
                this._refs = {};
                this._actTypeId = -1;
                this._metaDataMgr = null;
                this._parentRef = null;
                this._childLevel = 0;

                this._ancestors = null;
                this._descendants = null;
                this._classFields = null;
                this._ownFields = null;
                this._classFieldsByName = null;
                this._outgoingClassLinks = null;

                if (params)
                    this.eventsInit();  // WARNING !!! This line is essential !!! It initializes "Event" mixin.

                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this._fieldsCol = this.getCol("Fields");
                    this._fieldsCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddField
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteField
                    });

                    this._refsCol = this.getCol("Refs");
                    this._refsCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddRef
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteRef
                    });

                    new DataObject(this.getDB());
                    this._dataObjectType = this.getDB().getObj(DataObject.prototype.classGuid);

                    if (!this.getDB()._metaDataMgr)
                        new (this.getDB().getMetaDataMgrConstructor())(this.getDB(), {});
                    this._metaDataMgr = this.getDB()._metaDataMgr;
                };
            },

            getMetaDataMgr: function () {
                return this._metaDataMgr;
            },

            getPrimaryKey: function () {
                return this._primaryKey;
            },

            getClassPrimaryKey: function () {
                var res = this._primaryKey;
                if (this._parentRef) {
                    this._metaDataMgr._rebuildClassFields();
                    res = this._ancestors[0].getPrimaryKey();
                };
                return res;
            },

            getGuidField: function () {
                return this._guidField;
            },

            getRowVersionField: function () {
                return this._rowVersion;
            },

            getTypeIdField: function () {
                return this._typeId;
            },

            getClassTypeIdField: function () {
                var res = this._typeId;
                if (this._parentRef) {
                    this._metaDataMgr._rebuildClassFields();
                    res = this._ancestors[0].getTypeIdField();
                };
                return res;
            },

            getClassGuidField: function () {
                var res = this._guidField;
                if (this._parentRef) {
                    this._metaDataMgr._rebuildClassFields();
                    res = this._ancestors[0].getGuidField();
                };
                return res;
            },

            getParentRefField: function () {
                return this._parentRef;
            },

            getAncestors: function () {
                this._metaDataMgr._rebuildClassFields();
                return this._ancestors;
            },

            getDescendants: function () {
                this._metaDataMgr._rebuildClassFields();
                return this._descendants;
            },

            getClassFields: function () {
                this._metaDataMgr._rebuildClassFields();
                return this._classFields;
            },

            getOwnFields: function () {
                this._metaDataMgr._rebuildClassFields();
                return this._ownFields;
            },

            getChildLevel: function () {
                this._metaDataMgr._rebuildClassFields();
                return this._childLevel;
            },

            getParentNames: function () {
                this._metaDataMgr._rebuildClassFields();
                var result = {};
                result[this.name()] = this;
                this._ancestors.forEach(function (ancestor) {
                    result[ancestor.name()] = ancestor;
                });
                return result;
            },

            inherit: function (name, guid, rootName, rootGuid) {
                var res = null;

                if (!this._metaDataMgr)
                    throw new Error("MetaModel::inherit: MetaDataMgr doesn't exists!");

                res = this._metaDataMgr._addEmptyModel(name, guid, rootName, rootGuid)
                    .addField(Meta.PARENT_REF_FNAME, { type: "dataRef", model: this.name(), refAction: "parentCascade", allowNull: false },
                        Meta.Field.System | Meta.Field.PrimaryKey | Meta.Field.Hidden | Meta.Field.ParentRef)
                    .addField(Meta.ROW_VERSION_FNAME, { type: "guid", allowNull: false },
                        Meta.Field.System | Meta.Field.Hidden | Meta.Field.RowVersion);

                return res;
            },

            addInternalField: function (name, flags, order) {
                if (this._dataObjectType) {
                    var field_type = this._dataObjectType.getFieldType(name);
                    if (field_type) {
                        var new_flags = flags ? ((~(Meta.Field.System)) & (flags | Meta.Field.Internal)) : Meta.Field.Internal;
                        return this._addField(name, field_type, new_flags, order, true);
                    }
                    else
                        throw new Error("Can't find internal field \"" + name + "\".");
                }
                else
                    throw new Error("addInternalField::[_dataObjectType] is undefined!!!");
            },

            addField: function (name, field_type, flags, order) {
                return this._addField(name, field_type, flags, order, false);
            },

            deleteField: function (field) {
                var _field = null;
                if ((typeof field === "string") || (typeof field === "number"))
                    _field = this.getField(field);
                else
                    if (field instanceof MetaModelField)
                        _field = field
                    else
                        throw new Error("MetaModel::deleteField: Invalid argument type.");
                if (_field) {
                    if ((_field.flags() & (Meta.Field.Internal | Meta.Field.System)) !== 0)
                        throw new Error("Can't delete \"Internal\" or \"System\" field.");
                    this._fieldsCol._del(_field);
                };
            },

            getField: function (field) {
                var res;
                if (typeof field === "string") {
                    res = this._fields[this._fieldsByName[field]];
                } else
                    if (typeof field === "number") {
                        if ((field >= 0) && (field < this._fields.length))
                            res = this._fields[field];
                    };
                return res;
            },

            getClassField: function (field) {
                this._buildClassFldDict();

                var res;
                if (typeof field === "string") {
                    res = this._classFields[this._classFieldsByName[field]].field;
                } else
                    if (typeof field === "number") {
                        if ((field >= 0) && (field < this._classFields.length))
                            res = this._classFields[field].field;
                    };
                return res;
            },

            getResElemByName: function (name) {
                return this.getField(name);
            },

            fields: function () {
                return this._fields;
            },

            fieldsCount: function () {
                return this._fields.length;
            },

            outgoingLinks: function () {
                return this._metaDataMgr.outgoingLinks(this);
            },

            getBaseModel: function () {
                var ancestors = this.getAncestors();
                var res = this;
                if (ancestors.length > 0)
                    res = ancestors[0];
                return res;
            },

            outgoingClassLinks: function () {
                this._buildClassFldDict();
                if (!this._outgoingClassLinks) {
                    var ancestors = this.getAncestors().concat();
                    ancestors.push(this);
                    var res = this._outgoingClassLinks = {};
                    var self = this;
                    ancestors.forEach(function (model) {
                        var links = self._metaDataMgr.outgoingLinks(model);
                        links = links[model.name()];
                        var keys = Object.keys(links);
                        for (var i = 0; i < keys.length; i++) {
                            if (self._classFieldsByName[keys[i]]) {
                                res[keys[i]] = links[keys[i]];
                            };
                        };
                    });
                }
                return this._outgoingClassLinks;
            },

            _setActualTypeId: function (value) {
                this._actTypeId = value;
            },

            _buildClassFldDict: function () {
                this._metaDataMgr._rebuildClassFields();
                if (!this._classFieldsByName) {
                    this._classFieldsByName = {};
                    for (var i = 0; i < this._classFields.length; i++)
                        this._classFieldsByName[this._classFields[i].field.name()] = i;
                }
            },

            _addField: function (name, field_type, flags, order, is_internal) {
                if (name && field_type) {
                    var params = {
                        ini: {
                            fields: {
                                ResElemName: name,
                                FieldType: field_type,
                                Order: (typeof order === "number") ? order : this._fields.length,
                                Flags: (is_internal ? Meta.Field.Internal : 0) | ((flags | 0) & Meta.Field.System),
                            }
                        },
                        parent: this,
                        colName: "Fields"
                    };
                    var field = new MetaModelField(this.getDB(), params);

                    try {
                        field.flags(flags ? (flags | 0) : 0);
                    } catch (e) {
                        this.deleteField(field);
                        throw e;
                    };

                    return this;

                } else
                    throw new Error("Field name (or type) is undefined.");
            },

            _getOnFieldFlagsChangeProc: function (fieldObj) {
                var self = this;
                var oldFlags = fieldObj.flags();

                return function (args) {
                    var fieldName = fieldObj.name();
                    var flags = fieldObj.flags();

                    if ((flags & Meta.Field.PrimaryKey) !== 0) {

                        if (self.isVirtual()) {
                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Virtual model can't have Primary Key.");
                        };

                        if (self._primaryKey && (self._primaryKey !== fieldObj)) {

                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Primary key \"" + fieldName + "\" is already defined as \"" + self._primaryKey.name() + "\".");
                        };
                        self._primaryKey = fieldObj;
                        var fieldType = fieldObj.fieldType();
                        if (fieldType.allowNull()) {
                            var newType = fieldType.serialize();
                            newType.allowNull = false;
                            fieldObj.fieldType(newType);
                        };
                    };

                    if ((flags & Meta.Field.RowVersion) !== 0) {

                        if (self.isVirtual()) {
                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Virtual model can't have Row Version field.");
                        };

                        if (self._rowVersion && (self._rowVersion !== fieldObj)) {

                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Row version field \"" + fieldName + "\" is already defined as \"" + self._rowVersion.name() + "\".");
                        };
                        self._rowVersion = fieldObj;
                        var fieldType = fieldObj.fieldType();
                        if (fieldType.allowNull()) {
                            var newType = fieldType.serialize();
                            newType.allowNull = false;
                            fieldObj.fieldType(newType);
                        };
                    };

                    if ((flags & Meta.Field.Guid) !== 0) {

                        if (self.isVirtual()) {
                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Virtual model can't have Guid field.");
                        };

                        if (self._guidField && (self._guidField !== fieldObj)) {

                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Guid field \"" + fieldName + "\" is already defined as \"" + self._guidField.name() + "\".");
                        };
                        self._guidField = fieldObj;
                        var fieldType = fieldObj.fieldType();
                        if (fieldType.allowNull()) {
                            var newType = fieldType.serialize();
                            newType.allowNull = false;
                            fieldObj.fieldType(newType);
                        };
                    };

                    if ((flags & Meta.Field.TypeId) !== 0) {

                        if (self.isVirtual()) {
                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Virtual model can't have TypeId field.");
                        };

                        if (self._typeId && (self._typeId !== fieldObj)) {

                            fieldObj.set("Flags", oldFlags);
                            throw new Error("TypeId field \"" + fieldName + "\" is already defined as \"" + self._typeId.name() + "\".");
                        };
                        if (self._parentRef) {

                            fieldObj.set("Flags", oldFlags);
                            throw new Error("TypeId field can be defined only in Base model class.");
                        };
                        self._typeId = fieldObj;
                        var fieldType = fieldObj.fieldType();
                        if (fieldType.allowNull()) {
                            var newType = fieldType.serialize();
                            newType.allowNull = false;
                            fieldObj.fieldType(newType);
                        };
                    };

                    if ((flags & Meta.Field.ParentRef) !== 0) {

                        if (self.isVirtual()) {
                            fieldObj.set("Flags", oldFlags);
                            throw new Error("Virtual model can't have ParentRef field.");
                        };

                        if (self._parentRef && (self._parentRef !== fieldObj)) {

                            fieldObj.set("Flags", oldFlags);
                            throw new Error("ParentRef field \"" + fieldName + "\" is already defined as \"" + self._parentRef.name() + "\".");
                        };
                        self._parentRef = fieldObj;
                        var fieldType = fieldObj.fieldType();
                        if (fieldType.allowNull()) {
                            var newType = fieldType.serialize();
                            newType.allowNull = false;
                            fieldObj.fieldType(newType);
                        };
                    };

                    oldFlags = flags;

                    self.fire({
                        type: "modelModified",
                        target: self
                    });

                };
            },

            _getOnFieldOrderChangeProc: function (fieldObj) {
                var self = this;
                var oldOrder = fieldObj.order();

                return function (args) {
                    var fieldName = fieldObj.name();
                    var order = fieldObj.order();

                    if (this._orderChangCounter > 0) {
                        oldOrder = order;
                        return;
                    };
                    this._orderChangCounter++;
                    try {
                        if ((order < 0) || (order >= self._fields.length)) {
                            fieldObj.set("Order", oldOrder);
                            throw new Error("Invalid order (" + order + ") of field \"" + fieldName + "\".");
                        };
                        self._fieldsByName[fieldName] = order;
                        self._fields.splice(oldOrder, 1);
                        self._fields.splice(order, 0, fieldObj);
                        self._reindexFields();

                        oldOrder = order;

                        self.fire({
                            type: "modelModified",
                            target: self
                        });
                    } catch (e) {
                        throw e;
                    } finally {
                        this._orderChangCounter--;
                    };
                };
            },

            _getOnFieldTypeChangeProc: function (fieldObj) {
                var self = this;
                var oldFieldType = fieldObj.fieldType();

                return function (args) {
                    var fieldName = fieldObj.name();
                    var fieldType = fieldObj.fieldType();
                    var flags = fieldObj.flags();

                    if (((flags & Meta.Field.PrimaryKey) !== 0) && fieldType.allowNull()) {
                        fieldObj.set("FieldType", oldFieldType);
                        throw new Error("Primary key \"" + fieldName + "\" doesn't allow NULLs.");
                    };

                    if (((flags & Meta.Field.RowVersion) !== 0) && fieldType.allowNull()) {
                        fieldObj.set("FieldType", oldFieldType);
                        throw new Error("Row version field \"" + fieldName + "\" doesn't allow NULLs.");
                    };

                    if (oldFieldType instanceof MemMetaType.DataRefType) {
                        self.fire({
                            type: "removeLink",
                            target: self,
                            fieldName: fieldName
                        });
                    };

                    self._addLinkIfRef(fieldObj);

                    self.fire({
                        type: "modelModified",
                        target: self
                    });
                    oldFieldType = fieldType;
                };
            },

            _getOnFieldNameChangeProc: function (fieldObj) {
                var self = this;
                var oldFieldName = fieldObj.name();

                return function (args) {
                    var fieldType = fieldObj.fieldType();
                    var fieldName = fieldObj.name();

                    if (fieldName !== oldFieldName) {

                        if (self._fieldsByName[fieldName] !== undefined) {
                            fieldObj.set("ResElemName", oldFieldName);
                            throw new Error("Can't change field name from \"" +
                                oldFieldName + "\" to \"" + fieldName + "\". Field \"" + fieldName + "\" is already defined.");
                        };

                        var order = self._fieldsByName[oldFieldName];
                        delete self._fieldsByName[oldFieldName];
                        self._fieldsByName[fieldName] = order;

                        if (fieldType instanceof MemMetaType.DataRefType) {
                            self.fire({
                                type: "removeLink",
                                target: self,
                                fieldName: oldFieldName
                            });
                            self._addLinkIfRef(fieldObj);
                        };
                        self.fire({
                            type: "modelModified",
                            target: self
                        });

                        oldFieldName = fieldName;
                    };
                };
            },

            _reindexFields: function () {
                this._orderChangCounter++;
                for (var i = 0; i < this._fields.length; i++) {
                    this._fieldsByName[this._fields[i].name()] = i;
                    this._fields[i].set("Order", i);
                };
                this._orderChangCounter--;
            },

            _addLinkIfRef: function (field) {
                var res = false;
                var fieldType = field.fieldType();
                if (fieldType instanceof MemMetaType.DataRefType) {
                    this.fire({
                        type: "addLink",
                        target: this,
                        fieldName: field.name(),
                        link: fieldType
                    });
                    res = true;
                };
                return res;
            },

            _onAddField: function (args) {
                var field = args.obj;
                var name = field.get("ResElemName");
                var order = field.get("Order");
                var flags = field.get("Flags");
                if (order === undefined)
                    order = this._fields.length;

                if (this._fieldsByName[name] !== undefined) {
                    this._fieldsCol._del(field);
                    throw new Error("Field \"" + name + "\" is already defined.");
                };
                if ((order < 0) || (order > this._fields.length)) {
                    this._fieldsCol._del(field);
                    throw new Error("Invalid field \"" + name + "\" order: " + order + " .");
                };
                if ((flags & Meta.Field.PrimaryKey) !== 0) {
                    if (this.isVirtual()) {
                        this._fieldsCol._del(field);
                        throw new Error("Virtual model can't have Primary key field.");
                    };
                    if (this._primaryKey && (this._primaryKey !== field)) {
                        this._fieldsCol._del(field);
                        throw new Error("Primary key \"" + name + "\" is already defined as \"" + this._primaryKey.name() + "\".");
                    };
                    this._primaryKey = field;
                };
                if ((flags & Meta.Field.RowVersion) !== 0) {
                    if (this.isVirtual()) {
                        this._fieldsCol._del(field);
                        throw new Error("Virtual model can't have Row version field.");
                    };
                    if (this._rowVersion && (this._rowVersion !== field)) {
                        this._fieldsCol._del(field);
                        throw new Error("Row version field \"" + name + "\" is already defined as \"" + this._rowVersion.name() + "\".");
                    };
                    this._rowVersion = field;
                };
                if ((flags & Meta.Field.Guid) !== 0) {
                    if (this.isVirtual()) {
                        this._fieldsCol._del(field);
                        throw new Error("Virtual model can't have Guid field.");
                    };
                    if (this._guidField && (this._guidField !== field)) {
                        this._fieldsCol._del(field);
                        throw new Error("Guid field \"" + name + "\" is already defined as \"" + this._guidField.name() + "\".");
                    };
                    this._guidField = field;
                };
                if ((flags & Meta.Field.TypeId) !== 0) {
                    if (this.isVirtual()) {
                        this._fieldsCol._del(field);
                        throw new Error("Virtual model can't have TypeId field.");
                    };
                    if (this._typeId && (this._typeId !== field)) {
                        this._fieldsCol._del(field);
                        throw new Error("TypeId field \"" + name + "\" is already defined as \"" + this._typeId.name() + "\".");
                    };
                    this._typeId = field;
                };
                if ((flags & Meta.Field.ParentRef) !== 0) {
                    if (this.isVirtual()) {
                        this._fieldsCol._del(field);
                        throw new Error("Virtual model can't have ParentRef field.");
                    };
                    if (this._parentRef && (this._parentRef !== field)) {
                        this._fieldsCol._del(field);
                        throw new Error("ParentRef field \"" + name + "\" is already defined as \"" + this._parentRef.name() + "\".");
                    };
                    this._parentRef = field;
                };

                this._fields.splice(order, 0, field);
                this._reindexFields();
                this._addLinkIfRef(field);

                field.handlers = [];

                var handler = {
                    type: 'mod%ResElemName',
                    subscriber: this,
                    callback: this._getOnFieldNameChangeProc(field)
                };
                field.event.on(handler);
                field.handlers.push(handler);

                handler = {
                    type: 'mod%FieldType',
                    subscriber: this,
                    callback: this._getOnFieldTypeChangeProc(field)
                };
                field.event.on(handler);
                field.handlers.push(handler);

                handler = {
                    type: 'mod%Order',
                    subscriber: this,
                    callback: this._getOnFieldOrderChangeProc(field)
                };
                field.event.on(handler);
                field.handlers.push(handler);

                handler = {
                    type: 'mod%Flags',
                    subscriber: this,
                    callback: this._getOnFieldFlagsChangeProc(field)
                };
                field.event.on(handler);
                field.handlers.push(handler);
                this.fire({
                    type: "modelModified",
                    target: this
                });
            },

            _onDeleteField: function (args) {
                var field = args.obj;
                var name = field.get("ResElemName");
                var idx = this._fieldsByName[name];
                var is_duplicate_name = false;
                if (typeof idx === "number") {
                    if ((idx >= 0) && (idx < this._fields.length)) {
                        is_duplicate_name = !(this._fields[idx] === field);
                        if (!is_duplicate_name) {
                            this._fields.splice(idx, 1);
                            delete this._fieldsByName[name];
                            this._reindexFields();
                        };
                    };
                };

                if (!is_duplicate_name) {
                    if (this._primaryKey === field)
                        this._primaryKey = null;

                    if (this._rowVersion === field)
                        this._rowVersion = null;

                    if (this._guidField === field)
                        this._guidField = null;

                    if (this._typeId === field)
                        this._typeId = null;

                    if (this._parentRef === field)
                        this._parentRef = null;

                    var fieldType = field.fieldType();
                    if (fieldType instanceof MemMetaType.DataRefType) {
                        this.fire({
                            type: "removeLink",
                            target: this,
                            fieldName: name
                        });
                    };

                    for (var i = 0; i < field.handlers.length; i++)
                        field.event.off(field.handlers[i]);

                    this.fire({
                        type: "modelModified",
                        target: this
                    });
                };
            },

            _addRef: function (src_field, model_name, dst_model) {
                var ref = this._refs[src_field + "|" + model_name];
                var table_ref = {
                    guidInstanceRes: dst_model ? dst_model.getGuid() : null,
                    guidInstanceElem: dst_model ? dst_model.getGuid() : null
                };
                if (ref) {
                    ref.tableRef(table_ref);
                }
                else
                    new MetaLinkRef(this.getDB(), {
                        ini: {
                            fields: {
                                FieldName: src_field,
                                TableName: model_name,
                                TableRef: table_ref
                            }
                        },
                        parent: this,
                        colName: "Refs"
                    });
            },

            _deleteRef: function (src_field, model_name) {
                var ref = this._refs[src_field + "|" + model_name];
                if (ref)
                    this._refsCol._del(ref);
            },

            _onAddRef: function (args) {
                var ref = args.obj;
                var key = ref.fieldName() + "|" + ref.tableName();
                this._refs[key] = ref;
            },

            _onDeleteRef: function (args) {
                var field = args.obj;
                var ref = args.obj;
                var key = ref.fieldName() + "|" + ref.tableName();
                delete this._refs[key];
            }
        });

        return MetaModel;
    }
);