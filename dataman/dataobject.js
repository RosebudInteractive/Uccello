if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../process/processObject'],
    function (ProcessObject) {
        var DataObject = ProcessObject.extend({

            className: "DataObject",
            classGuid: UCCELLO_CONFIG.classGuids.DataObject,
            metaCols: [],
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return DataObject;
    }
);