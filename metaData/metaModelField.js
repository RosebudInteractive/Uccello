if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaDefs'],
    function (UObject, Meta) {
        var MetaModelField = UObject.extend({

            className: "MetaModelField",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModelField,
            metaCols: [],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "FieldType", ftype: "datatype" },
                { fname: "Order", ftype: "int" },
                { fname: "Flags", ftype: "int" }
            ],

            name: function (value) {
                return this._genericSetter("Name", value);
            },

            fieldType: function (value) {
                return this._genericSetter("FieldType", value);
            },

            order: function (value) {
                return this._genericSetter("Order", value);
            },

            flags: function (value) {

                var type = this._genericSetter("FieldType");
                if (((value & Meta.Field.AutoIncrement) !== 0) && (!type.canAutoIncrement)) {
                    var table_name = this.getParent().name();
                    var field_name = this.name();
                    throw new Error("Field \"" + field_name + "\" (\"" + table_name + "\") can't be auto-increment.");
                };

                return this._genericSetter("Flags", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return MetaModelField;
    }
);