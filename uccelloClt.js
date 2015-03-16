if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./connection/clientConnection' ,
        './memDB/memDBController','./memDB/memDataBase','./controls/controlMgr', './controls/aComponent',
        './connection/userinfo', './connection/user', './connection/sessioninfo', './connection/session', './connection/connectinfo', './connection/connect', './connection/visualContextinfo', './connection/visualContext',
        './system/rpc'
    ],
    function(ClientConnection, MemDBController, MemDataBase, ControlMgr, AComponent,
        UserInfo, User, SessionInfo, Session, ConnectInfo, Connect, VisualContextInfo, VisualContext,
        Rpc
        ) {
        var UccelloClt = Class.extend({

            init: function(options){
                var that = this;
				this.pvt = {};

                this.pvt.user = null;
                this.pvt.sessionGuid = null;
				var rpc = this.pvt.rpc = new Rpc( { router: this.pvt.router } );

                var clt = this.pvt.clientConnection = new ClientConnection(null, {newTabCallback:options.newTabCallback});
                this.pvt.typeGuids = {};
				this.pvt.dbcontext = null;
                this.pvt.controlMgr = {};
				this.pvt.vc = null; // VisualContext
                this.pvt.renderRoot = options.renderRoot;
                this.options = options;

                if ($.cookie('sid'))
                    that.pvt.sessionGuid = $.cookie('sid');
                else
                    that.pvt.sessionGuid = null;

                this.loadControls(function(){
                    that.getClient().connect(options.host, {guid:that.getSessionGuid()},  function(result){
                        $.cookie('sid', result.session.guid);
                        that.pvt.sessionId = result.session.id;
                        that.pvt.sessionGuid = result.session.guid;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.UserInfo] = UserInfo;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.SessionInfo] = SessionInfo;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.ConnectInfo] = ConnectInfo;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.VisualContextInfo] = VisualContextInfo;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.User] = User;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.Session] = Session;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.Connect] = Connect;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.VisualContext] = VisualContext;
                        that.pvt.typeGuids[UCCELLO_CONFIG.classGuids.ClientConnection] = ClientConnection;

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
                    that.pvt.cmsys = new ControlMgr(that.pvt.dbsys);

                    // создаем мастер базу для clientConnection
                    that.pvt.dbclient = that.pvt.controller.newDataBase({name:"MasterClient", kind: "master"});
                    that.pvt.cmclient = new ControlMgr(that.pvt.dbclient);
                    new AComponent(that.pvt.cmclient);
                    new VisualContextInfo(that.pvt.cmclient);
                    new VisualContext(that.pvt.cmclient);
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
			
			getContext: function() {
				return this.pvt.vc;
			},
			
			getContextCM: function(rootGuid) {
				return this.pvt.vc.getContextCM(rootGuid);
			},
			
			// получить конструктор по его guid
			getConstr: function(guid) {
				return this.pvt.typeGuids[guid];
			},

            /**
             * Добавить конструктор
             * @param obj
             */
			addConstr: function(obj) {
				this.pvt.typeGuids[obj.classGuid] = obj;
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
             * Добавить контекст
			 * если side = server, то создается новый серверный контекст, на который подписывается клиент
			 * если side = client, то создается клиентский контекст
             * @param side - master|slave
			 * @param formGuids - массив гуидов ресурса формы, который загружается в контекст
			 * @param cbfinal - конечный коллбэк
             */			
			createContext: function(side, formGuids, cbfinal) {
				if (side == "server") {
					var that=this;
					this.createSrvContext(formGuids, function(result){
                        result.side = 'server';
						that.setContext(result, cbfinal);
					});
				}
				else { // side == "client"
                    this.setContext({side: "client", formGuids: formGuids}, cbfinal);
				}
			},

			setContext: function(params, cbfinal) {
                var that = this;

                function cbfinal2(result2){
                    result2 = result2.guids ? result2.guids : result2;
                    that.getContext().renderForms(result2, true);
                    if (cbfinal)
                        cbfinal(result2);
                }

				function done() {
					var s = that.pvt.clientConnection.socket;
					var p = {socket: s, rpc: that.pvt.rpc, proxyServer: that.pvt.proxyServer}
					p.side = params.side;
					p.config = that.options.config;
					if (p.side == "server") {
						that.pvt.serverContext = params.vc;
						p.vc = params.vc;
						p.ini = {fields:{Kind: "slave", MasterGuid: params.masterGuid}};
					}
					else {
						p.ini = {fields:{Kind: "master"}};
					}
					//p.rpc = null;
                    p.formGuids = params.formGuids;
                    p.components = that.pvt.components; //  ссылка на хранилище конструкторов
                    p.renderRoot = that.pvt.renderRoot;
                    var vc = new VisualContext(that.pvt.cmclient, p, cbfinal2);
					that.pvt.vc = vc;
					that.pvt.vcproxy = vc.getProxy();
				}
				
				var controller = this.getController();
				if (this.pvt.vc)
					this.pvt.vc.dispose(done); //delDataBase(this.pvt.dbcontext.getGuid(), done);
				else
					done();			
			},
			
            /**
             * Создать серверный контекст
			 * @param formGuids
			 * @param callback
             */
			createSrvContext: function(formGuids, callback) {
				this.getClient().socket.send({action:"createContext", type:'method', formGuids: formGuids}, callback);
			},

            /**
             * Создать рут
             * @param formGuids массив гуидов
             * @param rtype тип данных "res", "data"
             * @param callback
             */
            createRoot: function(formGuids, rtype, callback) {
                var that = this;
                this.getContext().loadNewRoots(formGuids, {rtype:rtype, subDbGuid: this.getContext().getDB().getGuid() }, function(result){
                    that.getContext().renderForms(result.guids, true);
                    if (callback) callback(result);
                });
            },

            /**
             * Загрузить контролы
             * @param callback
             */
            loadControls: function(callback){
                var that = this;
                var scripts = [];
                var ctrls = UCCELLO_CONFIG.controls;

                // собираем все нужные скрипты в кучу
                for (var i = 0; i < ctrls.length; i++) {
                    var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath :UCCELLO_CONFIG.controlsPath
                    scripts.push(path+ctrls[i].component);
                    if (ctrls[i].viewsets)
                        for (var j = 0; j < ctrls[i].viewsets.length; j++) {
                            var c = ctrls[i].className;
                            var vPath = ctrls[i].isUccello ? 'controls/' :'';
                            scripts.push(path+vPath+ctrls[i].viewsets[j]+'/v'+c.charAt(0).toLowerCase() + c.slice(1));
                        }
                }

                // загружаем скрипты и выполняем колбэк
                that.pvt.components = {};
                require(scripts, function(){
                    var argIndex = 0;
                    for(var i=0; i<ctrls.length; i++) {
                        var className = ctrls[i].className;
                        that.pvt.components[className] = {module:arguments[argIndex], viewsets:{}};
                        var viewsets = ctrls[i].viewsets;
                        argIndex++;
                        if (viewsets) {
                            for (j=0; j < viewsets.length; j++) {
                                that.pvt.components[ctrls[i].className].viewsets[ctrls[i].viewsets[j]] = arguments[argIndex];
                                argIndex++;
                            }
                        }
                    }
                    callback();
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
                var compCallBack = function (obj) {
                    var classGuid = obj.getTypeGuid();
                    var transArr = {};
                    transArr[UCCELLO_CONFIG.classGuids.User] = UCCELLO_CONFIG.classGuids.UserInfo; // User -> UserInfo
                    transArr[UCCELLO_CONFIG.classGuids.Connect] = UCCELLO_CONFIG.classGuids.ConnectInfo; // Connect -> ConnectInfo
                    transArr[UCCELLO_CONFIG.classGuids.Session] = UCCELLO_CONFIG.classGuids.SessionInfo; // Session -> SessionInfo
                    transArr[UCCELLO_CONFIG.classGuids.VisualContext] = UCCELLO_CONFIG.classGuids.VisualContextInfo; // VisualContext -> VisualContextInfo
                    classGuid = transArr[classGuid]? transArr[classGuid]: classGuid;
                    var params = {objGuid: obj.getGuid()};
                    var component = new (that.getConstr(classGuid))(that.pvt.cmsys, params);
                    if (classGuid == "e14cad9b-3895-3dc9-91ef-1fb12c343f10") { // UserInfo
                        that.pvt.user = component;
                    }
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