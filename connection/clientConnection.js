if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/** +
 * ClientConnection
 * @module ClientConnection
 */
define(['./socket', '../controls/aComponent'], function(Socket, AComponent) {

    var ClientConnection = AComponent.extend(/** @lends module:ClientConnection.ClientConnection.prototype */{

        className: "ClientConnection",
        classGuid: UCCELLO_CONFIG.classGuids.ClientConnection,
        metaFields: [],
        metaCols: [ {cname: "VisualContext", ctype: "control"} ],

        /**
         * Инициализация объекта
         * @constructs
         */
        init: function(cm, params) {
            if (cm) {
                this._super(cm, params);
            } else {
                this.socket = null;
                this.session = null;
                this.connected = false;
                this.authenticated = false;
                this.newTabCallback = params.newTabCallback;
            }
        },

        /**
         * подключить к серверной части, без логина, возвращает идентификатор сессии и имя пользователя если сессия авторизована
         * (см. описание userSessionMgr.connect, которая вызывается из данного метода)
         * @param url
         * @param session
         */
        connect: function(url, session, callback) {
            var that = this;
            this.session = session;
            that.socket = new Socket(url, {
                open: function(){ // при открытии соединения
                    that.connected = true;
                    // отправляем сообщение что подключились
                    that.socket.send({action:'connect', type:'method', session: JSON.stringify(session), agent:navigator.userAgent}, callback);
                },
                close: function(){
                    that.connected = false;
                },
                router: function(data){
                    //console.log('сообщение с сервера:', data);
                    var result = {};
                    if (data.args) {
                        switch (data.args.action) {
                            case 'error': // ошибки
                                if (DEBUG)
                                    console.log(data.args.error);
                                break;
                            case 'sendDelta':
                                if (DEBUG) console.timeEnd('applyDeltas');
                                that.getObj().getDB().getController().applyDeltas(data.args.dbGuid, data.args.srcDbGuid, data.args.delta);
                                break;
                            case 'newTab':
                                if (that.newTabCallback)
                                    that.newTabCallback(data.args);
                                break;
                        }
                    }
                    return result;
                }
            });
        },

        /**
         * Аутентификация
         * @param params {user, pass, session, subscribeUserInfo}
         * @param callback
         */
        authenticate: function(params, callback) {
            if (!this.connected)
                return false;
            var that = this;
            this.socket.send({action:'authenticate', type:'method', name:params.user, pass:params.pass, sid: this.session.guid, session:params.session}, function(result){
                that.authenticated = result.user? result.user: false;
                callback(result);
            });
        },

        deauthenticate: function(callback) {
            this.authenticated = false;
            this.socket.send({action:'deauthenticate', type:'method', sid: this.session.guid}, callback);
        },

        disconnect: function(callback) {
            this.socket.send({action:'disconnect', type:'method', sid: this.session.guid}, callback);
        },

        getUser: function(callback) {
            this.socket.send({action:'getUser', type:'method', sid: this.session.guid}, function(result){
                callback(result.item);
            });
        },

        getSession: function(callback) {
            this.socket.send({action:'getSession', type:'method', sid: this.session.guid}, function(result){
                callback(result.item);
            });
        },

        getConnect: function(callback) {
            this.socket.send({action:'getConnect', type:'method', sid: this.session.guid}, function(result){
                callback(result.item);
            });
        },

        /**
         * Возвращает userInfo если подписка осуществлена
         */
        getUserInfo: function() {
            
        },

        /**
         * Открыть формы на другой закладке
         * @param contextGuid
         * @param dbGuid
         * @param resGuids
         * @param sessionGuid
         * @param callback
         */
        newTab: function(contextGuid, resGuids, sessionGuid, callback) {
            this.socket.send({action:'newTab', type:'method', sid: this.session.guid, contextGuid:contextGuid, resGuids:resGuids, sessionGuid:sessionGuid}, function(result){
                if (callback)
                    callback(result);
            });
        }


    });

    return ClientConnection;
});