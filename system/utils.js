/**
* Модуль утилит
* @module Utils
*/
var Utils = {};

/**
 * Сгенерировать guid
 * @returns {string}
 */
Utils.guid = function () {

    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    };

    return s4() + s4() +'-'+ s4()  +'-'+ s4() +'-'+
        s4() +'-'+ s4() + s4() + s4();
}

/**
 * Сгенерировать id
 * @returns {int}
 */
Utils.id = function () {
    return Math.floor(Math.random()*1000000);
}

/**
 * Определяет, работаем ли мы под Node.js
 *
 * @return {Boolean}
 */
Utils.isNode = function () {

    return typeof exports !== 'undefined' && this.exports !== exports;
}

if (typeof (module) === 'undefined')
    define([], function(){return Utils;});
else
    module.exports = Utils;


if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}