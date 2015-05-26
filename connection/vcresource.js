if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль ресурсов контекста
 * @module Vcresource
 */
define(
    ['../controls/aComponent'],
    function(AComponent) {

        var Vcresource = AComponent.extend(/** @lends module:Vcresource.Vcresource.prototype */{

            className: "Vcresource",
            classGuid: UCCELLO_CONFIG.classGuids.Vcresource,
            metaFields: [{fname:"Title", ftype:"string"},{fname:"ResGuid", ftype:"string"}],
            metaCols: [],

            /**
             * Инициализация объекта
             * @constructs
             * @param cm {object}
             * @param params {object}
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            title: function (value) {
                return this._genericSetter("Title", value);
            },

            resGuid: function (value) {
                return this._genericSetter("ResGuid", value);
            }
        });

        return Vcresource;
    });