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
                {fname:"Kind",ftype:"string"}, // item | coll
                {fname: "Dataset", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.Dataset
                }},
                {fname:"Text",ftype:"string"},
                {fname:"ObjectId",ftype:"string"},
                {fname:"ObjectGuid",ftype:"string"},
                {fname:"IsOpen",ftype:"boolean"}
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

            dataset: function (value) {
                return this._genericSetter("Dataset", value);
            },

            text: function (value) {
                return this._genericSetter("Text", value);
            },

            objectId: function (value) {
                return this._genericSetter("ObjectId", value);
            },

            objectGuid: function (value) {
                return this._genericSetter("ObjectGuid", value);
            },

            isOpen: function (value) {
                return this._genericSetter("IsOpen", value);
            },

            _onDirtyRender: function(result) {
                this.getParent()._isRendered(false);
                this.pvt.isRendered = false;
            }
        });
        return TreeViewItem;
    }
);