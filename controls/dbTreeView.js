if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/treeView'],
    function(TreeView) {
        var DbTreeView = TreeView.extend({

            className: "DbTreeView",
            classGuid: UCCELLO_CONFIG.classGuids.DbTreeView,
            metaFields: [
                // [OneWay | null] - при перемещении по дереву устанавливается курсор в датасете,
                // [TwoWays] - при перемещении по датасету у дерева устанавливается курсор тоже
                {fname:"CursorSyncMode", ftype:"string"}
            ],
            metaCols: [{"cname": "Datasets", "ctype": "DbTreeViewItemType"}],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
                if (params===undefined) return;
                this.getCol("Datasets").on({
                    type: "add",
                    subscriber: this,
                    callback: this._onDirtyRender
                });
            },

            сursorSyncMode: function(value) {
                return this._genericSetter("CursorSyncMode", value);
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {
                viewset.render.apply(this, [options]);
            }
        });
        return DbTreeView;
    }
);