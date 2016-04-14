if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var DatasetBase = AComponent.extend({

            className: "DatasetBase",
            classGuid: UCCELLO_CONFIG.classGuids.DatasetBase,
            metaCols: [],
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return DatasetBase;
    }
);