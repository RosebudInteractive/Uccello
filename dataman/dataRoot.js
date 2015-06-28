if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function(UObject) {
        var DataRoot = UObject.extend({

            className: "DataRoot",
            classGuid: UCCELLO_CONFIG.classGuids.DataRoot,
            metaCols: [{ "cname": "DataElements", "ctype": "DataObject" }],
            metaFields: [{fname:"dbgName",ftype:"string"}],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return DataRoot;
    }
);