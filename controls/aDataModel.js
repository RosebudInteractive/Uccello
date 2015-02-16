if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var ADataModel = AComponent.extend({

            className: "ADataModel",
            classGuid: "5e89f6c7-ccc2-a850-2f67-b5f5f20c3d47",
            metaCols: [ {"cname": "Datasets", "ctype": "data"} ],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            }
        });
        return ADataModel;
    }
);