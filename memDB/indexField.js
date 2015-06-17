if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../system/uobject'],
    function(UObject) {
        var IndexField = UObject.extend({

            className: "IndexField",
            classGuid: UCCELLO_CONFIG.classGuids.IndexField,
            metaCols: [],
            metaFields: [
                {fname:"FieldName",ftype:"string"},
                {fname:"Ascendant",ftype:"boolean"}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },
            fieldName: function(value) {
                return this._genericSetter("FieldName", value);
            },
            ascendant: function(value) {
                return this._genericSetter("Ascendant", value);
            }


        });
        return IndexField;
    }
);