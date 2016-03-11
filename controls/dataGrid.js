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
            metaFields: [ { fname: "Editable", ftype: "boolean" } ],
            metaCols: [ {"cname": "Columns", "ctype": "DataColumn"}],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.pvt.editMode = false;
				this.initRender();
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {
				if (this.getControlMgr().getInitRender()) {
					 viewset.render.apply(this, [options]);
					 return;
				}

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
                if (this.isOnlyCursor() && !this.editable()) {
                    viewset.renderCursor.apply(this, [this.dataset().cursor()]);
                    return;
                }

                // если только фокус
                if  (this.isOnlyFocus()) {
                    if (this.getForm().currentControl() == this)
                        viewset.setFocus.apply(this);
                    return;
                }

                // если передвинули курсор + фокус
                if (this.isCursorFocus()) {
                    if (this.getForm().currentControl() == this)
                        viewset.setFocus.apply(this);
                    viewset.renderCursor.apply(this, [this.dataset().cursor()]);
                    return;
                }

                // рендерим DOM
                viewset.render.apply(this, [options]);
            },

            /**
             * Нужно перерендерить только курсор
             * @returns {boolean}
             */
            isOnlyCursor: function() {
                if (this.dataset()) {
                    var ds = this.dataset();
					if  (!ds.isDataSourceModified() &&
                         ds.isFldModified("Cursor") &&
                         !this.isDataModified() &&
                         !this.getForm().isFldModified("CurrentControl"))
                        return true;
                    else
                        return false;
                }
                else return false;
            },

            /**
             * Нужно перерендерить только фокус
             * @returns {boolean}
             */
            isOnlyFocus: function() {
                var ds = this.dataset();
                if (ds) {
					if  (!ds.isDataSourceModified() &&
                        !ds.isFldModified("Cursor") &&
                        !this.isDataModified() &&
                        this.getRoot().isFldModified("CurrentControl"))
                        return true;
                    else
                        return false;
                }
                else return false;
            },

              /**
             * Нужно перерендерить  курсор+фокус
             * @returns {boolean}
             */
            isCursorFocus: function() {
                  var ds = this.dataset();
                  if (ds) {
					if  (!ds.isDataSourceModified() && !this.isDataModified())
                        return true;
                    else
                        return false;
                }
                else return false;
            },


            editable: function(value) {
                return this._genericSetter("Editable", value);
            },

            canMoveCursor: function(ds) {
                ds = ds || this.dataset();
                var result = ds && ds.canMoveCursor();
                if (result) {
                    var details = this._getDetailDatasets(ds);
                    for (var i = 0; (i < details.length && result); i++) {
                        result = result && details[i].canMoveCursor();
                        result = result && this.canMoveCursor(details[i]);
                    }
                }
                return result;
            },

            _getDetailDatasets: function(ds) {
                ds = ds || this.dataset();
                var result = [];
                if (ds) {
                    var model = ds.getParentComp();
                    var datasets = model.getCol("Datasets");
                    for (var i = 0; i < datasets.count(); i++) {
                        if (datasets.get(i).master() == ds) result.push(datasets.get(i));
                    }
                }
                return result;
            }
    });
        return DataGrid;
    }
);