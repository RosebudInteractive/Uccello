if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['./memDataBase', '../system/event'],
	function(MemDataBase, Event) {
		var MemDBController = Class.extend({
		
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
                var result = {data: this.onSubscribe({connect:data.connect, guid:data.slaveGuid}, data.masterGuid)};
                done(result);
            },

            routerUnsubscribe: function(data, done) {
                this.getDB(data.masterGuid).onUnsubscribe(data.connectId, data.slaveGuid);
                done({});
            },

            routerSubscribeRoot: function(data, done) {
                var masterdb = this.getDB(data.masterGuid);
                if (!masterdb.isSubscribed(data.slaveGuid)) // если клиентская база еще не подписчик
                    this.onSubscribe({connect:data.connectId, guid:data.slaveGuid}, data.masterGuid );
                var result = {data:masterdb.onSubscribeRoots(data.slaveGuid, data.objGuids)};
                done(result);
            },
			
            routerSubscribeManyRoots: function(data, done) {
                var masterdb = this.getDB(data.masterGuid);
                if (!masterdb.isSubscribed(data.slaveGuid)) // если клиентская база еще не подписчик
					this.onSubscribe({connect:data.connectId, guid:data.slaveGuid}, data.masterGuid );
                var result = {data:masterdb.onSubscribeRoots(data.slaveGuid, data.objGuids)};
                done(result);
            },


            routerSendDelta: function(data, done) {
                console.time('applyDeltas');
                this.applyDeltas(data.dbGuid, data.srcDbGuid, data.delta);
                console.timeEnd('applyDeltas');
				console.log("VALID:"+this.getDB(data.dbGuid).getVersion("valid")+"draft:"+this.getDB(data.dbGuid).getVersion()+"sent:"+this.getDB(data.dbGuid).getVersion("sent"));
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
			
			/* перенесено в memDB
			setDefaultCompCallback: function(cb) {
				this.pvt.defaultCompCallback = cb;
			},
			
			getDefaultCompCallback: function() {
				return this.pvt.defaultCompCallback;
			},
			*/

            /**
             * подписать базу db на рутовые элементы с гуидами rootGuids
			 * @param {MemDataBase} db - база данных
             * @param rootGuids - одиночный элемент или массив элементов с гуидами корневых элементов
             * @param cb - вызывается после того, как подписка произошла и данные сериализовались в базе
			 * @param cb2 - вызывается по ходу создания объектов
             */
			subscribeRoots: function(db,rootGuids, cb, cb2) {
			
				if (!cb2) cb2 = this.pvt.defaultCompCallback;
					
				var p = db.getProxyMaster();
				if (p.kind == "local") { // мастер-база доступна локально
					var newObjs = p.db.onSubscribeRoots(db.getGuid(),rootGuids);
					var rootGuids = [];
					for (var i=0; i<newObjs.length; i++) {
						var o=db.deserialize(newObjs[i],{ mode:"RW"},cb2);
						rootGuids.push(o.getGuid());
						if (cb2!==undefined)  // запомнить коллбэк
							db._cbSetNewObject(o.getGuid(),cb2);
						
					}
					if (cb !== undefined && (typeof cb == "function")) cb(rootGuids);
					//if (cbfinal !== undefined && (typeof cbfinal == "function")) cbfinal();
				}
				else { // мастер-база доступна удаленно
					callback2 = function(obj) {
						var rootGuids = [];
						for (var i=0; i<obj.data.length; i++) {
							o=db.deserialize(obj.data[i],{ mode:"RW"},cb2);
							rootGuids.push(o.getGuid());
							if (cb2!==undefined)  // запомнить коллбэк
								db._cbSetNewObject(o.getGuid(),cb2);						
						}
						if (cb !== undefined && (typeof cb == "function")) cb(rootGuids);
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
			
				console.log("incoming delta: ");
				console.log(delta);
                // находим рутовый объект к которому должна быть применена дельта
                var db  = this.getDB(dbGuid);
                //var root = db.getRoot(delta.rootGuid);
				
				var buf = this.pvt.bufdeltas;
				
				if (!(srcDbGuid in buf)) buf[srcDbGuid] = {};
				if (!(dbGuid in buf[srcDbGuid])) buf[srcDbGuid][dbGuid] = {};
				var cur = buf[srcDbGuid][dbGuid];
				//var tr = delta.tran.toString();
				var tr = delta.dbVersion.toString();
				if (!(tr in cur)) cur[tr] = [];
				cur[tr].push(delta);
				
				if (!("last" in delta)) return; // буферизовали и ждем последнюю, чтобы применить все сразу
				
				// TODO ничто не гарантирует, что транзакция закроется и что она будет выполняться в правильном порядке
				// если мы хотим это контролировать нужно немного иначе организовать хранилище незавершенных транзакций (дельт)

				// TODOX временно убрали все проверки на версии
/*				
				var lval = db.getVersion("valid");
				var ldraft = db.getVersion();
				var dver = delta.dbVersion;
				

				if (db.isMaster()) {
					if (lval == dver - 1) {
						//  на сервере сразу валидируется версия при изменениях.
					}
					else {
						console.log("cannot sync server -  valid version:"+lval+"delta version:"+dver);
						console.log("VALID:"+db.getVersion("valid")+"draft:"+db.getVersion()+"sent:"+db.getVersion("sent"));
						return;				
					}				
				}
				else { 
					if (lval == dver - 1) { // нормальная ситуация, на клиент пришла дельта с подтвержденной версией +1
						// если к тому времени на клиенте появилась еще драфт версия - откатываем ее чтобы не было конфликтов
						if (ldraft>lval) db.undo(lval); 
					}
					else { // ошибка синхронизации - ненормальная ситуация, в будущем надо придумать как это обработать
						console.log("cannot sync client -  valid version:"+lval+"delta version:"+dver);
						console.log("VALID:"+db.getVersion("valid")+"draft:"+db.getVersion()+"sent:"+db.getVersion("sent"));
						return;
					}

					// TODO подписчикам передать если  делать тему с N базами

				}
	*/			
				for (var i=0; i<cur[tr].length; i++) {
					var cdelta = cur[tr][i];
					if ("last" in cdelta) { // последняя дельта транзакции
						if ((db.isMaster() == false) && (srcDbGuid == db.getProxyMaster().guid)) { // пришло с мастера
						
							db.setVersion("valid",cdelta.dbVersion);
							//db.setVersion("draft",cdelta.dbVersion);
							db.setVersion("sent",cdelta.dbVersion);							
						}
						else { // Master DataBase
							db.setVersion("valid",cdelta.dbVersion);	
							db.setVersion("sent",cdelta.dbVersion);							
						}
						break; 
					}
					var root = db.getRoot(cdelta.rootGuid);
					//if (!root) - 19/1 (это условие уже не актуально, так как могут прийти новые данные для замены старых
					if (cdelta.items[0].newRoot)
						var rootObj=db.deserialize(cdelta.items[0].newRoot, {}, db.getDefaultCompCallback()); //TODO добавить коллбэк!!!
					else
						rootObj = root.obj;
					
					rootObj.getLog().applyDelta(cdelta);
					console.log("VALID:"+db.getVersion("valid")+"draft:"+db.getVersion()+"sent:"+db.getVersion("sent"));
				}
				this.propagateDeltas(dbGuid,srcDbGuid,cur[tr]);
				delete cur[tr];

                this.event.fire({
                    type: 'endApplyDeltas',
                    target: this,
					db: db
                });

            },


			
            /**
             * Сгенерировать и разослать "дельты" 
             * @param dbGuid - гуид базы данных, для которой генерим дельты
             */
			genDeltas: function(dbGuid) {
				var db  = this.getDB(dbGuid);
				var deltas = db.genDeltas();
				if (deltas.length>0) {
					this.propagateDeltas(dbGuid,null,deltas);
					if (db.getVersion("sent")<db.getVersion()) db.setVersion("sent",db.getVersion());
				}
			},
			
			
			// послать подписчикам и мастеру дельты которые либо сгенерированы локально либо пришли снизу либо сверху
			propagateDeltas: function(dbGuid, srcDbGuid, deltas) {

				function cb(result) {
					// TODOX ОТКЛЮЧИЛИ ВРЕМЕННО СТАРЫЕ ПРОВЕРКИ, НАДО НАПИСАТЬ НОВЫЕ
					console.log("CALLBACK PROPAGATE DELTAS");
					console.log(result);
					/*
					if (db.getVersion("valid")<result.data.dbVersion) 
						db.setVersion("valid", result.data.dbVersion); 
						
					if (db.getVersion("valid")>result.data.dbVersion) { // TODO? - по идее откатить нужно все версии, не только валидные
						// откатить до версии сервера
						db.undo(result.data.dbVersion);
					}
					*/
				}
				//var db = this.getDB(dbGuid);
				//var deltas = db.genDeltas();
				var db  = this.getDB(dbGuid);
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
								//var cb = this._receiveResponse; //function(result) { if (db.getVersion("valid")<result.data.dbVersion) db.newVersion("valid", result.data.dbVersion - db.getVersion("valid")); };
								console.log("sending delta db: "+db.getGuid());
								console.log(delta);
								proxy.connect.send({action:"sendDelta", type:'method', delta:delta, dbGuid:proxy.guid, srcDbGuid: db.getGuid()},cb);
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
								console.log("sent last to DB : "+subscriber.guid);
								}							
						}
					}
					else {
						var root = db.getRoot(delta.rootGuid);
												
						for(guid in root.subscribers) {
							subscriber = root.subscribers[guid];
							//console.log('subscriber', subscriber);
							// удаленные
							if (subscriber.kind == 'remote' && srcDbGuid != guid) {
								subscriber.connect.send({action:"sendDelta", delta:delta, dbGuid:subscriber.guid, srcDbGuid: db.getGuid()});
								console.log("sent to DB : "+subscriber.guid);
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
					
					
				}
			}
			
			
        });
		return MemDBController;
	}
);