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
            if (this._actions[data.action]) {
                var log = [Date.now(), data.action];
                function doneTime() {
                    log.push((Date.now()-log[0])+' ms');
                    log[0] = (new Date(log[0])).toISOString();

                    if (data.action == "remoteCall2") {
                        log[1] = log[1]+':'+data.args.func; //JSON.stringify(data.args);
                    }

                    logger.info(log.join(';'));
                    done.apply(this, arguments);
                }
                return this._actions[data.action](data, doneTime);
            }
            return null;
        }

    });

    return Router;
});