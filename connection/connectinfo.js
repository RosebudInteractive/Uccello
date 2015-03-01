if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль подключений
 * @module ConnectInfo
 */
define(
    ['../controls/aComponent'],
    function(AComponent) {

    var ConnectInfo = AComponent.extend(/** @lends module:ConnectInfo.ConnectInfo.prototype */{

        className: "ConnectInfo",
        classGuid: "42dbc6c0-f8e4-80a5-a95f-e43601cccc71",
        metaFields: [{fname:"Context", ftype:"string"}],
        metaCols: [],

        /**
         * Инициализация объекта
         * @constructs
         * @param cm
         * @param params {object} Параметры подлкючения
         */
        init: function(cm, params) {
            this._super(cm, params);
        },

        // Properties
        context: function(value) {
            return this._genericSetter("Context",value);
        }
    });

    return ConnectInfo;
});