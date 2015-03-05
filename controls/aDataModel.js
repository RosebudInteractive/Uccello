if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var ADataModel = AComponent.extend({

            className: "ADataModel",
            classGuid: UCCELLO_CONFIG.classGuids.ADataModel,
            metaCols: [ {"cname": "Datasets", "ctype": "data"} ],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            }
        });
        return ADataModel;
    }
);