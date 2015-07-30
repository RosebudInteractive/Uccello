if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {
        var ProcessObject = UObject.extend({

            className: "ProcessObject",
            classGuid: UCCELLO_CONFIG.classGuids.ProcessObject,
            metaCols: [],
            metaFields: [
                { fname: "CurrentProcess", ftype: "string" }
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            currentProcess: function (value) {
                return this._genericSetter("CurrentProcess", value);
            }
        });
        return ProcessObject;
    }
);