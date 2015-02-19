if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль утилит
 * @module Utils
 */
define(function() {

    var Utils = Class.extend(/** @lends module:Utils.Utils.prototype */{

        /**
         * Сгенерировать guid
         * @returns {string}
         */
        guid: function () {

            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            };

            return s4() + s4() +'-'+ s4()  +'-'+ s4() +'-'+
                s4() +'-'+ s4() + s4() + s4();
        }
    });

    return Utils;
});