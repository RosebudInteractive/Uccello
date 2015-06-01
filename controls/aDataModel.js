if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var ADataModel = AComponent.extend({

            className: "ADataModel",
            classGuid: UCCELLO_CONFIG.classGuids.ADataModel,
            metaCols: [ {"cname": "Datasets", "ctype": "Dataset"} ],
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return ADataModel;
    }
);