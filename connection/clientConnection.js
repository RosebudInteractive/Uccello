if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
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
        metaCols: [ {cname: "VisualContext", ctype: "UObject"} ],

        /**
         * Инициализация объекта
         * @constructs
         */
        init: function(cm, params) {
            if (cm) {
                UccelloClass.super.apply(this, [cm, params]);
            } else {
                this.socket = null;
                this.session = null;
                this.connected = false;
                this.authenticated = false;
                this.newTabCallback = params.newTabCallback;
                this.commClient = null;
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

            if (! this.commClient)
                throw new Error("ClientConnection.connect: CommunicationClient object is EMPTY.");

            //that.socket = new Socket(url, {
            that.socket = this.commClient.newChannel(url, {
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
                    var result = {}, args = {};
                    data = 'result$' in data ? data.result$ : data;
                    if (data.args) {
						var  contr = that.getDB().getController(), db = contr.getDB(data.args.dbGuid);
                        switch (data.args.action) {
                            case 'error': // ошибки
                                if (DEBUG)
                                    console.log(data.args.error);
                                break;
                            case 'sendDelta': // получение дельт на клиенте
								args.aparams = [data.args.dbGuid, data.args.srcDbGuid, data.args.delta];
								args.func = "applyDeltas";
								db.remoteCallExec(contr,args,data.args.srcDbGuid,data.args.trGuid, null);
								db.incDeltaFlag(1); // выставить флаг дельт, чтобы запустить обработку processDelta если были входящие дельты
                                break;
							case 'endTran': // конец транзакции на клиенте
                                //db = contr.getDB(data.args.dbGuid);
								args.func = "endTran";
								db.remoteCallExec(null,args,undefined,data.args.trGuid, null);														
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