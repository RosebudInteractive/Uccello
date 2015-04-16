if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./connection/clientConnection' ,
        './memDB/memDBController','./memDB/memDataBase','./controls/controlMgr', './system/uobject', './system/umodule', './controls/aComponent',
        './connection/userinfo', './connection/user', './connection/sessioninfo', './connection/session', './connection/connectinfo', './connection/connect', './connection/vc', './connection/vcresource',
        './system/rpc', './system/constructHolder'
    ],
    function(ClientConnection, MemDBController, MemDataBase, ControlMgr, UObject, UModule, AComponent,
        UserInfo, User, SessionInfo, Session, ConnectInfo, Connect, VisualContext, Vcresource,
        Rpc, ConstructHolder
        ) {
        var UccelloClt = Class.extend({

            init: function(options){
                var that = this;
				this.pvt = {};

                this.pvt.user = null;
                this.pvt.sessionGuid = null;
				var rpc = this.pvt.rpc = new Rpc( { router: this.pvt.router } );

                var clt = this.pvt.clientConnection = new ClientConnection(null, {newTabCallback:options.newTabCallback});
				this.pvt.dbcontext = null;
                this.pvt.controlMgr = {};
				this.pvt.vc = null; // VisualContext
				this.pvt.clientContextId = 0;
                this.options = options;

                if ($.cookie('sid'))
                    that.pvt.sessionGuid = $.cookie('sid');
                else
                    that.pvt.sessionGuid = null;

                this.pvt.constructHolder = new ConstructHolder();
                this.pvt.constructHolder.loadControls(function(){
                    that.getClient().connect("ws://"+url('hostname')+":"+UCCELLO_CONFIG.webSocketServer.port, {guid:that.getSessionGuid()},  function(result){
                        $.cookie('sid', result.session.guid);
                        that.pvt.sessionId = result.session.id;
                        that.pvt.sessionGuid = result.session.guid;

                        that.pvt.constructHolder.addComponent(UserInfo);
                        that.pvt.constructHolder.addComponent(SessionInfo);
                        that.pvt.constructHolder.addComponent(ConnectInfo);
                        that.pvt.constructHolder.addComponent(User);
                        that.pvt.constructHolder.addComponent(Session);
                        that.pvt.constructHolder.addComponent(Connect);
                        that.pvt.constructHolder.addComponent(VisualContext);
                        that.pvt.constructHolder.addComponent(Vcresource);
                        that.pvt.constructHolder.addComponent(ClientConnection);

                        that.createController(function(){
                            if (result.user) {
                                that.getClient().authenticated = result.user;
                                that.subscribeUser(options.callback);
                            } else {
                                options.callback();
                            }
                        });

                        that.pvt.clientConnection.socket.send({action:"testIntf", type:'method'}, function(result){
                            var guidServer = "d3d7191b-3b4c-92cc-43d4-a84221eb35f5";
                            that.pvt.servInterface = result.intf;
                            that.pvt.proxyServer = rpc._publProxy(guidServer, clt.socket, result.intf); // публикуем прокси серверного интерфейса
                        });
                    });
                });

            },

            createController: function(done){
                var that = this;
                this.pvt.clientConnection.socket.send({action:"getGuids", type:'method'}, function(result){

                    that.pvt.guids = result;

                    // создаем  контроллер и бд
                    that.pvt.controller = new MemDBController();

                    that.pvt.controller.event.on({
                        type: 'endApplyDeltas',
                        subscriber: this,
                        callback: function(args){
                            var context = that.getContext();
                            if (context)
                                context.renderAll(true);
                        }
                    });

                    // создаем системную бд
                    that.pvt.dbsys = that.pvt.controller.newDataBase({name:"System", proxyMaster : {connect: that.pvt.clientConnection.socket, guid: that.pvt.guids.masterSysGuid}}, done);
                    that.pvt.cmsys = new ControlMgr(that.pvt.dbsys,null,null,that.pvt.clientConnection.socket);

                    // создаем мастер базу для clientConnection
                    that.pvt.dbclient = that.pvt.controller.newDataBase({name:"MasterClient", kind: "master"});
                    that.pvt.cmclient = new ControlMgr(that.pvt.dbclient,null,null,that.pvt.clientConnection.socket);
                    new UObject(that.pvt.cmclient);
                    new UModule(that.pvt.cmclient);
                    new AComponent(that.pvt.cmclient);
                    new VisualContext(that.pvt.cmclient);
                    new Vcresource(that.pvt.cmclient);
                    new ClientConnection(that.pvt.cmclient);
                    that.pvt.clientConnection.init(that.pvt.cmclient, {});

                });
            },
			
			getClient: function() {
				return this.pvt.clientConnection;
			},
			
			getController: function() {
				return this.pvt.controller;
			},
			
			getSysDB: function() {
				return this.pvt.dbsys; 
			},

            getClientDB: function() {
				return this.pvt.dbclient;
			},

            getClientCM: function() {
				return this.pvt.cmclient;
			},

			getSysCM: function() {
				return this.pvt.cmsys;
			},
			
			getContext: function() {
				return this.pvt.vc;
			},
			
			getContextCM: function(rootGuid) {
				//return this.pvt.vc.getContextCM(rootGuid);
				return this.pvt.vc.getContextCM();
			},
			

            getUser: function(){
                return this.pvt.user;
            },

            /**
             * Гуид текущей сессии
             * @returns {string}
             */
            getSessionGuid: function(){
                return this.pvt.sessionGuid;
            },

            /**
             * Создать контекст
			 * если side = server, то создается новый серверный контекст, на который подписывается клиент
			 * если side = client, то создается клиентский контекст
             * @param side - master|slave
			 * @param formGuids - массив гуидов ресурса формы, который загружается в контекст
			 * @param cbfinal - финальный коллбэк
             */			
			createContext: function(side, formGuids, cbfinal) {
				if (side == "server") {
					var that=this;
					this._createSrvContext(formGuids, function(result){
                        result.side = 'server';
                        cbfinal(result);
					});
				}
				else { // side == "client"
					// TODO написать импл.
                    var contextId = ++this.pvt.clientContextId;
                    var params = {
                        parent: this.getClient(),
                        colName: "VisualContext",
                        ini: {fields: {Id: contextId, Name: 'context'+contextId, Kind: "master"}},
                        formGuids:formGuids,
                        rpc: this.pvt.rpc,
                        proxyServer: this.pvt.proxyServer,
                        constructHolder: this.pvt.constructHolder
                    };
                    var context = new VisualContext(this.pvt.cmclient, params);
                    var result = {vc:context.getGuid(), side:'client', formGuids:formGuids};
                    cbfinal(result);
				}
			},

			_createSrvContext: function(formGuids, callback) {
				this.getClient().socket.send({action:"createContext", type:'method', formGuids: formGuids}, callback);
			},
			
            /**
             * Установить текущий (серверный) контекст
             * @param params - параметры
			 *        params.formGuids - массив гуидов ресурсов, которые должны быть загружены
			 *        params.vc - гуид контекста
			 * @param cbfinal - финальный коллбэк
			 * @param renderRoot - коллбэк на рендеринг, если не передается, то контекст активируется, но остается скрытым
             */	
			setContext: function(params, cbfinal, renderRoot) {
                var that = this;

                function cbfinal2(result2){
                    result2 = result2 && result2.guids ? result2.guids : result2;
                    that.getContext().renderForms(result2, true);
                    if (cbfinal)
                        cbfinal(result2);
                }

                var s = that.pvt.clientConnection.socket;
                var p = {socket: s, proxyServer: that.pvt.proxyServer}
                p.formGuids = params.formGuids;
                p.constructHolder = that.pvt.constructHolder; //  ссылка на хранилище конструкторов

                if (params.side == 'client') {
                    that.pvt.vc = this.pvt.cmclient.getByGuid(params.vc);
                    that.pvt.vc.on(this.pvt.cmclient, p, cbfinal2, renderRoot);
                } else {
                    that.pvt.vc = that.pvt.cmsys.getByGuid(params.vc);
                    that.pvt.vc.on(that.pvt.cmsys, p, cbfinal2, renderRoot);
                }
			},


            /**
             * Создать рут
             * @param formGuids массив гуидов
             * @param rtype тип данных "res", "data"
             * @param callback
             */
            createRoot: function(formGuids, rtype, callback, context) {
                var that = this;
                var subDbGuid = context? context.dataBase(): this.getContext().getDB().getGuid();
                context = context? context: this.getContext();
                context.loadNewRoots(formGuids, {rtype:rtype, subDbGuid: subDbGuid }, function(result){
                    context.renderForms(result.guids, true);
                    if (callback) callback(result);
                });
            },

            subscribeUser: function(callback) {
                var user = this.getClient().authenticated;
                if (!user) {
                    callback(false);
                    return;
                }

                this.pvt.sessionGuid = user.session.guid;
                this.pvt.sessionId = user.session.id;
                this.pvt.guids.sysRootGuid = user.guid;

                var that = this;
                var compCallBack = function (typeObj, sobj, parent) {
                    var classGuid = sobj.$sys.typeGuid;
                    var transArr = {};
                    transArr[UCCELLO_CONFIG.classGuids.User] = UCCELLO_CONFIG.classGuids.UserInfo; // User -> UserInfo
                    transArr[UCCELLO_CONFIG.classGuids.Connect] = UCCELLO_CONFIG.classGuids.ConnectInfo; // Connect -> ConnectInfo
                    transArr[UCCELLO_CONFIG.classGuids.Session] = UCCELLO_CONFIG.classGuids.SessionInfo; // Session -> SessionInfo
                    classGuid = transArr[classGuid]? transArr[classGuid]: classGuid;
                    var params = {objGuid: sobj.$sys.guid};
                    var component = new (that.pvt.constructHolder.getComponent(classGuid).constr)(that.pvt.cmsys, params);
                    if (classGuid == UCCELLO_CONFIG.classGuids.UserInfo) { // UserInfo
                        that.pvt.user = component;
                    }
                    return component;
                };
                this.getSysDB().setDefaultCompCallback(compCallBack);
                this.getSysDB().subscribeRoots(this.pvt.guids.sysRootGuid, callback, compCallBack);
            },

            deauthenticate: function(callback){
                var that = this;
                that.getClient().deauthenticate(function(result){
                    that.pvt.sessionGuid = result.user.session.guid;
                    that.pvt.sessionId = result.user.session.id;
                    that.pvt.guids.sysRootGuid = result.user.guid;
                    that.getSysDB().subscribeRoots(that.pvt.guids.sysRootGuid, callback);
                });
            }


        });
        return UccelloClt;
    }
);