if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaDefs'],
    function (UObject, Meta) {
        var MetaObjTreeElem = UObject.extend({

            className: "MetaObjTreeElem",
            classGuid: UCCELLO_CONFIG.classGuids.MetaObjTreeElem,
            metaFields: [
                { fname: "Alias", ftype: "string" },
                { fname: "TableName", ftype: "string" },
                { fname: "ParentFieldName", ftype: "string" }
            ],

            metaCols: [
                { "cname": "Childs", "ctype": "MetaObjTreeElem" }
            ],

            alias: function (value) {
                return this._genericSetter("Alias", value);
            },

            tableName: function (value) {
                return this._genericSetter("TableName", value);
            },

            parentFieldName: function (value) {
                return this._genericSetter("ParentFieldName", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return MetaObjTreeElem;
    }
);