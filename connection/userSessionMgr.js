if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../memDB/memDBController', '../controls/controlMgr', '../system/event', '../system/utils', './user', './vc', './connect', './session'],
    function(MemDBController, ControlMgr, Event,  Utils, User, VisualContext, Connect, Session) {
            var UserSessionMgr = UccelloClass.extend({

            init: function(router, options){
				this.pvt = {};
				this.pvt.contextCounter = 1;
                this.pvt.constructHolder =  options.constructHolder;
                this.sessions = {};
                this.connects = {};
                this.users = {};
                this.deviceNameId = 0;
                this.deviceColorId = 0;
                this.sessionId = 0;
                this.userId = 0;
				this.event = new Event();
                this.options = options;
				this.rpc = options.rpc;
				this.proxyServer =  options.proxyServer;
				this.execQ = {};

                // системные объекты
                this.dbcsys = new MemDBController(router);
				var dbp =  {name: "System", kind: "master", guid:UCCELLO_CONFIG.guids.sysDB}
                this.cmsys = new ControlMgr( { controller: this.dbcsys, dbparams: dbp });

                // создаем метаинфо
                this.cmsys.buildMetaInfo('sys');

                // функции роутера
                var that = this;
                router.add('connect', function(){ return that.routerConnect.apply(that, arguments); });
                router.add('authenticate', function(){ return that.routerAuthenticate.apply(that, arguments); });
                router.add('deauthenticate', function(){ return that.routerDeauthenticate.apply(that, arguments); });
                router.add('createContext', function(){ return that.routerCreateContext.apply(that, arguments); });
                router.add('newTab', function(){ return that.routerNewTab.apply(that, arguments); });
				router.add('remoteCall2', function(){ return that.routerRemoteCall.apply(that, arguments); });
            },
			
			getController: function() {
				return this.dbcsys;
			},
			
			getNewContextId: function() {
				return this.pvt.contextCounter++;
			},
			
            /**
             * Подключение с клиента
             * @param data
             * @returns {object}
             */
            routerConnect: function(data, done) {
                // данные сессии
                data.session = JSON.parse(data.session);
                // подключаемся к серверу с клиента
                var result =  this.connect(data.$sys.socket, {client:data});
                // коннект
                var connect = this.getConnect(data.$sys.socket.getConnectId());
                // обработка события закрытия коннекта
                var that = this;
                connect.event.on({
                    type: 'socket.close',
                    subscriber: this,
                    callback: function(args){
                        that.removeConnect(args.connId);
                    }
                });
                done(result);
            },

            /**
             * Авторизация
             * @param data
             * @returns {object}
             */
            routerAuthenticate: function(data, done) {
                var session = this.getConnect(data.$sys.socket.getConnectId()).getSession();
                this.authenticate(data.$sys.socket.getConnectId(), session.getId(), data, done);
            },

            /**
             * Деавторизация
             * @param data
             * @returns {object}
             */
            routerDeauthenticate: function(data, done) {
                var session = this.getConnect(data.$sys.socket.getConnectId()).getSession();
                this.deauthenticate(session.getId(), done);
            },



            /**
             * Создать серверный контекст
             * @param data
             * @param done
             */
            routerCreateContext: function(data, done) {
                var that = this;
                var connect = this.getConnect(data.$sys.socket.getConnectId());
                if (!connect) {
                    done({});
                    return false;
                }
                var user = connect.getSession().getUser();
                var controller = this.getController();
				var contextId = this.getNewContextId();
				var params = {
                    parent: user,
                    colName: "VisualContext",
                    socket: this.getConnect(data.$sys.socket.getConnectId()).getConnection(),
                    rpc: this.rpc, proxyServer: this.proxyServer,
                    ini: {fields: {Id: contextId, Name: 'context'+contextId, Kind: "master"}},
                    formGuids:data.formGuids,
                    constructHolder: this.pvt.constructHolder
                };
                var context = new VisualContext(this.cmsys, params);
				context.on(this.cmsys, params);
                var result = {roots: controller.getDB(context.dataBase()).getRootGuids(), vc: context.getGuid()};
				controller.genDeltas(this.cmsys.getGuid());
                done(result);
            },

            /**
             * Создать серверный контекст
             * @param data
             * @param done
             */
            routerNewTab: function(data, done) {
                // сессии пользователя
                var sessions = this.getConnect(data.$sys.socket.getConnectId()).getSession().getUser().getSessions();
                // найти сессию с гуидом
                var session = this.getSessionByGuid(data.sessionGuid, sessions);
                var result = {action:"error", error:'Connect not found'};
                if (session){
                    // взять 1-й активный коннект сессии
                    var connects = session.getConnects();
                    for(var i in connects) {
                        if(connects[i].isConnected()) {
                            //connects[i].send({action:"newTab", contextGuid:data.contextGuid, resGuids:data.resGuids});
                            result = {args:{action:"newTab", contextGuid:data.contextGuid, resGuids:data.resGuids}};
                            break;
                        }
                    }
                }
                done(result);
            },
			
			// Добавить в очередь выполнение
			addToQueue: function(db, func) {
				var guid = db.getGuid();
				if (!this.execQ[guid]) this.execQ[guid] = [];
				var q = this.execQ[guid];
				function execMethod() {		
					if (!db.getCurTranGuid()) {
						var f=q[0];
						q.splice(0,1);
						f();
					}
					if (q.length>0) setTimeout(execMethod,1);

				}
				q.push(func);
				if (q.length==1) setTimeout(execMethod,1);
			},
			
			routerRemoteCall: function(data,done) {				

				var args = data.args;
				var uobj = this.cmsys.get(args.objGuid);
				var db = uobj.getContentDB();
				function done2(result) {
					db.tranCommit();
					done(result);
				};
				args.aparams.push(done2);

				function exec1() {
					if (args.trGuid) db.tranStart(args.trGuid);
					uobj[args.func].apply(uobj,args.aparams);									
				}

				this.addToQueue( db, function() { exec1(); } );

				
			},

            /**
             * Подключаемся к серверу с клиента
             * @param {object} socket
             * @param {object} data Данные в формате {client:{...}}
             */
            connect: function(socket, data) {
                var session = this.getSessionByGuid(data.client.session.guid);
                var sessionId = session? session.getId(): null;

                // если не указан номер сессии или не найдена создаем новую
                if (!session) {
                    sessionId = this._newSession(data.client.session);
                    session = this.getSession(sessionId);
                }

                // добавляем коннект в общий список и в сессию
				var ini =  { fields: {Id:socket.getConnectId(), Name: "C"+socket.getConnectId()}}
                var connect = new Connect(this.cmsys, {parent:session, colName: "Connects", ini: ini, /*id:socket.getConnectId()*/ ws:socket,  /*sessionID:sessionId*/ userAgent:data.client.agent, stateReady:1});
                this.addConnect(connect);
                session.addConnect(connect);

                // Если возвращен user, то это означает, что сессия авторизована и соответствует пользователю с логином user.user
                var result = {sessionId: sessionId, session:{id:sessionId, guid:session.sessionGuid(), deviceName:session.deviceName(), deviceType:session.deviceType(), deviceColor:session.deviceColor()}};
                var user = session.getUser();
                if (user.authenticated())
                    result.user = {user: user.name(), guid:user.getGuid(), loginTime: user.loginTime(), session:{id:sessionId, guid:session.sessionGuid(), deviceName:session.deviceName(), deviceType:session.deviceType(), deviceColor:session.deviceColor()}};

                return result;
            },

            /**
             * Cоздает новую сессию с неавторизованным пользователем и возвращает идентификатор этой сессии
             * @param data {object}
             * @returns {number}
             * @private
             */
            _newSession: function(data) {
                var user = this._newUser();
                var sessionId = ++this.sessionId;
                var session = new Session(this.cmsys, {parent:user, colName: "Sessions", ini: { fields: {Id:sessionId, SessionGuid:Utils.guid(), Name: "S"+sessionId, deviceName:data.deviceName, deviceType:data.deviceType, deviceColor:data.deviceColor}}});
                this.addSession(session);
                this.addUser(user);
                user.addSession(session);
                return sessionId;
            },

            /**
             * Создать noname-пользователя
             * @private
             */
            _newUser: function() {
                var userId = ++this.userId;
				var user = new User(this.cmsys, { ini: { fields: { Id: userId, Name: 'noname'+userId } }});
				
				// генерируем событие на создание нового пользователя, чтобы привязать к нему контекст
				this.event.fire({
                   type: 'newUser',
                   target: user
                });
				
                return user;
            },

            /**
             *  Аутентификация - если успешно, ищется пользователь с именем user и если найден - сессия подключается к нему,
             *  а noname-пользователь удаляется из списка. Если нет, то noname-пользователь получает имя user.
             *  Возвращает объект {user: string, loginTime: dateTime}
             * @param connectId
             * @param sessionId
             * @param data
             * @param done
             */
            authenticate: function(connectId, sessionId, data, done) {
                var that = this;
                this.options.authenticate(data.name, data.pass, function(err, result){
                    if (result) {
                        var userObj = that.getUser(data.name);
                        var session = that.getSession(sessionId);

                        if (userObj) {
                            that.removeUser(session.getUser().name());
                            //session.getUser().getObj().getCol("Sessions")._del(session.getObj());
							session.getUser().getCol("Sessions")._del(session);
							// TODOR2 исправить
							session.pvt.parent = userObj;
                            //session.getObj().pvt.parent = userObj.getObj();
							userObj.getCol("Sessions")._add(session);
                            //userObj.getObj().getCol("Sessions")._add(session.getObj());
                        } else {
                            userObj = session.getUser();
                            that.removeUser(userObj.name());
							userObj.name(data.name);
                            that.addUser(userObj);
                        }

                        userObj.addSession(session);
                        userObj.authenticated(true);
                        userObj.loginTime(Date.now());

                        // Если название дублируется (уже есть такие для данного юзера),
                        // то сервер добавляет индекс  MyComputer1, MyComputer2 и т.д.

                        var userSessions = userObj.getSessions();
                        var deviceColors = [ '#6ca9f0', '#48ada3', '#54ab43', '#a6b741', '#ecb40e', '#ea8e39', '#e96e5f', '#ffc0cb'];
                        var countColor = 0;
                        for(var i in userSessions) {
                            if (userSessions[i].item.deviceName() == data.session.deviceName && sessionId!=i)
                                data.session.deviceName = 'MyComputer'+(++that.deviceNameId);
                            if (userSessions[i].item.deviceColor() == data.session.deviceColor && sessionId!=i)
                                countColor++;
                        }

                        // Если цвета дублируются берем следующий
                        if (countColor>0) {
                            ++that.deviceColorId;
                            data.session.deviceColor = deviceColors[that.deviceColorId % deviceColors.length];
                        }

                        // сохраняем данные девайса
                        session.deviceName(data.session.deviceName);
                        session.deviceType(data.session.deviceType);
                        session.deviceColor(data.session.deviceColor);

						that.dbcsys.genDeltas(that.cmsys.getGuid());
                        done({user:{user: userObj.name(), guid:userObj.getGuid(), loginTime: userObj.loginTime(),
                                session:{id:session.getId(), guid:session.sessionGuid(), deviceName:session.deviceName(), deviceType:session.deviceType(), deviceColor:session.deviceColor()}}});
                    } else {
                        done({user:null});
                    }
                });
            },

            /**
             * деаутентификация для сессии - сессия отключается от “именованного” пользователя и создается noname-пользователь,
             * то есть процесс, обратный аутентификации.
             * TODO - в будущем нужно оповещать все коннекты о деаутентификации
             * @param sessionId
             */
            deauthenticate: function(sessionId, done) {
                var session = this.getSession(sessionId);

                // удаляем у именованного
                session.getUser().removeSession(sessionId);
				session.getUser().getCol("Sessions")._del(session);
                //session.getUser().getObj().getCol("Sessions")._del(session.getObj());

                // создаем noname
                var user = this._newUser();
                user.addSession(session);
				// TODO R2 исправить
				session.pvt.parent = user;
                user.getCol("Sessions")._add(session);
                //session.getObj().pvt.parent = user.getObj();
                //user.getObj().getCol("Sessions")._add(session.getObj());

                // рассылка дельт
				this.cmsys.genDeltas(this.cmsys.getGuid());
				done({user:{user: user.name(), guid:user.getGuid(), session:{id:session.getId(), guid:session.sessionGuid(), deviceName:session.deviceName(), deviceType:session.deviceType(), deviceColor:session.deviceColor()}}});
            },

            /**
             * принудительное отключение сессии - все коннекты сессии также принудительно отключаются
             * @param sessionId
             */
            disconnect: function(sessionId) {
                var session = this.getSession(sessionId);
                var user = session.getUser();
                var sessions = user.getSessions();
                for(var i in sessions) {
                    this.removeSession(sessions[i].getId());
                    user.removeSession(sessions[i].getId())
                }
            },
			
			getSysCM: function() {
				return this.cmsys;
			},

            addSession: function(session){
                this.sessions[session.getId()] = {item:session, date:new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')};
            },
            getSessions: function(){
                return this.sessions;
            },
            getSession: function(id){
                return this.sessions[id] ? this.sessions[id].item : null;
            },
            getSessionByGuid: function(guid, sessions){
                sessions = sessions? sessions: this.sessions;
                for(var g in sessions) {
                    if (sessions[g].item.sessionGuid() == guid)
                        return sessions[g].item;
                }
                return null;
            },
            removeSession: function(id){
                if (this.sessions[id])
                    delete this.sessions[id];
            },
            /**
             * общее число сессий
             */
            countSession: function() {
                return Object.keys(this.sessions).length;
            },

            addConnect: function(connect){
                this.connects[connect.getId()] = {item:connect, date:new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')};
            },
            getConnect: function(id){
                return this.connects[id] ? this.connects[id].item : null;
            },
            getConnectDate: function(id){
                return this.connects[id] ? this.connects[id].date : null;
            },
            removeConnect: function(id){
                if (this.connects[id])
                    delete this.connects[id];
            },
            /**
             * общее число коннектов
             */
            countConnect: function() {
                return Object.keys(this.connects).length;
            },

            addUser: function(user){
                this.users[user.name()] = {item:user, date:new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')};
            },
            getUser: function(name){
                return this.users[name] ? this.users[name].item : null;
            },
            removeUser: function(name){
                if (this.users[name])
                    delete this.users[name];
            },
            /**
             * общее число пользователей
             */
            countUser: function() {
                return Object.keys(this.users).length;
            }

        });
        return UserSessionMgr;
    }
);