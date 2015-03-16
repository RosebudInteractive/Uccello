if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var Button = AControl.extend({

			className: "Button",
			classGuid: "af419748-7b25-1633-b0a9-d539cada8e0d",
            metaFields: [ {fname:"Caption",ftype:"string"} ],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param params
             */
            init: function(cm, params) {
                this._super(cm, params);
                this.params = params;
            },

			// Properties
            caption: function(value) {
                return this._genericSetter("Caption", value);
            }
        });
        return Button;
    }
);