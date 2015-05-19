if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}
define(
    ['../system/uobject'],
    function(UObject) {
        var DataObject = UObject.extend({

            className: "DataObject",
            classGuid: UCCELLO_CONFIG.classGuids.DataObject,
            metaCols: [],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            }
        });
        return DataObject;
    }
);