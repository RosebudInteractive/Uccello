if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aDataFieldControl'],
    function(ADataFieldControl) {
        var DataCheckbox = ADataFieldControl.extend({

            className: "DataCheckbox",
            classGuid: UCCELLO_CONFIG.classGuids.DataCheckbox,
            metaFields: [{ fname: "CheckValue", ftype: "string" },{ fname: "UncheckValue", ftype: "string" }],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },
            checkValue: function(value) {
                return this._genericSetter("CheckValue", value);
            },
            uncheckValue: function(value) {
                return this._genericSetter("UncheckValue", value);
            }
        });
        return DataCheckbox;
    }
);