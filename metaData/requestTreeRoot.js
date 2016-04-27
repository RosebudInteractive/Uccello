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

            _getParamsTemplate: function () {
                return {
                    "RequestId": { type: "int" }
                };
            }
        });

        return RequestTreeRoot;
    }
);