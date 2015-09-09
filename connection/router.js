if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль роутинга сообщений
 * @module Router
 */
define(['../system/event'], function(event) {

    var Router = UccelloClass.extend(/** @lends module:Router.Router.prototype */{

        /**
         * Инициализация объекта
         * @constructs
         */
        init: function () {
            this.event = new event(this);
            this._actions = {};

            this.testCount = 0;
            this.testCountDelta = 0;
            this.testTime = 0;
            this.testTimeDelta = new Date();
            var that = this;
            setInterval(function () {
                var endTime = new Date();
                console.log('### LOADNEWROOTS: ' + that.testCount + ' items, time:' + that.testTime + 'мс, ' +
                    (that.testCount * 1000 / (endTime - that.testTimeDelta)).toFixed(2) + ' op/sec.');
                console.log('### SENDDELTA:    ' + that.testCountDelta + ' items, time:' + (endTime - that.testTimeDelta) + 'мс, ' +
                    (that.testCountDelta * 1000 / (endTime - that.testTimeDelta)).toFixed(2) + ' op/sec.');
                that.testCount = 0;
                that.testCountDelta = 0;
                that.testTimeDelta = endTime;
                that.testTime = 0;
            }, 60000);
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
                var that = this;
                var log = [Date.now(), data.action];
                var doneTime = function () {
                    log.push((Date.now() - log[0]));
                    log[0] = (new Date(log[0])).toISOString();

                    if (data.action == "remoteCall2") {
                        if (data.args.func == 'loadNewRoots') {
                            that.testCount++;
                            that.testTime += log[2];
                        }
                        log[1] = log[1] + ':' + data.args.func; //JSON.stringify(data.args);
                    }

                    if (data.action == 'sendDelta') {
                        that.testCountDelta++;
                        //that.testTime += log[2];
                    };
                   /* if (data.action != 'sendDelta')
                      logger.info(log.join(';'));*/
                    done.apply(this, arguments);
                };
                return this._actions[data.action](data, doneTime);
            }
            return null;
        }

    });

    return Router;
});