if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./processTreeRoot'],
    function (ProcessTreeRoot) {
        var RequestTreeRoot = ProcessTreeRoot.extend({

            className: "RequestTreeRoot",
            classGuid: UCCELLO_CONFIG.classGuids.RequestTreeRoot,
            metaFields: [],
            metaCols: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            getAdapter: function () {
                return "requestData";
            },


            save: function (is_cached_upd, options, cb) {
                function localCallback(result) {
                    var res = result;
                    if (result.result === "OK") {
                    };
                    if(cb)
                        setTimeout(function () {
                            cb(res);
                        }, 0);
                };
                UccelloClass.super.apply(this, [is_cached_upd, options, localCallback]);
            },

            _getParamsTemplate: function () {
                return {
                    "RequestId": { type: "int" }
                };
            }
        });

        return RequestTreeRoot;
    }
);