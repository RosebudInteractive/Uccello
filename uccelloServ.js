if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./connection/socket', './system/logger', './dataman/dataman', 'ws', './connection/router', './connection/userSessionMgr',
	'./system/rpc','./controls/controlMgr', './resman/resman'],
    function(Socket, Logger, Dataman, WebSocketServer, Router, UserSessionMgr, Rpc, ControlMgr, Resman) {
	
		var guidServer = "d3d7191b-3b4c-92cc-43d4-a84221eb35f5";
	
		var interface1 = {
		
			className: "Interfsrv",
			classGuid: "ef9bfa83-8371-6aaa-b510-28cd83291ce9",

			loadResources: "function",
			queryDatas: "function"
		}
	
        var UccelloServ = Class.extend({
            init: function(options){
                var that = this;
                this._connectId = 0;
				this.pvt = {};
                this.pvt.logger = new Logger();
                this.pvt.router = new Router();

				var rpc = this.pvt.rpc = new Rpc( { router: this.pvt.router } );
				
				this.pvt.proxyServer = rpc._publ(this, interface1); //


                this.pvt.userSessionMgr = new UserSessionMgr(this.getRouter(), {authenticate:options.authenticate, rpc:this.pvt.rpc, proxyServer: this.pvt.proxyServer});
                this.pvt.dataman = new Dataman(this.getRouter(), that.getUserMgr().getController());
                this.pvt.resman = new Resman(that.getUserMgr().getController());

                this.getRouter().add('getGuids', function(data, done) {
                    var user = that.getUserMgr().getConnect(data.$sys.socket.getConnectId()).getSession().getUser();
                    var userData = user.getData();
                    var result = {
                        masterSysGuid:that.getUserMgr().dbsys.getGuid(),
                        sysRootGuid:user.getObj().getGuid()
                    };
                    done(result);
                    return result;
                });
				
				
				this.getRouter().add('testIntf', function(data, done) { done({ intf: interface1 }); }); 

                /*this.getRouter().add('getRootGuids', function(data, done) {
                    //console.log(that.getUserMgr().getController().getDB(data.db))
                    var result = {
                        roots: that.getUserMgr().getController().getDB(data.db).getRootGuids(data.rootKind)
                    };
                    done(result);
                    return result;
                });*/

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

				//this.getRouter().add('createRootS', function() { return that.routerCreateRootS.apply(that, arguments); });


                // запускаем вебсокетсервер
                this.wss = new WebSocketServer.Server(UCCELLO_CONFIG.webSocketServer);
                this.wss.on('connection', function(ws) {
                    // id подключения
                    that._connectId++;
                    new Socket(ws, {
                        side: 'server',
                        connectId: that._connectId,
                        close: function(event, connectId) { // при закрытии коннекта
                            var connect = that.getUserMgr().getConnect(connectId);
                            if (connect)
                                connect.closeConnect();
                            if (DEBUG)
                                console.log("отключился клиент: " + connectId);
                        },
                        router: function(data, connectId, socket, done) {
                            if (DEBUG)
                                console.log('сообщение с клиента '+connectId+':', data);

                            // логирование входящих запросов
                            that.pvt.logger.addLog(data);

                            // обработчик
                            data.args.$sys = {};
                            data.args.$sys.connect = that.getUserMgr().getConnect(connectId);
                            data.args.$sys.socket = socket;
                            that.getRouter().exec(data.args, done);
                        }
                    });
                });
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
				return "XXX";
			}
			
			
			
        });
        return UccelloServ;
    }
);