if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aDataControl'],
    function(ADataControl) {
        var DataGrid = ADataControl.extend({

            className: "DataGrid",
            classGuid: UCCELLO_CONFIG.classGuids.DataGrid,
            metaFields: [ ],
            metaCols: [ {"cname": "Columns", "ctype": "DataColumn"}],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
				
				this.initRender();
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {

                // проверяем ширины столбцов
                //var columns = this.getObj().getCol('Columns');
				var columns = this.getCol('Columns');
                if (columns) {
                    var modified = false;
                    for (var i = 0, len = columns.count(); i < len; i++) {
                        var column = columns.get(i);
                        if (column.isFldModified("Width")) {
                            modified = true;
                            viewset.renderWidth.apply(this, [i, column.width()]);
                            if (modified)
                                return;
                        }
                    }
                }

                // если надо лишь передвинуть курсор
                if (this.isOnlyCursor()) {
                    viewset.renderCursor.apply(this, [this.dataset().cursor()]);
                    return;
                }

                // рендерим DOM
                viewset.render.apply(this, [options]);

                // доп. действия
                /*if (this.dataset()) {
                    this.pvt.renderDataVer = this.dataset().getDataVer();
                }*/
            },

            /**
             * Нужно перерендерить только курсор
             * @returns {boolean}
             */
            isOnlyCursor: function() {
                if (this.dataset()) {
                    var ds = this.dataset();
					if (/*(this.pvt.renderDataVer == ds.getDataVer()) &&*/ (!ds.isDataSourceModified()) && (ds.isFldModified("Cursor")) && (!this.isDataModified()))
                        return true;
                    else
                        return false;
                }
                else return false;
            },

			initRender: function() {
				//this.pvt.renderDataVer = undefined;
			}

    });
        return DataGrid;
    }
);