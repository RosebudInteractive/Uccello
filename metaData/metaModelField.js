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
                if (value && ((this.flags() & (Meta.Field.Internal | Meta.Field.System)) !== 0))
                    throw new Error("Can't change name of \"Internal\" or \"System\" field.");
                return this._genericSetter("Name", value);
            },

            fieldType: function (value) {
                var oldVal = this._genericSetter("FieldType");
                var result = oldVal;
                if (value) {
                    if ((this.flags() & (Meta.Field.Internal | Meta.Field.System)) !== 0)
                        throw new Error("Can't change type of \"Internal\" or \"System\" field.");

                    result = this._genericSetter("FieldType", value);
                    var err = {};
                    if (!this._checkFlags(this.flags(), result, err)) {
                        this._genericSetter("FieldType", oldVal);
                        throw new Error(err.message);
                    };
                };
                return result;
            },

            order: function (value) {
                return this._genericSetter("Order", value);
            },

            flags: function (value) {
                if (value) {
                    var type = this._genericSetter("FieldType");
                    var err = {};

                    if (!this._checkFlags(value, type, err))
                        throw new Error(err.message);
                };
                return this._genericSetter("Flags", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _checkFlags: function (flags, type, err) {
                var result = true;
                var msg = "";
                var old_flags = this._genericSetter("Flags");
                if ((flags & (Meta.Field.Internal | Meta.Field.System)) !==
                    (old_flags & (Meta.Field.Internal | Meta.Field.System))) {
                    var field_name = this.name();
                    msg = "\"Internal\" or \"System\" flags of field \"" + field_name + "\" can't be changed.";
                    result = false;
                };

                if (result && ((flags & Meta.Field.AutoIncrement) !== 0) && (!type.canAutoIncrement)) {
                    var table_name = this.getParent().name();
                    var field_name = this.name();
                    msg = "Field \"" + field_name + "\" (\"" + type.serialize().type + "\") can't be auto-increment.";
                    result = false;
                };

                if (result && ((flags & Meta.Field.PrimaryKey) !== 0) && (!type.canAutoIncrement)) {
                    var table_name = this.getParent().name();
                    var field_name = this.name();
                    msg = "Field \"" + field_name + "\" (\"" + type.serialize().type + "\") can't be PRIMARY KEY.";
                    result = false;
                };

                if (result && ((flags & Meta.Field.RowVersion) !== 0) && (!type.isRowVersionType)) {
                    var table_name = this.getParent().name();
                    var field_name = this.name();
                    msg = "Field \"" + field_name + "\" (\"" + type.serialize().type + "\") can't be row version field.";
                    result = false;
                };

                if ((!result) && err)
                    err.message = msg;

                return result;
            }

        });
        return MetaModelField;
    }
);