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
				//this.pvt.defaultCompCallback = null; // коллбэк по умолчанию для создания компонентов

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
			
				if (!cb2) cb2 = db.getDefaultCompCallback(); //cb2 = this.pvt.defaultCompCallback;
					
				var p = db.getProxyMaster();
				if (p.kind == "local") { // мастер-база доступна локально
					var newObjs = p.db.onSubscribeRoots(db.getGuid(),rootGuids);
					var rgNew = [];
					for (var i=0; i<newObjs.length; i++) {
						var o=db.deserialize(newObjs[i],{ mode:"RW"},cb2);
						rgNew.push(o.getGuid());
						if (cb2!==undefined)  // запомнить коллбэк
							db._cbSetNewObject(o.getGuid(),cb2);
						
					}
					if (cb !== undefined && (typeof cb == "function")) cb(rgNew);
					//if (cbfinal !== undefined && (typeof cbfinal == "function")) cbfinal();
				}
				else { // мастер-база доступна удаленно
					callback2 = function(obj) {
						var rgNew = [];
						for (var i=0; i<obj.data.length; i++) {
							o=db.deserialize(obj.data[i],{ mode:"RW"},cb2);
							rgNew.push(o.getGuid());
							if (cb2!==undefined)  // запомнить коллбэк
								db._cbSetNewObject(o.getGuid(),cb2);						
						}
						if (cb !== undefined && (typeof cb == "function")) cb(rgNew);
						//if (cbfinal !== undefined && (typeof cbfinal == "function")) cbfinal();
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

			// пока только 1 дельта!!!! НО с буферизацией
            applyDeltas: function(dbGuid, srcDbGuid, delta) {

				if (DEBUG) {
					console.log("incoming delta: ");
					console.log(delta);
				}

                // находим рутовый объект к которому должна быть применена дельта
                var db  = this.getDB(dbGuid);
				var clientInTran = (!db.isMaster() && delta.trGuid && db.getCurTranGuid()!=delta.trGuid);
				var endOfTran = (delta.trGuid && delta.endTran) || (!delta.trGuid && ("last" in delta));
				
				var buf = this.pvt.bufdeltas;
				
				if (!(srcDbGuid in buf)) buf[srcDbGuid] = {};
				if (!(dbGuid in buf[srcDbGuid])) buf[srcDbGuid][dbGuid] = {};
				var cur = buf[srcDbGuid][dbGuid];
				//var tr = delta.tran.toString();
				
				if (clientInTran) {
				   var tr = delta.trGuid;
				   var endOfStory = "endTran";
				  }
				else {
				   tr = delta.dbVersion.toString();
				    var endOfStory = "last";
				}
				if (!(tr in cur)) cur[tr] = [];
				cur[tr].push(delta);
				
				if (!(endOfStory in delta)) return; // буферизовали и ждем последнюю, чтобы применить все сразу

								
				//console.log("APPLY DELTAS "+tr);

				for (var i=0; i<cur[tr].length; i++) {
					var cdelta = cur[tr][i];
					if (endOfStory in cdelta) { // VER последняя дельта транзакции (для клиента и сервера)

						db.setVersion("valid",cdelta.dbVersion);	
						db.setVersion("sent",cdelta.dbVersion);
						for (var j=0; j<cur[tr].length; j++) { // маркируем версии рутов версиями дельт
							var d = cur[tr][j];
							if (d.rootGuid) {
								db.getObj(d.rootGuid).setRootVersion("valid",d.ver);
								db.getObj(d.rootGuid).setRootVersion("sent",d.ver);
							}
						}
						break;
					
					}
					else
					{
						// VER проверка на применимость дельт
						
						var ro = db.getObj(cdelta.rootGuid);
						if (ro) {
							var lval = ro.getRootVersion("valid");
							var ldraft = ro.getRootVersion();
							var dver = cdelta.ver;
							if (db.isMaster()) { // мы в мастер-базе (на сервере или на клиенте в клиентском контексте)
								if (lval > dver) { // на сервере подтвержденная версия не может быть больше пришедшей
									
									console.log("cannot sync server -  valid version:"+lval+"delta version:"+dver);
									return;				
								}				
							}
							else { // на клиенте (slave)
								if (lval <= dver - 1) { // нормальная ситуация, на клиент пришла дельта с подтвержденной версией +1
									// если к тому времени на клиенте появилась еще драфт версия - откатываем ее чтобы не было конфликтов
									console.log("UNDO?? if (ldraft>lval) : "+ro.getGuid()+"valid version: "+lval+" delta version:"+dver);
									if (ldraft>lval) db.undo(lval); 
								}
								else { // ошибка синхронизации - ненормальная ситуация, в будущем надо придумать как это обработать
									console.log("cannot sync client -  valid version:"+lval+"delta version:"+dver);
									return;
								}
							}
						}
						
						/*
						var lval = db.getVersion("valid");
						var ldraft = db.getVersion();
						var dver = cdelta.dbVersion;
						if (db.isMaster()) { // мы в мастер-базе (на сервере или на клиенте в клиентском контексте)
							if (lval > dver) { // на сервере подтвержденная версия не может быть больше пришедшей
								console.log("cannot sync server -  valid version:"+lval+"delta version:"+dver);
								return;				
							}				
						}
						else { // на клиенте (slave)
						
							if (lval <= dver - 1) { // нормальная ситуация, на клиент пришла дельта с подтвержденной версией +1
								// если к тому времени на клиенте появилась еще драфт версия - откатываем ее чтобы не было конфликтов
								console.log("UNDO : "+" "+lval+" delta version:"+dver);
								if (ldraft>lval) db.undo(lval); 
							}
							else { // ошибка синхронизации - ненормальная ситуация, в будущем надо придумать как это обработать
								console.log("cannot sync client -  valid version:"+lval+" delta version:"+dver);
								return;
							}
							
						}*/
		
					}
					if (("items" in cdelta) && cdelta.items.length>0) {
						var root = db.getRoot(cdelta.rootGuid);

						if (cdelta.items[0].newRoot)
							var rootObj=db.deserialize(cdelta.items[0].newRoot, {}, db.getDefaultCompCallback()); //TODO добавить коллбэк!!!
						else
							rootObj = root.obj;
						
						rootObj.getLog().applyDelta(cdelta);
					}
				}
				this.propagateDeltas(dbGuid,srcDbGuid,cur[tr]);
				delete cur[tr];

                this.event.fire({
                    type: 'endApplyDeltas',
                    target: this,
					commit: endOfTran,
					db: db
                });

            },


			
            /**
             * Сгенерировать и разослать "дельты" 
             * @param dbGuid - гуид базы данных, для которой генерим дельты
             */
			genDeltas: function(dbGuid, commit, callback) {
				var db  = this.getDB(dbGuid);
				var deltas = db.genDeltas(commit);
				if (deltas.length > 0) {
				    this.propagateDeltas(dbGuid, null, deltas, callback);
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
			propagateDeltas: function(dbGuid, srcDbGuid, deltas, callback) {

				function cb(result) { // VER обработка ответа от сервера по итогам отсылки дельт

					if (DEBUG) console.log("CALLBACK PROPAGATE DELTAS");
					if (DEBUG) console.log(result);
					
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

								if (DEBUG) console.log("sending delta db: "+db.getGuid());
								if (DEBUG) console.log(delta);
								var cbp = null;
								if ("last" in delta) cbp = cb;
								proxy.connect.send({action:"sendDelta", type:'method', delta:delta, dbGuid:proxy.guid, srcDbGuid: db.getGuid(), tranGuid: db.getCurTranGuid()},cbp);
								}
						}
					}
					
					// распространить по подписчикам					
					if ("last" in delta) { // закрывающую дельту транзакции посылаем всем подписчикам БД
						var allSubs = db.getSubscribers();
						for (var guid in allSubs) {
							var subscriber = allSubs[guid];
							if (subscriber.kind == 'remote' && srcDbGuid != guid) {
								subscriber.connect.send({action:"sendDelta", delta:delta, dbGuid:subscriber.guid, srcDbGuid: db.getGuid()});
								if (DEBUG) console.log("sent last to DB : "+subscriber.guid);
								}							
						}
					}
					else {
						var root = db.getRoot(delta.rootGuid);												
						for(guid in root.subscribers) {
							subscriber = root.subscribers[guid];
							//console.log('subscriber', subscriber);
							// удаленные
							// DELTA-G добавил кусок условия:  && (!delta.subscribers || (delta.subscribers[dbGuid]))
							if (subscriber.kind == 'remote' && srcDbGuid != guid && (!delta.subscribers || (delta.subscribers && delta.subscribers[subscriber.guid]))) {
								subscriber.connect.send({action:"sendDelta", delta:delta, dbGuid:subscriber.guid, srcDbGuid: db.getGuid()});
								if (DEBUG) console.log("sent to DB : "+subscriber.guid);
								}
						}
						

					}
					// TODO разобраться потом с локальными
					/*
					for(var guid in root.subscribers) {
						var subscriber = root.subscribers[guid];
						// локальные
						if (subscriber.kind == 'local' && srcDbGuid != guid)
							//subscriber.db.getObj(delta.rootGuid).getLog().applyDelta(delta); //TODO допилить с учетом .last
							// TODO валидировать версию
					}*/		
					if (delta.rootGuid) // запоминаем версии рутов, чтобы проапдейтить их в колбэке
						rootv[delta.rootGuid] = db.getObj(delta.rootGuid).getRootVersion();
					
				}
			}
			
			
        });
		return MemDBController;
	}
);