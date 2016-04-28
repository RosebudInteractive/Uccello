if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./processTreeRoot'],
    function (ProcessTreeRoot) {
        var ProcDataTreeRoot = ProcessTreeRoot.extend({

            className: "ProcDataTreeRoot",
            classGuid: UCCELLO_CONFIG.classGuids.ProcDataTreeRoot,
            metaFields: [],
            metaCols: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            getAdapter: function () {
                return "processData";
            },

            canEdit: function () {
                return false;
            },

            _getParamsTemplate: function () {
                return {
                    "ProcessId": { type: "int" }
                };
            }
        });

        return ProcDataTreeRoot;
    }
);