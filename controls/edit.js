if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var Edit = AControl.extend({

            className: "Edit",
            classGuid: UCCELLO_CONFIG.classGuids.Edit,
            metaFields: [ {fname:"Value",ftype:"string"} ],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },

            // Properties
            value: function(value) {
                return this._genericSetter("Value", value);
            }
        });
        return Edit;
    }
);