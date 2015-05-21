if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var Label = AControl.extend({

            className: "Label",
            classGuid: UCCELLO_CONFIG.classGuids.Label,
            metaFields: [ {fname:"Label",ftype:"string"} ],

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
            label: function(value) {
                return this._genericSetter("Label", value);
            }
        });
        return Label;
    }
);