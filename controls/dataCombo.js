if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aDataFieldControl'],
    function(ADataFieldControl) {
        var DataCombo = ADataFieldControl.extend({

            className: "DataCombo",
            classGuid: UCCELLO_CONFIG.classGuids.DataCombo,
            metaFields: [{ fname: "Values", ftype: "string" }],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },
            values: function(value) {
                return this._genericSetter("Values", value);
            }
        });
        return DataCombo;
    }
);