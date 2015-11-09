if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var DbTreeViewItemType = AComponent.extend({

            className: "DbTreeViewItemType",
            classGuid: UCCELLO_CONFIG.classGuids.DbTreeViewItemType,
            metaCols: [],
            metaFields: [
                {fname: "Dataset", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.Dataset
                }},
                {fname: "Parent", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.Dataset
                }}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);

            },

            dataset: function (value) {
                return this._genericSetter("Dataset", value);
            },

            parent: function (value) {
                return this._genericSetter("Parent", value);
            },

            _onDirtyRender: function(result) {
                this.getParent()._isRendered(false);
                this.pvt.isRendered = false;
            }
        });
        return DbTreeViewItemType;
    }
);