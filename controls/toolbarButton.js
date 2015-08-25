if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/button'],
    function(Button) {
        var GenToolbarButton = Button.extend({

            className: "GenToolbarButton",
            classGuid: UCCELLO_CONFIG.classGuids.ToolbarButton,
            metaFields: [
                {fname:"TabNumber",ftype:"int"}
            ],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param params
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },

            // Properties
            tabNumber: function(value) {
                return this._genericSetter("TabNumber", value);
            }

        });
        return GenToolbarButton;
    }
);