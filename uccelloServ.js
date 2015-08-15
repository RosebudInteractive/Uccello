if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./connection/socket', './system/logger', './dataman/dataman', 'ws', './connection/router', './connection/userSessionMgr',
	'./system/rpc', './controls/controlMgr', './resman/resman', './system/constructHolder', './process/processDispatcher'],
    function (Socket, Logger, Dataman, WebSocketServer, Router, UserSessionMgr,
        Rpc, ControlMgr, Resman, ConstructHolder, ProcessDispatcher) {
	
		var guidServer = UCCELLO_CONFIG.guids.guidServer;
	
		var interface1 = {
		
			className: "Interfsrv",
			classGuid: UCCELLO_CONFIG.guids.Interfsrv,

			loadResources: "function",
			queryDatas: "function"
		}
	
        var UccelloServ = UccelloClass.extend({
            init: function(options){
                var that = this;
                this._connectId = 0;
				this.pvt = {};
                //this.pvt.logger = new Logger();
                this.pvt.router = new Router();

				var rpc = this.pvt.rpc = new Rpc( { router: this.pvt.router } );
				
				this.pvt.proxyServer = rpc._publ(this, interface1); //

				this.pvt.constructHolder = new ConstructHolder();
				this.pvt.constructHolder.loadControls();
				this.pvt.userSessionMgr = new UserSessionMgr(this.getRouter(), {
				    authenticate: options.authenticate,
				    rpc: this.pvt.rpc,
				    proxyServer: this.pvt.proxyServer,
				    proxyWfe: this.pvt.proxyWfe,
				    constructHolder: this.pvt.constructHolder
				});

				this.pvt.proxyWfe = null;
				if (options && options.engineSingleton) {
				    options.engineSingleton.initInstance({
				        dbController: this.getUserMgr().getController(),
				        constructHolder: this.pvt.constructHolder,
				        router: this.pvt.router
				    });
				    this.pvt.wfe = options.engineSingleton.getInstance();
				    this.pvt.proxyWfe = rpc._publ(this.pvt.wfe, this.pvt.wfe.getInterface());
				    this.getUserMgr().proxyWfe(this.pvt.proxyWfe);
				    this.createSimpleAddObjectProcessDef();
				};

				new ProcessDispatcher({ proxyWfe: this.pvt.proxyWfe });

				this.pvt.dataman = new Dataman(this.getRouter(), that.getUserMgr().getController(), this.pvt.constructHolder, rpc);
                this.pvt.resman = new Resman(that.getUserMgr().getController());
                this.pvt.commServer = options.commServer;

                this.getRouter().add('getGuids', function(data, done) {
                    var user = that.getUserMgr().getConnect(data.$sys.socket.getConnectId()).getSession().getUser();
                    var userData = user.getData();
                    var result = {
						masterSysGuid:that.getUserMgr().getSysCM().getGuid(),
						sysRootGuid:user.getGuid()
                    };
                    done(result);
                    return result;
                });
				
				
				this.getRouter().add('testIntf', function(data, done) { done({ intf: interface1 }); }); 

                this.getRouter().add('getSessions', function(data, done) {
                    var sessions = that.getUserMgr().getSessions();
                    result = {sessions:[]};
                    for(var i in sessions) {
                        var session = {id:i, date:sessions[i].date, connects:[]};
                        var connects = sessions[i].item.getConnects();
                        for(var j in connects) {
                            var connect = {id:j, date:that.getUserMgr().getConnectDate(j)};
                            session.connects.push(connect);
                        }
                        result.sessions.push(session);
                    }
                    done(result);
                    return result;
                });

                this.getRouter().add('loadRes', function(data, done) {
                    var result = {res:this.getUserMgr().loadRes(this.getUserMgr().getController().guid())};
                    done(result);
                });

                // запускаем вебсокетсервер
                if (this.pvt.commServer != null)
                    this.pvt.commServer.setEventHandlers({
                        close: function (event, connectId) { // при закрытии коннекта
                            var connect = that.getUserMgr().getConnect(connectId);
                            if (connect)
                                connect.closeConnect();
                            if (DEBUG)
                                console.log("отключился клиент: " + connectId);
                        },
                        router: function (data, connectId, socket, done) {
                            //if (DEBUGMES)
                            //    console.log('сообщение с клиента ' + connectId + ':', data);

                            // логирование входящих запросов
                            //that.pvt.logger.addLog(data);

                            // обработчик
                            data.args.$sys = {};
                            data.args.$sys.connect = that.getUserMgr().getConnect(connectId);
                            data.args.$sys.socket = socket;
                            that.getRouter().exec(data.args, done);
                        }
                    });
                //this.wss = new WebSocketServer.Server(UCCELLO_CONFIG.webSocketServer);
                //this.wss.on('connection', function(ws) {
                //    // id подключения
                //    that._connectId++;
                //    new Socket(ws, {
                //        side: 'server',
                //        connectId: that._connectId,
                //        close: function(event, connectId) { // при закрытии коннекта
                //            var connect = that.getUserMgr().getConnect(connectId);
                //            if (connect)
                //                connect.closeConnect();
                //            if (DEBUG)
                //                console.log("отключился клиент: " + connectId);
                //        },
                //        router: function(data, connectId, socket, done) {
                //            if (DEBUG)
                //                console.log('сообщение с клиента '+connectId+':', data);

                //            // логирование входящих запросов
                //            that.pvt.logger.addLog(data);

                //            // обработчик
                //            data.args.$sys = {};
                //            data.args.$sys.connect = that.getUserMgr().getConnect(connectId);
                //            data.args.$sys.socket = socket;
                //            that.getRouter().exec(data.args, done);
                //        }
                //    });
                //});
            },

            createSimpleAddObjectProcessDef: function () {
                if (this.pvt.wfe) {
                    var wfe = this.pvt.wfe;
                    var def = wfe.newProcessDefinition();
                    def.definitionID("8349600e-3d0e-4d4e-90c8-93d42c443ab3");
                    def.addParameter("CurrentObj").value("");
                    def.addParameter("IsDone").value(false);

                    //var taskStart = def.addUserTask("StartTask");
                    var taskStart = def.addUserTask("StartTask", {
                        moduleName: 'scriptTask',
                        methodName: 'execObjMethodCreate'
                    });

                    var req = taskStart.addRequest("ObjCreateRequest");
                    req.addParameter("objURI");
                    req.addParameter("func");
                    req.addParameter("args");

                    //var taskScriptObjCreate = def.addScriptTask("ObjCreateScript", {
                    //    moduleName: 'scriptTask',
                    //    methodName: 'execObjMethodCreate'
                    //});

                    //var taskObjEdit = def.addUserTask("ObjEditTask");
                    var taskObjEdit = def.addUserTask("ObjEditTask", {
                        moduleName: 'scriptTask',
                        methodName: 'execObjMethodEdit'
                    });

                    req = taskObjEdit.addRequest("ObjModifRequest");
                    req.addParameter("objURI");
                    req.addParameter("func");
                    req.addParameter("args");

                    //var taskScriptObjEdit = def.addScriptTask("ObjEditScript", {
                    //    moduleName: 'scriptTask',
                    //    methodName: 'execObjMethodEdit'
                    //});

                    var taskFin = def.addActivity('finish');
                    var gateway = def.addExclusiveGateway('CheckIfDone');


                    def.connect(taskStart, taskObjEdit);

                    def.connect(taskObjEdit, gateway);
                    def.connect(gateway, taskObjEdit, {
                        moduleName: 'scriptTask',
                        methodName: 'checkIfNotDone'
                    });

                    def.connect(gateway, taskFin, {
                        moduleName: 'scriptTask',
                        methodName: 'checkIfDone'
                    });

                    wfe.addProcessDefinition(def);
                };
            },

			getUserMgr: function() {
				return this.pvt.userSessionMgr;
			},
			
			getRouter: function() {
				return this.pvt.router;
			},
			
			getGuid: function() {
				return guidServer;
			},

            /**
             * Загрузить ресурсы по их гуидам - выдает сериализованные представления, которые затему нужно десериализовать в memDataBase
			 * @param rootGuids - массив гуидов ресурсов
             * @returns {obj} - массив ресурсов в result.datas
             */
			loadResources: function(rootGuids, done) {
				var result = [];
				for (var i=0; i<rootGuids.length; i++) 
					result.push(this.pvt.resman.loadRes(rootGuids[i]));
                if (DEBUG)
				    console.log("load resources");
				if (done !== undefined && (typeof done == "function")) done({ datas: result });
				return { datas: result };// временная заглушка
			},

            /**
             * Загрузить данные по их гуидам - ???
			 * @param rootGuids - массив гуидов данных
             * @returns {obj} - массив ресурсов в result.datas
             */			
			queryDatas: function(rootGuids, expr, done) {
                if (DEBUG)
				    console.log("queryDatas");
				if (done !== undefined && (typeof done == "function"))
                    this.pvt.dataman.loadQuery(rootGuids[0],expr, function(result){
                        done({ datas: [result] });
                    });
				//return "XXX";
			}
			
			
			
        });
        return UccelloServ;
    }
);