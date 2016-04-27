if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./paramTreeRoot'],
    function (ParamTreeRoot) {
        var ProcessTreeRoot = ParamTreeRoot.extend({

            className: "ProcessTreeRoot",
            classGuid: UCCELLO_CONFIG.classGuids.ProcessTreeRoot,
            metaFields: [],
            metaCols: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _adapterSaveOnMaster: function (options, cb) {
                var result = { result: "OK" };
                try {
                    if (!$processData)
                        throw new Error("ProcessTreeRoot::_adapterSaveOnMaster: $processData is not defined!");
                    var obj = this.getRootTreeElem().rootObj();
                    if (!obj)
                        throw new Error("ProcessTreeRoot::_adapterSaveOnMaster: Root Object is not defined!");
                    var opts = options || {};
                    opts.expr = this.getExpression();
                    $processData.saveData(this.getDB().serialize(obj, true), opts, cb);
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                };
                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            }
        });

        return ProcessTreeRoot;
    }
);