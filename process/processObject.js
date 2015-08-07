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
                var result;
                var args = [];
                if (arguments.length >= 2) {
                    // ƒолжно быть как минимум 2 аргумента: им€ ф-ции и callback
                    //
                    var fname = arguments[0]; // им€ ф-ции
                    var callback = arguments[arguments.length - 1];

                    if (!this.isMaster()) {
                        for (var i = 1; i < (arguments.length - 1) ; i++)
                            args[i - 1] = arguments[i];
                        this.remoteCall(fname, args, callback);
                        return;
                    }
                    else {
                        for (var i = 1; i < arguments.length; i++)
                            args[i - 1] = arguments[i];
                        if ($process && $process.processDispatcher) {
                            result = $process.processDispatcher.methodCallResolver(this, fname, args);
                        }
                        else
                            result = this[csMethod_prefix + fname].apply(this, args);
                    };
                } else
                    throw new Error("ProcessObject: \"_methodCall\" should have at least 2 args.");

                return result;
            }

        });

        ProcessObject._methodPrefix = csMethod_prefix;

        return ProcessObject;
    }
);