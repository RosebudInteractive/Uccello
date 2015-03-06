if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}
define(
    ['../controls/aComponent'],
    function(AComponent) {
        var DataRoot = AComponent.extend({

            className: "DataRoot",
            classGuid: UCCELLO_CONFIG.classGuids.DataRoot,
            metaCols: [ {"cname": "DataElements", "ctype": "data"} ],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            }
        });
        return DataRoot;
    }
);