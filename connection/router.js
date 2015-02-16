if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль роутинга сообщений
 * @module Router
 */
define(['../system/event'], function(event) {

    var Router = Class.extend(/** @lends module:Router.Router.prototype */{

        /**
         * Инициализация объекта
         * @constructs
         */
        init: function () {
            this.event = new event(this);
            this._actions = {};
        },

        /**
         * Добавить обработчик сообщения
         * @param action
         * @param func
         */
        add: function(action, func) {
            this._actions[action] = func;
        },

        /**
         * Получить обработчик
         * @param action
         */
        get: function(action) {
            return this._actions[action];
        },

        /**
         * Выполнить обработчик
         * @param action
         */
        exec: function(data, done) {
            if (this._actions[data.action])
                return this._actions[data.action](data, done);
            return null;
        }

    });

    return Router;
});