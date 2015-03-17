if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
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
                this._super(cm, params);
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