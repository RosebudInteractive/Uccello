if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./memBsTreeModelRoot', './metaDefs'],
    function (MemBsTreeModelRoot, Meta) {
        var MemTreeModel = MemBsTreeModelRoot.extend({

            className: "MemTreeModel",
            classGuid: UCCELLO_CONFIG.classGuids.MemTreeModel,
            metaFields: [
                {
                    fname: "ParentCollection", ftype: "string"
                }
            ],

            parentCollection: function (value) {
                return this._genericSetter("ParentCollection", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _adapterSaveOnMaster: function (options, cb) {
                this.getRootTreeElem()._adapterSaveOnMaster(options, cb);
            },

        });
        return MemTreeModel;
    }
);