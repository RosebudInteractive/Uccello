if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(function () {
    
    var Channel = UccelloClass.extend({
        /**
         * Инициализация объекта
         * @constructs
         * @param url {string} url=для клиента, ws=для сервера
         * @param options {object} {}
         */
        init: function (connectId, options, communicationObj) {

            var opt = options || {};
            this.options = {
                open: opt.open ? opt.open : null,   // вызвать метод при открытии сокета
                close: opt.close ? opt.close : null,// вызвать метод при закрытии сокета
                router: opt.router ? opt.router : null, // вызвать метод при получении сообщения от сервера
                connectId: connectId ? connectId : null,
                communicationObj: communicationObj ? communicationObj : null
            };
            
            this.msgId = 0;
            this.messages = {};
            if (this.options.communicationObj === null)
                throw new Error("###Channel Communication Object is NULL.");
        },
        
        /**
         * Проверка на поддержку WebSocket в клиенте
         * @alias Soket:Socket.isEnabled
         * @returns {boolean}
         */
        isEnabled: function () {
            return this.options.communicationObj.isEnabled();
        },
        
        /**
         * Проверка на подключенность
         * @returns {boolean}
         */
        isConnected: function () {
            return this.options.communicationObj.isConnected();
        },
        
        /**
         * Отправка сообщений серверу с уникальным msgId
         * @param obj
         * @param callback
         */
        send: function (obj, callback) {
            var msgId = this.options.communicationObj.getMsgId();
            var data = obj;
            if (!obj.msgId)
                data = { args: obj, msgId: msgId, type: obj.type };

            if (callback)
                this.messages[msgId] = { callback: callback, time: Date.now() }; // сохраняем колбек

            this.options.communicationObj.send(data);
        },
        
        /**
         * Вызывается при открытии соединения
         * @param event
         */
        open: function (event) {
            if (this.options.open)
                this.options.open(event, this.options.connectId);
        },
        
        /**
         * Вызывается по приходу сообщений
         * @param event
         */
        receive: function (event) {
            var that = this;
            //console.log('###receive: ', JSON.stringify(event))
            // обработчик
            if (this.options.router) {
                // вызов роутера
                this.options.router(event, this.options.connectId, this, function (result) {
                    // если требуется возврат результата
                    if (event.type == 'method') {
                        if (DEBUG) console.log('result:', result);
                        if (!result) result = {};
                        result.msgId = event.msgId;
                        that.send(result);
                    }
                });
            }
            
            // если есть такой ID вызываем сохраненный колбек
            if (event.msgId && this.messages[event.msgId]) {
                var msg = this.messages[event.msgId];
                delete this.messages[event.msgId];
                delete event.msgId;
                if (msg.callback)
                    msg.callback(event);
            }
        },
        
        
        /**
         * Вызывается при закрытии соединения
         * @param event
         */
        close: function (event) {
            if (this.options.close)
                this.options.close(event, this.options.connectId);
        },
        
        /**
         * Получить номер коннекта
         * @returns {*}
         */
        getConnectId: function () {
            return this.options.connectId;
        },

        /**
         * Закрыть соединение
         */
        shutdown: function () {
            this.options.communicationObj.shutdown();
        }
    });
    
    return Channel;
});