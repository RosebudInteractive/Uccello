if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
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
            UccelloClass.super.apply(this, [cm, params]);
        },

        // Properties
        context: function(value) {
            return this._genericSetter("Context",value);
        }
    });

    return ConnectInfo;
});