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
        classGuid: UCCELLO_CONFIG.classGuids.ConnectInfo,
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