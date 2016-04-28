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


/**
 * Ограничения для коллекции, содержащей 1 или 0 элементов
 *
 * @param {String}  collection_name  имя коллекции
 * @param {String}  prop_name        имя поля объекта, где хранится ссылка на единственный элемент
 */
Utils.makeSingleItemCollection = function (collection_name, prop_name) {
    var self = this;
    function getOnBeforeAddItem() {
        return function (args) {
            if (args.target.count() > 0)
                throw new Error("Collection \"" + args.target.getName() + "\"can't contain more than 1 element!");
        };
    };
    function getOnAddItem() {
        return function (args) {
            self[prop_name] = args.obj;
        };
    };
    function getOnDelItem() {
        return function (args) {
            self[prop_name] = null;
        };
    };
    var collection = this.getCol(collection_name);
    collection.on({
        type: 'beforeAdd',
        subscriber: this,
        callback: getOnBeforeAddItem()
    }).on({
        type: 'add',
        subscriber: this,
        callback: getOnAddItem()
    }).on({
        type: 'del',
        subscriber: this,
        callback: getOnDelItem()
    });
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