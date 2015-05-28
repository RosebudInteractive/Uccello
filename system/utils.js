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


if (typeof(module) === 'undefined')
    define([], function(){return Utils;});
else
    module.exports = Utils;