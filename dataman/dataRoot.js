if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}
define(
    ['../controls/aComponent'],
    function(AComponent) {
        var DataRoot = AComponent.extend({

            className: "DataRoot",
            classGuid: "87510077-53d2-00b3-0032-f1245ab1b74d",
            metaCols: [ {"cname": "DataElements", "ctype": "data"} ],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            }
        });
        return DataRoot;
    }
);