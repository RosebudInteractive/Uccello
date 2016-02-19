if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль Event
 * handler имеет следующую структуру {subscriber: ссылка на подписчика, callback: обработчик}
 * @module Event
 */
define (
    function() {
        var Event = UccelloClass.extend({

            init: function() {
                this._eventsFireEnabled = true;
                this._eventHandlers = {};
                this._queueEvents = false;
                this._blockedEventsQueue = [];
            },

            eventsInit: function() {
                this._eventsFireEnabled = true;
                this._eventHandlers = {};
                this._queueEvents = false;
                this._blockedEventsQueue = [];
            },

            on: function (handlers) {
                if (!(this.isArray(handlers)))
                    handlers = [handlers];

                for (var i = 0, len = handlers.length; i < len; i++) {
                    var handler = handlers[i];
                    var eventName = handler.type;
                    if (!this._eventHandlers[eventName])
                        this._eventHandlers[eventName] = [];

                    if (!handler.subscriber || !handler.callback) {
                        return this;
                    }
                    if (!this._eventHandlerExists(handler)) {
                        //handler.id = calypso1.database.getNewLid();
                        this._eventHandlers[eventName].push(handler);
                    }
                };
                return this;
            },

            off: function (handlers) {
                if (!(this.isArray(handlers)))
                    handlers = [handlers];

                for (var i = 0, len = handlers.length; i < len; i++) {
                    var handler = handlers[i];
                    var eventName = handler.type;

                    if (!this._eventHandlers[eventName]) return;
                    else {
                        var typeHandlers = this._eventHandlers[eventName];
                        for (var j = 0, len2 = typeHandlers.length; j < len2; j++) {
                            if (typeHandlers[j] && typeHandlers[j].subscriber === handler.subscriber &&
                                typeHandlers[j].callback === handler.callback) {
                                //typeHandlers.splice(j, 1);
                                typeHandlers[j] = null;
                                break;
                            }
                        }
                    }
                };
                return this;
            },

            /**
             * Приватная функция. Проверяет наличие хендлера в списке подписчиков
             * @private
             */
            _eventHandlerExists: function (handler) {
                var eventName = handler.type;
                if (eventName in this._eventHandlers) {
                    var typeHandlers = this._eventHandlers[eventName];
                    for (var i= 0, len = typeHandlers.length; i < len; i++ ) {
                        var typeHandler = typeHandlers[i];
                        if (typeHandler && typeHandler.subscriber === handler.subscriber &&
                            typeHandler.callback === handler.callback) {
                            return true;
                        }
                    }
                }
                return false;
            },

            /**
             * Приватная функция генерации события, извне не вызывать
             * @param eventArgs - аргументы события
             * @private
             */
            _fire: function(eventArgs) {
                if (eventArgs.type in this._eventHandlers) {
                    var handlers = this._eventHandlers[eventArgs.type];
                    var has_deleted = false;
                    for (var i = 0, len = handlers.length; i < len; i++) {
                        var handler = handlers[i];
                        if (handler) {
                            //try {
                            handler.callback.call(handler.subscriber, eventArgs);
                            /*}
                            catch (e) {
                                console.error(["ERROR executing fire:", handler, e]);
                                throw e;
                            }*/
                        }
                        else
                            has_deleted = true;
                    };
                    if (has_deleted)
                        this._clearDeleted(handlers);
                }
            },

            /**
             * Приватная функция удаления пустых обработчиков, извне не вызывать
             * @param handlers - массив обработчиков, среди которых есть пустые
             * @private
             */
            _clearDeleted: function (handlers) {
                var i = 0
                var len = handlers.length;
                while (i < len) {
                    if (!handlers[i]) {
                        handlers.splice(i, 1);
                        len--;
                    }
                    else
                        i++;
                };
            },

            fire: function (eventArgs) {
                if (!eventArgs.target){
                    eventArgs.target = this;
                }

                if (!eventArgs.type)
                    return;

                if ((!this._eventsFireEnabled) &&  this._queueEvents) {
                    this._blockedEventsQueue.push(eventArgs)
                } else if (this._eventsFireEnabled) {
                    this._fire(eventArgs);
                }
            },

            /**
             * запрещает генерацию событий элемента
             * @param queueEvents - запоминать заблокированные события
             */
            beginInit: function (queueEvents) {
                if (this._eventsFireEnabled) {
                    this._eventsFireEnabled = false;
                    this._queueEvents = queueEvents;
                    // При первом вызове очищаем очередь, на случай, если она не пуста,
                    this._blockedEventsQueue = [];
                }
            },

            /**
             * Разрешает генерацию событий и генерит заблокированные события
             * Если в обработчиках возник exception, то оставшиеся события останутся в очереди и
             * их можно посмотреть в отладчике.
             */
            endInit: function () {
                this._eventsFireEnabled = true;
                for (var i = 0, len = this._blockedEventsQueue.length; i < len; i++) {
                    this._fire(this._blockedEventsQueue[i]);
                }
            },
            resetEventQueue: function () {
                this._blockedEventsQueue = [];
            },

            isArray:function (ar) {
                return ar instanceof Array
                    || Array.isArray(ar)
                    || (ar && ar !== Object.prototype && Array.isArray(ar.__proto__));
            }
        });

        return Event;
    }
);