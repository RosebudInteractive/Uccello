if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль подключений
 * @module Connect
 */
define(
    ['./connectinfo', '../system/event'],
    function(ConnectInfo, event) {

    var Connect = ConnectInfo.extend(/** @lends module:Connect.Connect.prototype */{

        className: "Connect",
        classGuid: UCCELLO_CONFIG.classGuids.Connect,
        metaFields: [],

        /**
         * Инициализация объекта
         * @constructs
         * @param params {object} Параметры подлкючения
         */
        init: function(cm, params) {
            UccelloClass.super.apply(this, [cm, params]);

            if (params===undefined) return; // в этом режиме только создаем метаинфо
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
                connId: this.getId()
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
        }
    });

    return Connect;
});