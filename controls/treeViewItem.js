if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var TreeViewItem = AComponent.extend({

            className: "TreeViewItem",
            classGuid: UCCELLO_CONFIG.classGuids.TreeViewItem,
            metaCols: [],
            metaFields: [
                {fname: "Parent", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.TreeViewItem
                }},
                {fname:"Kind",ftype:"string"} // item | coll
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);

            },

            parent: function (value) {
                return this._genericSetter("Parent", value);
            },

            kind: function (value) {
                return this._genericSetter("Kind", value);
            },

            _onDirtyRender: function(result) {
                this.getParent()._isRendered(false);
                this.pvt.isRendered = false;
            }
        });
        return TreeViewItem;
    }
);