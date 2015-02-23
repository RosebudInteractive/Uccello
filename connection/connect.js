if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль подключений
 * @module Connect
 */
define(
    ['../controls/aComponent', '../system/event'],
    function(AComponent, event) {

    var Connect = AComponent.extend(/** @lends module:Connect.Connect.prototype */{

        className: "Connect",
        classGuid: "66105954-4149-1491-1425-eac17fbe5a72",
        metaFields: [{fname:"Context", ftype:"string"}], //[ {fname:"Id", ftype:"int"} ],
        metaCols: [],

        /**
         * Инициализация объекта
         * @constructs
         * @param params {object} Параметры подлкючения
         */
        init: function(cm, params) {
            this._super(cm, params);

            if (params==undefined) return; // в этом режиме только создаем метаинфо
            this.event = new event(this);
            //this.id = params.id;
            this.ws = params.ws;
            //this.session = null;
            this.params = {
                connectTime: params.connectTime || Date.now(),
                userAgent: params.userAgent || '',
                numRequest: params.numRequest || 0,
                stateReady: params.stateReady || 0,
                lastPingTime: params.numRequest || null,
                pingCounter: params.pingCounter || 0
            };
        },

        /**
         * Получить подключение
         * @returns {object}
         */
        getConnection: function (){
            return this.ws;
        },

        send: function(data){
            return this.ws.send(data);
        },

        /**
         * Получить параметры подключения
         * @returns {object}
         */
        getParams: function () {
            return this.params;
        },

        /**
         * Получить id подключения
         * @returns {string}
         */
        getId: function () {
            return this.id();
        },

        /**
         * Получить количество запросов к коннекту
         * @returns {integer}
         */
        getRequest: function () {
            return this.params.numRequest;
        },

        /**
         * Добавить запрос
         * @returns {number}
         */
        addRequest: function () {
            return ++this.params.numRequest;
        },

        /**
         * Установить дату последнего пинга
         * @param date {timestamp} Таймстамп
         * @returns {*}
         */
        setLastPing: function (date) {
            this.params.lastPingTime = date || Date.now();
            this.params.pingCounter++;
            return this.params.lastPingTime;
        },

        /**
         * Установить статус подключения
         * @param stateReady {integer} 0-ok, 1-отключен
         * @returns {integer}
         */
        setStateReady: function (stateReady) {
            this.params.stateReady = stateReady;
            return this.params.stateReady;
        },

        /**
         * Закрыть соединение
         */
        closeConnect: function() {
            this.params.stateReady = 0; // closed
            // создаем событие закрытия коннекта
            this.event.fire({
                type: 'socket.close',
                target: this,
                connId: this.id
            });
        },

        setSession: function(session) {
            this.session = session;
        },

        getSession: function() {
            return this.session;
        },

        isConnected: function() {
            return this.params.stateReady == 1;
        },

        // Properties

        context: function(value) {
            return this._genericSetter("Context",value);
        }

    });

    return Connect;
});