if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aDataFieldControl'],
    function(ADataFieldControl) {
        var DataEdit = ADataFieldControl.extend({

            className: "DataEdit",
            classGuid: UCCELLO_CONFIG.classGuids.DataEdit,
            metaFields: [
                {fname:"Multiline", ftype:"boolean"}
            ],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },

            multiline: function(value) {
                return this._genericSetter("Multiline", value);
            }
        });
        return DataEdit;
    }
);