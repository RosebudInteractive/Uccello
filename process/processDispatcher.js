if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ["../system/utils"],
    function(Utils) {
        var ProcessDispatcher = UccelloClass.extend({

            init: function (params) {

                this._proxyWfe = params && params.proxyWfe ? params.proxyWfe : null;

                var globalObj = null;
                if (Utils.isNode())
                    globalObj = global;
                else
                    globalObj = window;

                if (globalObj) {
                    if (!globalObj.$process)
                        globalObj.$process = {};
                    globalObj.$process.processDispatcher = this;
                };
            }
        });
        return ProcessDispatcher;
    }
);