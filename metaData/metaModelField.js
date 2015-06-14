if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {
        var MetaModelField = UObject.extend({

            className: "MetaModelField",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModelField,
            metaCols: [],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "FieldType", ftype: "datatype" },
                { fname: "Order", ftype: "int" }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return MetaModelField;
    }
);