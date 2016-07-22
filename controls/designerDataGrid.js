/**
 * Created by kiknadze on 22.07.2016.
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/dataGrid'],
    function(DataGrid) {
        var DesignerDataGrid = DataGrid.extend({

            className: "DesignerDataGrid",
            classGuid: UCCELLO_CONFIG.classGuids.DesignerDataGrid,

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return DesignerDataGrid;
    }
);
