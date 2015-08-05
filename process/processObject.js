if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {

        var csMethod_prefix = "_$local_";

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
            },

            _methodCall: function () {
                var args = [];
                if (arguments.length >= 2) {
                    // ƒолжно быть как минимум 2 аргумента: им€ ф-ции и callback
                    //
                    var fname = arguments[0]; // им€ ф-ции
                    for (var i = 1; i < arguments.length; i++)
                        args[i] = arguments[i];
                    if ($process && $process.processDispatcher) {
                        $process.processDispatcher.methodCallResolver(this, fname, args);
                    }
                    else
                        this[csMethod_prefix + fname].apply(this, args);
                } else
                    throw new Error("ProcessObject: \"_methodCall\" should have at least 2 args.");
            }

        });

        ProcessObject._methodPrefix = csMethod_prefix;

        return ProcessObject;
    }
);