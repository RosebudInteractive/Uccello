if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
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
        var UccelloClt = UccelloClass.extend({

            init: function(options){
                var that = this;
				this.pvt = {};

                this.pvt.user = null;
                this.pvt.sessionGuid = null;
				var rpc = this.pvt.rpc = new Rpc( { router: this.pvt.router } );

                var clt = this.pvt.clientConnection = new ClientConnection(null, {newTabCallback:options.newTabCallback});
                clt.commClient = options.commClient;

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
                this.pvt.createComponent = function (typeObj, parent, sobj) {
                    var newObj = null;
                    var constr = that.pvt.constructHolder.getComponent(typeObj.getGuid())
                    if (constr && constr.constr) {
                        var params = { ini: sobj, parent: parent.obj, colName: parent.colName };
                        newObj = new constr.constr(that.pvt.cmdataman, params);
                    };
                    return newObj;
                };

                this.pvt.constructHolder.loadControls(function () {
                    var protocol = "ws";
                    if (UCCELLO_CONFIG.webSocketClient.type == UCCELLO_CONFIG.commClientTypes.AJAX)
                        protocol = "http";
                    that.getClient().connect(protocol+"://"+url('hostname')+":"+UCCELLO_CONFIG.webSocketServer.port, {guid:that.getSessionGuid()},  function(result){
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
                            var guidServer = UCCELLO_CONFIG.guids.guidServer;
                            that.pvt.servInterface = result.intf;
                            that.pvt.proxyServer = rpc._publProxy(guidServer, clt.socket, result.intf); // публикуем прокси серверного интерфейса
                        });

                        that.pvt.clientConnection.socket.send({ action: "wfeInterface", type: "method" }, function (result) {
                            var guidWfe = "387e8d92-e2ca-4a94-9732-b4a479ff8bb8";
                            that.pvt.wfeInterface = result.intf;
                            that.pvt.proxyWfe = rpc._publProxy(guidWfe, clt.socket, result.intf); // публикуем прокси интерфейса движка процессов
                        });

                        that.pvt.clientConnection.socket.send({ action: "typeProviderInterface", type: "method" }, function (result) {
                            var guidItf = "90122ac9-2d4a-493a-b6ac-8f5fe3c46590";
                            that.pvt.constructHolder.addTypeProvider(rpc._publProxy(result.intf.classGuid, clt.socket, result.intf)); // добавляем удаленный провайдер типов
                        });
                    });
                });

                this.pvt.dbgApi = {
                    /**
                     * добавить объект типа className с именем objName, в парент parName к коллекции colName
                     * colName - если не указана, то "children"
                     * fields - {Width: 50, Height: 100} - можно пропустить параметр, тогда будут вставляться параметры по умолчанию
                     */
                    add: function(className, objName, fields, parName, colName) {
                        var cm = that.getContextCM();
                        var vc = that.getContext();
                        var parObj = cm.getByName(parName);
                        var id = Math.floor(Math.random() * 100000);
                        var obj = null;
                        if (parObj) {
                            //cm.userEventHandler(that, function () {
                                colName = colName? colName: "Children";
                                if (fields) {
                                    if (!fields['Id']) fields['Id'] = id;
                                    fields['Name'] = objName;
                                } else
                                    fields = {Id:id, Name:objName, Width: 50, Height: 100};
                                obj = new (vc.getConstructorHolder().getComponent(UCCELLO_CONFIG.classGuids[className]).constr)(cm, {parent: parObj, colName: colName, ini:{fields:fields} });
                            //});
                        }
                        return obj;
                    },

                    /**
                     * получить объект по имени
                     * например можно сделать $u.get("Container1").width(100); - установить ширину контейнера с именем Container1 = 100
                     */
                    get: function(objName) {
                        var cm = that.getContextCM();
                        var obj = cm.getByName(objName);
                        return obj;
                    },

                    /**
                     * вызов userEventHandler
                     */
                    r: function() {
                        var cm = that.getContextCM();
                        cm.userEventHandler(that, function () {});
                    }
                };
            },

            createController: function(done){
                var that = this;
                this.pvt.clientConnection.socket.send({action:"getGuids", type:'method'}, function(result){

                    that.pvt.guids = result;

                    // создаем  контроллер и бд
                    that.pvt.controller = new MemDBController();

                    // создаем бд менеджера метаинформации
                    var dbp = {name:"DatamanDB", proxyMaster : {connect: that.pvt.clientConnection.socket, guid: '66d43749-223a-48cb-9143-122381b9ed3c'}};
                    that.pvt.cmdataman = new ControlMgr( { controller: that.pvt.controller, dbparams: dbp},null,that.pvt.clientConnection.socket, function(){
                        that.pvt.cmdataman.subscribeRoots(['77153254-7f08-6810-017b-c99f7ea8cddf@2009'], null, that.pvt.createComponent);
                    });

                    // создаем системную бд
                    var dbp = {name:"System", proxyMaster : {connect: that.pvt.clientConnection.socket, guid: that.pvt.guids.masterSysGuid}};
					that.pvt.cmsys = new ControlMgr( { controller: that.pvt.controller, dbparams: dbp},null,that.pvt.clientConnection.socket, done,that.pvt.proxyServer);

                    // создаем мастер базу для клиентского контекста (является "держателем" клиентского контекста
                    dbp = {name:"MasterClient", kind: "master"};
                    that.pvt.cmclient = new ControlMgr( { controller: that.pvt.controller, dbparams: dbp},null,that.pvt.clientConnection.socket,null,that.pvt.proxyServer);
                    that.pvt.cmclient.buildMetaInfo('client', function(){
                        that.pvt.clientConnection.init(that.pvt.cmclient, {});
                    });

                });
            },
			
			getClient: function() {
				return this.pvt.clientConnection;
			},
			
			getController: function() {
				return this.pvt.controller;
			},

            getClientCM: function() {
				return this.pvt.cmclient;
			},

			getSysCM: function() {
				return this.pvt.cmsys;
			},

			getDatamanCM: function() {
				return this.pvt.cmdataman;
			},

			getContext: function() {
				return this.pvt.vc;
			},
			
			getContextCM: function() {
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
                        proxyWfe: this.pvt.proxyWfe,
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
			 *        params.side - "client" для клиентского контекста, "server" для серверного
			 * @param cbfinal - финальный коллбэк
			 * @param renderRoot - коллбэк на рендеринг, если не передается, то контекст активируется, но остается скрытым
             */	
			setContext: function(params, cbfinal, renderRoot) {
                var that = this;

                function cbfinal2(result2){
                    result2 = result2 && result2.guids ? result2.guids : result2;
                    // that.getContext().renderForms(result2, false);
					that.getContext().allDataInit(false);
                    if (cbfinal)
                        cbfinal(result2);
                }

                var s = this.pvt.clientConnection.socket;
                var p = { socket: s, proxyServer: this.pvt.proxyServer, proxyWfe: this.pvt.proxyWfe }
                p.formGuids = params.formGuids;
                p.constructHolder = this.pvt.constructHolder; //  ссылка на хранилище конструкторов

                if (params.side == 'client') {
                    this.pvt.vc = this.pvt.cmclient.get(params.vc);
                    if (this.pvt.vc) this.pvt.vc.on(this.pvt.cmclient, p, cbfinal2, renderRoot);
                } else {
                    this.pvt.vc = this.pvt.cmsys.get(params.vc);
                    if (this.pvt.vc) this.pvt.vc.on(this.pvt.cmsys, p, cbfinal2, renderRoot);
                }
			},


            /**
             * Создать рут
             * @param formGuids массив гуидов
             * @param rtype тип данных "res", "data"
             * @param callback
             */
            createRoot: function(formGuids, rtype, callback, context) {
				if (!context.isOn()) return false;
				var cm = context ? context.getContextCM() : this.getContext().getContextCM();
				cm.getRoots(formGuids, {rtype:rtype }, callback);
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
                var compCallBack = function (typeObj, parent, sobj) {
                    var classGuid = typeObj.getGuid();
                    var transArr = {};
                    transArr[UCCELLO_CONFIG.classGuids.User] = UCCELLO_CONFIG.classGuids.UserInfo; // User -> UserInfo
                    transArr[UCCELLO_CONFIG.classGuids.Connect] = UCCELLO_CONFIG.classGuids.ConnectInfo; // Connect -> ConnectInfo
                    transArr[UCCELLO_CONFIG.classGuids.Session] = UCCELLO_CONFIG.classGuids.SessionInfo; // Session -> SessionInfo
                    classGuid = transArr[classGuid]? transArr[classGuid]: classGuid;
					var params = {ini: sobj, parent: parent.obj, colName: parent.colName};
                    var component = new (that.pvt.constructHolder.getComponent(classGuid).constr)(that.pvt.cmsys, params);
                    if (classGuid == UCCELLO_CONFIG.classGuids.UserInfo) { // UserInfo
                        that.pvt.user = component;
                    }
                    return component;
                };
                this.getSysCM().setDefaultCompCallback(compCallBack);
               // this.getSysCM().subscribeRoots(this.pvt.guids.sysRootGuid, callback, compCallBack);
				this.getSysCM().getRoots(this.pvt.guids.sysRootGuid, { rtype: "res"  },callback);
            },

            deauthenticate: function(callback){
                var that = this;
                that.getClient().deauthenticate(function(result){
                    that.pvt.sessionGuid = result.user.session.guid;
                    that.pvt.sessionId = result.user.session.id;
                    that.pvt.guids.sysRootGuid = result.user.guid;
                    that.getSysCM().subscribeRoots(that.pvt.guids.sysRootGuid, callback);
                });
            },

            getDebugApi: function(){
                return this.pvt.dbgApi;
            }


        });
        return UccelloClt;
    }
);