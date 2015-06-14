if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaModelField'],
    function (UObject, MetaModelField) {
        var MetaModel = UObject.extend({

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
            },

            _onDeleteField: function (args) {
                var model = args.obj;
                var name = model.get("Name");
                var idx = this._fieldsByName[name];
                if (typeof idx === "number") {
                    if ((idx >= 0) && (idx < this._fields.length)) {
                        for (var i = idx + 1; i < this._fields.length; i++)
                            this._fields[i].set("Order", i - 1);
                        this._fields.splice(idx, 1);
                    }
                    delete this._fieldsByName[name];
                };
            }
        });
        return MetaModel;
    }
);