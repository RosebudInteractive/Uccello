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
                            if (typeHandlers[j].subscriber === handler.subscriber &&
                                typeHandlers[j].callback === handler.callback) {
                                typeHandlers.splice(j, 1);
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
                        if (typeHandler.subscriber === handler.subscriber &&
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
                    for (var i=0, len=handlers.length; i < len; i++){
                        var handler = handlers[i];
                        //try {
                            handler.callback.call(handler.subscriber, eventArgs);
                        /*}
                        catch (e) {
                            console.error(["ERROR executing fire:", handler, e]);
                            throw e;
                        }*/
                    }
                }
            },

            fire: function(eventArgs){
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