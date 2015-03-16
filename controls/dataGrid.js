if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aDataControl'],
    function(ADataControl) {
        var DataGrid = ADataControl.extend({

            className: "DataGrid",
            classGuid: "ff7830e2-7add-e65e-7ddf-caba8992d6d8",
            metaFields: [ ],
            metaCols: [ {"cname": "Columns", "ctype": "DataColumn"}],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                this._super(cm,params);
                this.params = params;
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {

                // проверяем ширины столбцов
                var columns = this.getObj().getCol('Columns');
                if (columns) {
                    var modified = false;
                    for (var i = 0, len = columns.count(); i < len; i++) {
                        var column = columns.get(i);
                        if (column.isFldModified("width")) {
                            modified = true;
                            viewset.renderWidth.apply(this, [i, column.get('Width')]);
                        }
                    }
                    if (modified)
                        return;
                }

                // если надо лишь передвинуть курсор
                if (this.isOnlyCursor()) {
                    viewset.renderCursor.apply(this, [this.getControlMgr().getByGuid(this.dataset()).cursor()]);
                    return;
                }


                // рендерим DOM
                viewset.render.apply(this, [options]);

                // доп. действия
                if (this.dataset()) {
                    this.pvt.renderDataVer = this.getControlMgr().getByGuid(this.dataset()).getDataVer();
                }
            },

            /**
             * Нужно перерендерить только курсор
             * @returns {boolean}
             */
            isOnlyCursor: function() {
                if (this.dataset()) {
                    var dataset = this.getControlMgr().getByGuid(this.dataset());

                    if ((this.pvt.renderDataVer == dataset.getDataVer()) && (!dataset.isDataModified()))
                        return true;
                    else
                        return false;
                }
                else return false;
            }

    });
        return DataGrid;
    }
);