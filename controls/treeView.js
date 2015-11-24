if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var TreeView = AControl.extend({

            className: "TreeView",
            classGuid: UCCELLO_CONFIG.classGuids.TreeView,
            metaFields: [
                {fname:"Cursor", ftype:{
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.TreeViewItem
                }}
            ],
            metaCols: [
                {"cname": "Items", "ctype": "TreeViewItem"}
            ],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
                if (params===undefined) return;
                this.getCol("Items").on({
                    type: "add",
                    subscriber: this,
                    callback: this._onDirtyRender
                });
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {
                viewset.render.apply(this, [options]);
            },

            cursor: function(value) {
                return this._genericSetter("Cursor", value);
            }
        });
        return TreeView;
    }
);