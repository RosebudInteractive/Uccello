if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var Button = AControl.extend({

			className: "Button",
			classGuid: UCCELLO_CONFIG.classGuids.Button,
            metaFields: [
                {fname:"Caption",ftype:"string"},
                {fname: "OnClick", ftype: "event"}
            ],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param params
             */
            init: function(cm, params) {
                this._super(cm, params);
                if (!params) return;
                if (this.get("OnClick"))
                    this.onClick = new Function(this.get("OnClick"));
            },

			// Properties
            caption: function(value) {
                return this._genericSetter("Caption", value);
            }
        });
        return Button;
    }
);