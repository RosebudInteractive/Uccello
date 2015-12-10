if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaDefs'],
    function (UObject, Meta) {
        var MetaLinkRef = UObject.extend({

            className: "MetaLinkRef",
            classGuid: UCCELLO_CONFIG.classGuids.MetaLinkRef,
            metaCols: [],
            metaFields: [
                { fname: "FieldName", ftype: "string" },
                { fname: "TableName", ftype: "string" },
                {
                    fname: "TableRef", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.MetaModel,
                        res_elem_type: UCCELLO_CONFIG.classGuids.MetaModel
                    }
                }
            ],

            fieldName: function (value) {
                return this._genericSetter("FieldName", value);
            },

            tableName: function (value) {
                return this._genericSetter("TableName", value);
            },

            tableRef: function (value) {
                return this._genericSetter("TableRef", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return MetaLinkRef;
    }
);