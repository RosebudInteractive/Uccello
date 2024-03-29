if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./connection/socket', './system/logger', './dataman/dataman', 'ws', './connection/router', './connection/userSessionMgr',
	'./system/rpc', './controls/controlMgr', './resman/resman', './system/constructHolder', './process/processDispatcher',
    './system/tracer/manager', './dataman/adapters/processAdapter'],
    function (Socket, Logger, Dataman, WebSocketServer, Router, UserSessionMgr,
        Rpc, ControlMgr, Resman, ConstructHolder, ProcessDispatcher, TraceManager, ProcessAdapter) {
	
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

                this.pvt.resman = new Resman(this.getUserMgr().getController(), this.pvt.constructHolder, this.pvt.proxyServer);

				this.pvt.proxyWfe = null;
				if (options && options.engineSingleton) {
				    options.engineSingleton.initInstance({
				        dbController: this.getUserMgr().getController(),
				        constructHolder: this.pvt.constructHolder,
				        router: this.pvt.router,
                        resman: this.pvt.resman,
                        proxy : this.pvt.proxyServer,
                        rpc : rpc
				    });
				    this.pvt.wfe = options.engineSingleton.getInstance();
				    this.pvt.proxyWfe = rpc._publ(this.pvt.wfe, this.pvt.wfe.getInterface());
				    this.getUserMgr().proxyWfe(this.pvt.proxyWfe);
				};

				new ProcessDispatcher({ proxyWfe: this.pvt.proxyWfe });

				this.pvt.dataman = new Dataman(this.getRouter(), that.getUserMgr().getController(), this.pvt.constructHolder, rpc, this.pvt.resman);
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
				
                new ProcessAdapter(this.pvt.dataman, this.pvt.proxyWfe,
                    this.getRouter(), that.getUserMgr().getController(), this.pvt.constructHolder, rpc);

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
                this.pvt.resman.loadRes(rootGuids, function(result){
                    if (result.result === 'OK') {
                        var _bodies = [];
                        result.datas.forEach(function (element) {
                            if (element.hasOwnProperty('resource')) {
                                _bodies.push(element.resource)
                            }
                        })
                        done({datas: _bodies, result : 'OK'})
                    } else {
                        done(result)
                    }
                })

                if (DEBUG)
				    console.log("load resources");
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