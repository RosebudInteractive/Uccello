if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaModelField', './metaDefs', '../system/event', '../memDB/memMetaType'],
    function (UObject, MetaModelField, Meta, Event, MemMetaType) {
        var MetaModel = UObject.extend([new Event()], {

            className: "MetaModel",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModel,
            metaCols: [{ "cname": "Fields", "ctype": "MetaModelField" }],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "DataObjectGuid", ftype: "string" },
                { fname: "DataRootName", ftype: "string" },
                { fname: "DataRootGuid", ftype: "string" }
            ],

            name: function (value) {
                return this._genericSetter("Name", value);
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

            init: function (cm, params) {
                this._fieldsByName = {};
                this._fields = [];
                this._primaryKey = null;

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

                    this._dataObjectType = this.getParent()._dataObjectType;
                };
            },

            getPrimaryKey: function () {
                return this._primaryKey;
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

            _addField: function (name, field_type, flags, order, is_internal) {
                if (name && field_type) {
                    var params = {
                        ini: {
                            fields: {
                                Name: name,
                                FieldType: field_type,
                                Order: (typeof order === "number") ? order : this._fields.length,
                                Flags: is_internal ? Meta.Field.Internal : 0,
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

            deleteField: function (field) {
                if ((typeof field === "string") || (typeof field === "number")) {
                    var _field = this.getField(field);
                    if (_field)
                        this._fieldsCol._del(_field);
                } else
                    if (field instanceof MetaModelField) {
                        this._fieldsCol._del(field);
                    } else
                        throw new Error("MetaModel::deleteField: Invalid argument type.");
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

            fields: function () {
                return this._fields;
            },

            fieldsCount: function () {
                return this._fields.length;
            },

            _getOnFieldFlagsChangeProc: function (fieldObj) {
                var self = this;
                var oldFlags = fieldObj.flags();

                return function (args) {
                    var fieldName = fieldObj.name();
                    var flags = fieldObj.flags();

                    if ((flags & Meta.Field.PrimaryKey) !== 0) {

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
                };
            },

            _getOnFieldTypeChangeProc: function (fieldObj) {
                var self = this;
                var oldFieldType = fieldObj.fieldType();

                return function (args) {
                    var fieldName = fieldObj.name();
                    var fieldType = fieldObj.fieldType();
                    var flags = fieldObj.flags();
                    var isFired = false;

                    if (((flags & Meta.Field.PrimaryKey) !== 0) && fieldType.allowNull()) {
                        fieldObj.set("FieldType", oldFieldType);
                        throw new Error("Primary key \"" + fieldName + "\" can't allow NULL.");
                    };

                    if (oldFieldType instanceof MemMetaType.DataRefType) {
                        self.fire({
                            type: "removeLink",
                            target: self,
                            fieldName: fieldName
                        });
                        isFired = true;
                    };

                    if (fieldType instanceof MemMetaType.DataRefType) {
                        self.fire({
                            type: "addLink",
                            target: self,
                            fieldName: fieldName,
                            link: fieldType
                        });
                        isFired = true;
                    };
                    if (!isFired)
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
                            fieldObj.set("Name", oldFieldName);
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
                            self.fire({
                                type: "addLink",
                                target: self,
                                fieldName: fieldName,
                                link: fieldType
                            });
                        } else
                            self.fire({
                                type: "modelModified",
                                target: self
                            });

                        oldFieldName = fieldName;
                    };
                };
            },

            _reindexFields: function () {
                for (var i = 0; i < this._fields.length; i++)
                    this._fieldsByName[this._fields[i].name()] = i;
            },

            _onAddField: function (args) {
                var field = args.obj;
                var name = field.get("Name");
                var order = field.get("Order");
                var flags = field.get("Flags");
                var isNewOrder = false;
                if (order === undefined) {
                    order = this._fields.length;
                    isNewOrder = true;
                }
                if (this._fieldsByName[name] !== undefined) {
                    this._fieldsCol._del(field);
                    throw new Error("Field \"" + name + "\" is already defined.");
                };
                if ((order < 0) || (order > this._fields.length)) {
                    this._fieldsCol._del(field);
                    throw new Error("Invalid field \"" + name + "\" order: " + order + " .");
                };
                if ((flags & Meta.Field.PrimaryKey) !== 0) {
                    if (this._primaryKey && (this._primaryKey !== field)) {
                        this._fieldsCol._del(field);
                        throw new Error("Primary key \"" + name + "\" is already defined as \"" + this._primaryKey.name() + "\".");
                    };
                    this._primaryKey = field;
                };

                this._fields.splice(order, 0, field);
                this._reindexFields();

                if (isNewOrder)
                    field.set("Order", order);

                var fieldType = field.fieldType();
                if (fieldType instanceof MemMetaType.DataRefType) {
                    this.fire({
                        type: "addLink",
                        target: this,
                        fieldName: name,
                        link: fieldType
                    });
                };

                field.handlers = [];

                var handler = {
                    type: 'mod%Name',
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
            },

            _onDeleteField: function (args) {
                var field = args.obj;
                var name = field.get("Name");
                var idx = this._fieldsByName[name];
                if (typeof idx === "number") {
                    if ((idx >= 0) && (idx < this._fields.length)) {
                        for (var i = idx + 1; i < this._fields.length; i++)
                            this._fields[i].set("Order", i - 1);
                        this._fields.splice(idx, 1);
                    }
                    delete this._fieldsByName[name];
                    this._reindexFields();
                };

                if (this._primaryKey === field)
                    this._primaryKey = null;

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
            }
        });

        return MetaModel;
    }
);