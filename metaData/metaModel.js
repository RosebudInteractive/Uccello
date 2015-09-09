if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaModelField', '../system/event', '../memDB/memMetaType'],
    function (UObject, MetaModelField, Event, MemMetaType) {
        var MetaModel = UObject.extend([new Event()], {

            className: "MetaModel",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModel,
            metaCols: [{ "cname": "Fields", "ctype": "MetaModelField" }],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "DataObjectGuid", ftype: "string" }
            ],

            init: function (cm, params) {
                this._fieldsByName = {};
                this._fields = [];

                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this.eventsInit();  // WARNING !!! This line is essential !!! It initializes "Event" mixin.

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
                };
            },

            addField: function (name, field_type, order) {
                if (name && field_type) {
                    var params = {
                        ini: {
                            fields: {
                                Name: name,
                                FieldType: field_type,
                                Order: (typeof order === "number") ? order : this._fields.length
                            }
                        },
                        parent: this,
                        colName: "Fields"
                    };
                    new MetaModelField(this.getDB(), params);
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

            _getOnFieldTypeChangeProc: function (fieldObj) {
                var self = this;
                var oldFieldType = fieldObj._genericSetter("FieldType");

                return function (args) {
                    var fieldName = fieldObj._genericSetter("Name");
                    var fieldType = fieldObj._genericSetter("FieldType");

                    if (oldFieldType instanceof MemMetaType.DataRefType) {
                        self.fire({
                            type: "removeLink",
                            target: self,
                            fieldName: fieldName
                        });
                    };

                    if (fieldType instanceof MemMetaType.DataRefType) {
                        self.fire({
                            type: "addLink",
                            target: self,
                            fieldName: fieldName,
                            type: fieldType
                        });
                    };

                    oldFieldType = fieldType;
                };
            },

            _getOnFieldNameChangeProc: function (fieldObj) {
                var self = this;
                var oldFieldName = fieldObj._genericSetter("Name");

                return function (args) {
                    var fieldType = fieldObj._genericSetter("FieldType");
                    var fieldName = fieldObj._genericSetter("Name");

                    if (fieldName !== oldFieldName) {

                        if (self._fieldsByName[fieldName] !== undefined) {
                            fieldObj._genericSetter("Name", oldFieldName);
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
                        };
                        oldFieldName = fieldName;
                    };
                };
            },

            _onAddField: function (args) {
                var field = args.obj;
                var name = field.get("Name");
                var order = field.get("Order");
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
                this._fieldsByName[name] = order;
                this._fields.splice(order, 0, field);
                if (isNewOrder)
                    field.set("Order", order);

                var fieldType = field._genericSetter("FieldType");
                if (fieldType instanceof MemMetaType.DataRefType) {
                    this.fire({
                        type: "addLink",
                        target: this,
                        fieldName: name,
                        link: fieldType
                    });
                };

                field.event.on({
                    type: 'mod%Name',
                    subscriber: this,
                    callback: this._getOnFieldNameChangeProc(field)
                }).on({
                    type: 'mod%FieldType',
                    subscriber: this,
                    callback: this._getOnFieldTypeChangeProc(field)
                });
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
                };

                var fieldType = field._genericSetter("FieldType");
                if (fieldType instanceof MemMetaType.DataRefType) {
                    this.fire({
                        type: "removeLink",
                        target: this,
                        fieldName: name
                    });
                };

            }
        });
        return MetaModel;
    }
);