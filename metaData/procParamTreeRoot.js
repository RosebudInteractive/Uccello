if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./processTreeRoot'],
    function (ProcessTreeRoot) {
        var ProcParamTreeRoot = ProcessTreeRoot.extend({

            className: "ProcParamTreeRoot",
            classGuid: UCCELLO_CONFIG.classGuids.ProcParamTreeRoot,
            metaFields: [],
            metaCols: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            getAdapter: function () {
                return "processParams";
            },

            _getParamsTemplate: function () {
                return {
                    "ProcessDef": { type: "guid" }
                };
            }
        });

        return ProcParamTreeRoot;
    }
);