if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memDataBase', '../system/event'],
	function(MemDataBase, Event) {
		var MemDBController = UccelloClass.extend({
		
			init: function(router){
				this.pvt = {};
				this.pvt.dbCollection = {};
				this.pvt.bufdeltas = {};		// буферизация входящих дельт
                this.event = new Event();
                if (router) {
                    var that = this;
                    router.add('subscribe', function(){ return that.routerSubscribe.apply(that, arguments); });
                    router.add('unsubscribe', function(){ return that.routerUnsubscribe.apply(that, arguments); });
                    router.add('subscribeRoot', function(){ return that.routerSubscribeRoot.apply(that, arguments); });
					router.add('subscribeManyRoots', function(){ return that.routerSubscribeManyRoots.apply(that, arguments); });
                    router.add('sendDelta', function(){ return that.routerSendDelta.apply(that, arguments); });
                }
			},
			
			createLocalProxy: function(db) {
				var dbInfo = {};
				dbInfo.db = db;
				dbInfo.kind = "local";
				dbInfo.guid = db.getGuid();
				this.pvt.dbCollection[db.getGuid()] = dbInfo;
				return dbInfo;
			},

			findOrCreateProxy: function(proxy) {
				var p=this.getProxy(proxy.guid);
				if (p)  return p;
				
				var dbInfo = {};
				dbInfo.db = null;
				dbInfo.kind = "remote";
				dbInfo.guid = proxy.guid;
				dbInfo.connect = proxy.connect;
				this.pvt.dbCollection[proxy.guid] = dbInfo;
				return dbInfo;
			},			
	


            routerSubscribe: function(data, done) {
                var result = {data: this.onSubscribe({connect:data.$sys.connect, guid:data.slaveGuid}, data.masterGuid)};
                done(result);
            },

            routerUnsubscribe: function(data, done) {
                this.getDB(data.masterGuid).onUnsubscribe(data.$sys.socket.getConnectId(), data.slaveGuid);
                done({});
            },

            routerSubscribeRoot: function(data, done) {
                var masterdb = this.getDB(data.masterGuid);
                if (!masterdb.isSubscribed(data.slaveGuid)) // если клиентская база еще не подписчик
                    this.onSubscribe({connect:data.$sys.socket.getConnectId(), guid:data.slaveGuid}, data.masterGuid );
                var result = {data:masterdb.onSubscribeRoots(data.slaveGuid, data.objGuids)};
                done(result);
            },
			
            routerSubscribeManyRoots: function(data, done) {
                var masterdb = this.getDB(data.masterGuid);
                if (!masterdb.isSubscribed(data.slaveGuid)) // если клиентская база еще не подписчик
					this.onSubscribe({connect:data.$sys.socket.getConnectId(), guid:data.slaveGuid}, data.masterGuid );
                var result = {data:masterdb.onSubscribeRoots(data.slaveGuid, data.objGuids)};
                done(result);
            },


            routerSendDelta: function(data, done) {
				if (DEBUG) console.time('applyDeltas');
                this.applyDeltas(data.dbGuid, data.srcDbGuid, data.delta);
				//this.remoteCallExec(this, "applyDeltas",[data.dbGuid, data.srcDbGuid, data.delta],null,data.args.trGuid,done);
				if (DEBUG) console.timeEnd('applyDeltas');

                done({data: {dbVersion: this.getDB(data.dbGuid).getVersion() }});
				
				this.event.fire({
                    type: 'end2ApplyDeltas',
                    target: this,
					db: this.getDB(data.dbGuid)
                });
				
            },
			
			// сгенерировать guid
			guid: function () {
			
				function s4() {
				  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
				};
				
					return s4() + s4() +'-'+ s4()  +'-'+ s4() +'-'+
						 s4() +'-'+ s4() + s4() + s4();
			},
			
			
			// создать новую базу данных в данном контроллере
			newDataBase: function(init,cb) {
				return  new MemDataBase(this,init,cb);
			},
			
			// удалить базу из коллекции
			delDataBase: function(guid, cb) {
				var db = this.getDB(guid);

				if (db!=undefined) {
					if (db.isMaster()) {
						// TODO отписать форсированно подписанных клиентов!
						delete this.pvt.dbCollection[guid];
					}
					else {
						var master = db.getProxyMaster();
                        var that=this;
                        if (master.kind == "remote")
                            master.connect.send({action:'unsubscribe', type:'method', slaveGuid:guid, masterGuid:master.guid},function(){
                                delete that.pvt.dbCollection[guid];
                                if (cb !== undefined && (typeof cb == "function")) cb();
                            });
                        else {
                            this.onUnsubscribe(p.connect, guid);
                            delete this.pvt.dbCollection[guid];
                            if (cb !== undefined && (typeof cb == "function")) cb();
                        }
						// TODO если есть подписчики - отписать их тоже
					}
				}
				
			},

			// подписать базу данных на ее мастер (только из инит)
            _subscribe: function(db,proxyMaster,cb) {
				var p=this.findOrCreateProxy(proxyMaster);
				if (p.kind == "remote")
					p.connect.send({action:'subscribe', type:'method', slaveGuid:db.getGuid(), masterGuid: p.guid},cb);
					//db.getConnection().send({action:'subscribe', guid:db.getGuid()});
				else {
					this.onSubscribe(this.getProxy(db.getGuid()),p.db.getGuid());
					if (cb !== undefined && (typeof cb == "function")) cb();
				}				
				// TODO обработать асинхронность
            },
			
			// подписать proxy на базу данных с гуидом dbGuid, относящуюся к данному контроллеру
			// proxy - прокси базы, которая подписывается
			// masterGuid - база данных, на которую подписываем
            onSubscribe: function(proxy,masterGuid) {
				var p=this.findOrCreateProxy(proxy);				
				db=this.getDB(masterGuid);
				db.onSubscribe(p);
				return { dbVersion: db.getVersion() };
            },

            /**
             * подписать базу db на рутовые элементы с гуидами rootGuids
			 * @param {MemDataBase} db - база данных
             * @param rootGuids - одиночный элемент или массив элементов с гуидами корневых элементов
             * @param cb - вызывается после того, как подписка произошла и данные сериализовались в базе
			 * @param cb2 - вызывается по ходу создания объектов
             */
			subscribeRoots: function(db,rootGuids, cb, cb2) {
			
				if (!cb2) cb2 = db.getDefaultCompCallback(); 
					
				var p = db.getProxyMaster();
				if (p.kind == "local") { // мастер-база доступна локально
				    var newObjs = p.db.onSubscribeRoots(db.getGuid(), rootGuids);

				    // добавление недостающих конструкторов компонентов
				    db.addLocalComps(newObjs);

					var rgNew = [];
					for (var i=0; i<newObjs.length; i++) {
						var o=db.deserialize(newObjs[i],{ mode:"RW"},cb2);
						rgNew.push(o.getGuid());

						
					}
					if (cb !== undefined && (typeof cb == "function")) cb(rgNew);
				}
				else { // мастер-база доступна удаленно
					callback2 = function(obj) {

					    // добавление недостающих конструкторов компонентов
					    db.addRemoteComps(obj.data, function () {
					        var rgNew = [];
					        for (var i = 0; i < obj.data.length; i++) {
					            o = db.deserialize(obj.data[i], { mode: "RW" }, cb2);
					            rgNew.push(o.getGuid());
					        }
					        if (cb !== undefined && (typeof cb == "function")) cb(rgNew);
					    });
					}
					p.connect.send({action:'subscribeManyRoots', type:'method', slaveGuid:db.getGuid(), masterGuid: p.guid, objGuids:rootGuids},callback2);

					// TODO обработать асинхронность
				}
			
			},
			
			
			// отписать либо все базы данного коннекта либо БД с гуидом guid
			onUnsubscribe: function(connect, dbGuid) {
				if (dbGuid==undefined) {
					
				}
				else {
					
				}
			},
			
            getDB: function(guid){

                // поиск по гуиду
				var dbInfo = this.pvt.dbCollection[guid];
				if (dbInfo) {
					if (dbInfo.kind == "local")
						return dbInfo.db;
					else return null;
				}

                return null;
            },

			/**
			 * Получит список баз данных без proxy
			 * @returns {Array}
			 */
            getDbList: function(){
				var dbCollection = this.pvt.dbCollection;
				var dbList = [];
				for(var guid in dbCollection)
					if (dbCollection[guid].db) dbList.push(dbCollection[guid]);
                return dbList;
            },
			
			getProxy: function(dbGuid) {
				return this.pvt.dbCollection[dbGuid];
			},

            /**
             * Отключение коннекта
             * @param connectId
             */
            onDisconnect: function(connectId) {
                for(var i in this.pvt.dbCollection) {
                    if (this.pvt.dbCollection[i].db)
                        this.pvt.dbCollection[i].db.onUnsubscribe(connectId);
                }
            },

            applyDeltas: function(dbGuid, srcDbGuid, delta, done) {

				if (DEBUG) console.log("incoming delta: ", delta);

                // находим рутовый объект к которому должна быть применена дельта
                var db  = this.getDB(dbGuid);
				var cdelta = delta;

				if (cdelta.constructors) {
				    // Пришли конструкторы новых типов

				    console.log("Constructors have been received with DELTA!");
				    var constr = cdelta.constructors;
				    var constructHolder = (constr.length > 0) && db.getContext() ? db.getContext().getConstructorHolder() : null;
				    if (constructHolder) {
				        for (var i = 0; i < constr.length; i++) {
				            constructHolder.addCompByConstr(constr[i].guid, constr[i].code);
				        };
				    };

				} else {
				    // VER проверка на применимость дельт				
				    var ro = db.getObj(cdelta.rootGuid);
				    if (ro) {
				        var lval = ro.getRootVersion("valid");
				        var ldraft = ro.getRootVersion();
				        var dver = cdelta.ver;
				        if (db.isMaster()) { // мы в мастер-базе (на сервере или на клиенте в клиентском контексте)
				            if (lval > dver) { // на сервере подтвержденная версия не может быть больше пришедшей

				                console.log("cannot sync server -  valid version:" + lval + "delta version:" + dver);
				                return;
				            }
				        }
				        else { // на клиенте (slave)
				            if (lval <= dver - 1) { // нормальная ситуация, на клиент пришла дельта с подтвержденной версией +1
				                // если к тому времени на клиенте появилась еще драфт версия - откатываем ее чтобы не было конфликтов
				                if (ldraft > lval) {
				                    console.log("UNDO if (ldraft>lval) : " + ro.getGuid() + "valid version: " + lval + " delta version:" + dver);
				                    db.undo(lval);
				                }
				            }
				            else { // ошибка синхронизации - ненормальная ситуация, в будущем надо придумать как это обработать
				                console.log("cannot sync client -  valid version:" + lval + "delta version:" + dver);
				                return;
				            }
				        }
				    }


				    if (("items" in cdelta) && cdelta.items.length > 0) {
				        var root = db.getRoot(cdelta.rootGuid);

				        if (cdelta.items[0].newRoot)
				            var rootObj = db.deserialize(cdelta.items[0].newRoot, {}, db.getDefaultCompCallback());
				        else {
				            if (!root) {
				                var msg = "Missing ROOT:\n" + JSON.stringify(delta);
				                console.log(msg);
				                throw new Error(msg);
				            };
				            rootObj = root.obj;
				        };

				        rootObj.getLog().applyDelta(cdelta);

				        // Если это мета-информация, то необходимо ее перестроить,
                        //   поскольку могли добавиться новые типы
				        if (cdelta.rootGuid === UCCELLO_CONFIG.guids.metaRootGuid)
				            db._buildMetaTables();
				    }

				    db.setVersion("valid", cdelta.dbVersion);
				    db.setVersion("sent", cdelta.dbVersion);

				    if (cdelta.rootGuid) {
				        db.getObj(cdelta.rootGuid).setRootVersion("valid", cdelta.ver);
				        db.getObj(cdelta.rootGuid).setRootVersion("sent", cdelta.ver);
				    }
				};

				this.propagateDeltas(dbGuid,srcDbGuid,[cdelta]);
		
				if (done) done();
						
            },

			
            /**
             * Сгенерировать и разослать "дельты" 
             * @param dbGuid - гуид базы данных, для которой генерим дельты
             */
			genDeltas: function(dbGuid, callback, sendFunc) {
				var db  = this.getDB(dbGuid);
				var deltas = db.genDeltas();
				if (deltas.length > 0) {
				    this.propagateDeltas(dbGuid, null, deltas, callback, sendFunc);
				    if (db.getVersion("sent") < db.getVersion()) db.setVersion("sent", db.getVersion());

				    for (var i = 0; i < deltas.length; i++) {
				        if (deltas[i].rootGuid) {
				            var obj = db.getRoot(deltas[i].rootGuid).obj;
				            obj.setRootVersion("sent", obj.getRootVersion());
				        }
				    }
				}
				else
				    if (callback)
				        setTimeout(callback, 0);
			},
			
			// послать подписчикам и мастеру дельты которые либо сгенерированы локально либо пришли снизу либо сверху
			propagateDeltas: function(dbGuid, srcDbGuid, deltas,callback, sendFunc) {

				function cb(result) { // VER обработка ответа от сервера по итогам отсылки дельт

					if (DEBUG) console.log("CALLBACK PROPAGATE DELTAS",result,deltas);
					
					for (var guid in rootv) // апдейтим подтвержденные версии рутов после того, как успешно применили их на сервере
						if (db.getObj(guid).getRootVersion("valid")<rootv[guid])
							db.getObj(guid).setRootVersion("valid",rootv[guid]);
						else 
						 console.log("SYNC VERS CB PROBLEM: "+rootv[guid]+"Clt Ver:"+db.getObj(guid).getRootVersion("valid")+"Cb Ver:"+rootv[guid]);
					
					
					if (db.getVersion("valid")<result.data.dbVersion) 
						db.setVersion("valid", result.data.dbVersion); 
						
					if (db.getVersion("valid")>result.data.dbVersion) { 
						// откатить до версии сервера
						//db.undo(result.data.dbVersion);
						console.log("SYNC VERS CBDB PROBLEM - Clt Ver:"+db.getVersion("valid")+"Cb Ver:"+result.data.dbVersion);
					}

					if (callback)
					    callback(result);
				}

				var db  = this.getDB(dbGuid);
				var rootv = {};

				for (var i=0; i<deltas.length; i++) {
								
					var delta = deltas[i];

					if (srcDbGuid != db.getGuid()) {
						// послать в мастер
						var proxy = db.getProxyMaster();
						if (proxy != undefined && proxy.guid != srcDbGuid) {
							if (proxy.kind == "local") {
								//TODO
								//db.getRoot(proxy.guid).obj.getLog().applyDelta(delta); 
								// TODO валидировать версию
								}
							else {

								//if (DEBUG) console.log("sending delta db: "+db.getGuid(), delta);
								var data = {action:"sendDelta", type:'method', delta:delta, dbGuid:proxy.guid, srcDbGuid: db.getGuid(), trGuid: db.getCurTranGuid()};
								
								if (sendFunc)
								  sendFunc(data,cb);
								else
								  proxy.connect.send(data,cb);
							}
						}
					}

					var root = db.getRoot(delta.rootGuid);	
					var emptyDelta = null;
					for(guid in root.subscribers) {
						var subscriber = root.subscribers[guid];

						if (subscriber.kind == 'remote' && srcDbGuid != guid && (!delta.subscribers || (delta.subscribers && delta.subscribers[subscriber.guid]))) {
							var trGuid = db.getCurTranGuid();
							subscriber.connect.send({action:"sendDelta", delta:delta, dbGuid:subscriber.guid, srcDbGuid: db.getGuid(), trGuid:trGuid});
							if (DEBUG) console.log("sent to DB : "+subscriber.guid);
							}
						else {
							if (delta.subscribers && (!delta.subscribers[subscriber.guid])) { // послать пустую дельту с версией
								if (!emptyDelta) { 
									emptyDelta = {};
									emptyDelta.ver = delta.ver;
									emptyDelta.rootGuid = delta.rootGuid;
									emptyDelta.trGuid = delta.trGruid;
									emptyDelta.dbVersion = delta.dbVersion;
								}
								
								subscriber.connect.send({action:"sendDelta", delta:emptyDelta, dbGuid:subscriber.guid, srcDbGuid: db.getGuid(), trGuid:trGuid});
							}
						}
					}
						
					if (delta.rootGuid) // запоминаем версии рутов, чтобы проапдейтить их в колбэке
						rootv[delta.rootGuid] = db.getObj(delta.rootGuid).getRootVersion();
					
				}
			}			
			
        });
		return MemDBController;
	}
);