if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var Edit = AControl.extend({

            className: "Edit",
            classGuid: "f79d78eb-4315-5fac-06e0-d58d07572482",
            metaFields: [ {fname:"Value",ftype:"string"} ],

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
            value: function(value) {
                return this._genericSetter("Value", value);
            }
        });
        return Edit;
    }
);