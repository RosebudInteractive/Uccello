if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaDefs'],
    function (UObject, Meta) {
        var MetaModelRef = UObject.extend({

            className: "MetaModelRef",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModelRef,
            metaCols: [],
            metaFields: [
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
        return MetaModelRef;
    }
);