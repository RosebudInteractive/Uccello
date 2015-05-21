if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
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
                UccelloClass.super.apply(this, [cm, params]);
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