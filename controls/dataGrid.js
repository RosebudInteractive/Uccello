if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
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
                this._super(cm,params);
                this.params = params;
				
				this.initRender();
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {

                var dsModif = this.isDatasetModified();
                var objModif = this.isObjModified();
                var ds = this.getControlMgr().getByGuid(this.dataset());

                // Модифицированы и данные и объект
                if (dsModif && objModif) {
                    // рендерим полностью
                    viewset.render.apply(this, [options]);
                }

                // Изменены данные объекта
                if (!dsModif && objModif) {
                    // проверяем ширины столбцов
                    var columns = this.getObj().getCol('Columns');
                    if (columns) {
                        for (var i = 0, len = columns.count(); i < len; i++) {
                            var column = columns.get(i);
                            if (column.isFldModified("Width"))
                                viewset.renderWidth.apply(this, [i, column.get('Width')]);
                        }
                    }
                }

                // Данные датасета и объекта не изменились
                if (!dsModif && !objModif){
                    // если изменен курсор
                    if (ds.getObj().isFldModified("Cursor"))
                        viewset.renderCursor.apply(this, [ds.cursor()]);
                }

                // доп. действия
                if (this.dataset()) {
                    this.pvt.renderDataVer = this.getControlMgr().getByGuid(this.dataset()).getDataVer();
                }
            },

            /**
             * Проверяем на модификацию датасета
             * @returns {boolean}
             */
            isDatasetModified: function() {
                if (this.dataset()) {
                    var dataset = this.getControlMgr().getByGuid(this.dataset());
                    if (this.pvt.renderDataVer != dataset.getDataVer() || dataset.isDataModified())
                        return true;
                    else
                        return false;
                }
                else return false;
            },

            /**
             * Проверяем на модификацию объекта
             * @returns {boolean}
             */
            isObjModified: function() {
                if (this.dataset()) {
                    var dataset = this.getControlMgr().getByGuid(this.dataset());
					var mo = this.getObj();
                    if (this.pvt.renderDataVer != dataset.getDataVer() || mo.isDataModified())
                        return true;
                    else
                        return false;
                }
                else return false;
            },

            /**
             * Нужно перерендерить только курсор
             * @returns {boolean}
             */
            isOnlyCursor: function() {
                if (this.dataset()) {
                    var dataset = this.getControlMgr().getByGuid(this.dataset());
					var mo = this.getObj();
					//var f = ((mo.countModifiedFields()==1) && (mo.countModifiedCols()==0) && (mo.isFldModified("Cursor")));
                    if ((this.pvt.renderDataVer == dataset.getDataVer()) && (!dataset.isDataModified()) && (dataset.getObj().isFldModified("Cursor")) && (!mo.isDataModified()))
                        return true;
                    else
                        return false;
                }
                else return false;
            },

			initRender: function() {
				this.pvt.renderDataVer = undefined;
			}

    });
        return DataGrid;
    }
);