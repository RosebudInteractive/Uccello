if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * База данных
 * @module MemDataBase
 */
define(
	["../system/event","./memCol", "./memObj", "./memMetaRoot", "./memMetaObj", "./memMetaObjFields", "./memMetaObjCols"],
	function(Event,MemCollection,MemObj,MemMetaRoot,MemMetaObj,MemMetaObjFields,MemMetaObjCols) {
	
	
		var metaObjFieldsGuid =  "0fa90328-4e86-eba7-b12b-4fff3a057533";
		var metaObjColsGuid =  "99628583-1667-3341-78e0-fb2af29dbe8";
		var metaRootGuid =  "fc13e2b8-3600-b537-f9e5-654b7418c156";
		var metaObjGuid =  "4dcd61c3-3594-7456-fd86-5a3527c5cdcc";
	
		var MemDataBase = Class.extend(/** @lends module:MemDataBase.MemDataBase.prototype */{

            /**
             * params.kind - "master" - значит мастер-база, другое значение - подчиненная база
             * params.proxyMaster
             * @constructs
             * @param controller
             * @param params
             * @param cb
             */
			init: function(controller, params, cb){
				var pvt = this.pvt = {};
				pvt.name = params.name;
				pvt.robjs = [];				// корневые объекты базы данных
				pvt.rcoll = {};
				pvt.objs = {};				// все объекты по гуидам
				pvt.logIdx = [];			// упорядоченный индекс логов
				pvt.$idCnt = 0;
				pvt.subscribers = {}; 		// все базы-подписчики
				//pvt.tranCounter = 0;		// счетчик транзакции
				pvt.inTran = false;
				if ("guid" in params)
					pvt.guid = params.guid;
				else
					pvt.guid = controller.guid();
				pvt.counter = 0;
				console.log("DATA BASE GUID "+pvt.guid);

				
				pvt.controller = controller; //TODO  если контроллер не передан, то ДБ может быть неактивна				
				pvt.controller.createLocalProxy(this);
				pvt.defaultCompCallback = null; // коллбэк по умолчанию для создания компонентов
				// TODOX УБРАТЬ
				pvt.version = 0; 
				pvt.validVersion = 0;
				pvt.sentVersion = 0;
				// TODOX END
				this.event = new Event();
				
				if (params.kind != "master") {
					var db=this;
					controller._subscribe(this,params.proxyMaster, function(result) {
						pvt.proxyMaster = controller.getProxy(params.proxyMaster.guid);
						pvt.version = result.data.dbVersion; // устанавливаем номер версии базы по версии мастера
						pvt.validVersion = pvt.version;
						pvt.sentVersion = pvt.version;
						controller.subscribeRoots(db,"fc13e2b8-3600-b537-f9e5-654b7418c156", function(){
								db._buildMetaTables();
								//console.log('callback result:', result);
								if (cb !== undefined && (typeof cb == "function")) cb();
							});
						});

					}
				else { // master base
					// Создать объект с коллекцией метаинфо
					pvt.meta = new MemMetaRoot( { db: this },{});
					if (cb !== undefined && (typeof cb == "function")) cb(this);
				}				
			},
			
            /**
             * Добавить корневой объект в БД
             * @param obj
             * @param opt - опции opt.type - тип (res|data), opt.mode - режим ("RO"|"RW")
             * @private
             */
			_addRoot: function(obj,opt) {
				var root = this.getRoot(obj.getGuid());
				if (root) {
					// TODO проверить, что root.obj==null?
					root.obj = obj;				
				}
				else {
					root = {};
					root.obj = obj;
					root.mode = opt.mode;
					root.type = opt.type;
					root.subscribers = {};	// подписчики корневого объекта
					root.master = null;		// мастер
					root.dver = 0; 			// версии корневого объекта: draft / sent / valid
					root.sver = 0; 
					root.vver = 0; 
					root.callbackNewObject = undefined;
					root.event = new Event();
					this.pvt.robjs.push(root);
					this.pvt.rcoll[obj.getGuid()] = root;
				}

				this.event.fire({
                    type: 'newRoot',
                    target: obj				
				});				
				
			},
			
			/*
			_delRoot: function(obj) {
				if (obj.getDB()!=this) return;
				if (obj.getParent()) return
				
			},*/
			
            /**
             * зарегистрировать объект в списке по гуидам
             * @param obj
             * @private
             */
			_addObj: function(obj) {
				this.pvt.objs[obj.getGuid()] = obj;
			},

            /**
             * addLogItem description
             * @param item
             * @private
             */
			_addLogItem: function(item) {
				this.pvt.logIdx.push(item);
			},


            /**
             * buildMetaTables description
             * @private
             */
			_buildMetaTables: function() {
				var metacol = this.getMeta().getCol("MetaObjects");
				for (var i=0; i<metacol.count(); i++) {
					var o = metacol.get(i);
					if (o.pvt.fieldsTable == undefined)
						o._bldElemTable();					
				}
			},
			
			_cbSetNewObject: function(rootGuid,callback) {
				this.getRoot(rootGuid).callbackNewObject = callback;
			},
			
			_cbGetNewObject: function(rootGuid) {
				return this.getRoot(rootGuid).callbackNewObject;
			},

            /**
             * вернуть список гуидов корневых объектов за исключением метаинфо
			 * @param rootKind - "res"|"data" - тип рута, если не передается или "all", то все
             */
			getRootGuids: function(rootKind) {
				var guids = [];
				var ro = this.pvt.robjs;
				for (var i=0; i<ro.length; i++) {
					var cguid = ro[i].obj.getGuid();
					if ((cguid!=metaRootGuid) && ((ro[i].type==rootKind) || (rootKind===undefined) || (rootKind==="all"))) guids.push(cguid);
				}
				return guids;
				

			},
		
			
            /**
             * вызывается коллекциями при удалении объекта, генерирует событие, на которое можно подписаться
             */			
			onDeleteObject: function(obj) {
				var root = this.getRoot(obj.getRoot().getGuid());
				delete this.pvt.objs[obj.getGuid()];
				// TODO проверить не корневой ли объект - и тогда тоже удалить его со всей обработкой
				this.event.fire({
                    type: 'delObj',
                    target: obj
                });
				root.event.fire({
                    type: 'delObj',
                    target: obj				
				});				
			},

            /**
             * подписаться у мастер-базы на корневой объект, идентифицированный гуидом rootGuid
             * метод вызывается у подчиненной (slave) базы.
             * @param rootGuid
             * @param callback - вызывается после того, как подписка произошла и данные сериализовались в базе
			 * @param callback2 - вызывается по ходу создания объектов
	         */
			subscribeRoots: function(rootGuid,callback,callback2) {
				this.pvt.controller.subscribeRoots(this,rootGuid,callback,callback2);
			},
			
            /**
             * Стать подписчиком базы данных
             * @param proxy
             */
			onSubscribe: function(proxy) {
				//var g = (proxy.db) ? proxy.dataBase.getGuid() : proxy.guid;
				this.pvt.subscribers[proxy.guid] = proxy;
				console.log(this.getGuid());
				this.prtSub(this.pvt);
			},

            /**
             * isSubscribed
             * @param dbGuid
             * @returns {object|null}
             */
			isSubscribed: function(dbGuid) {
				var s= this.pvt.subscribers[dbGuid];
				return (s) ? s : null;
			},

            /**
             * onUnsubscribe
             * @param connectId
             */
			onUnsubscribe: function(connectId) {
				//var g = (subProxy.dataBase) ? subProxy.dataBase.getGuid() : subProxy.guid;
				for (var g in this.pvt.subscribers) {
					var p = this.pvt.subscribers[g];
					if (p.connect.getId() == connectId)
						delete this.pvt.subscribers[g]; // убрать из общего списка подписчиков
				}
				for (g in this.pvt.rcoll) {
					var p=this.pvt.rcoll[g];
					for (var g2 in p.subscribers) {
						if (p.subscribers[g2].connect.getId() == connectId) 
							delete p.subscribers[g2];
						
					}
				}
				// TODO удалить из остальных мест
				
			},
			
            /**
             * Стать подписчиком корневого объекта с гуидом rootGuid
             * @param dbGuid
             * @param rootGuids - 1 гуид или массив гуидов либо селектор - "res" для ресурсов, "data" для данных, "all" для всех
             * @returns {*}
             */
			onSubscribeRoots: function(dbGuid, rootGuids) {
				// TODO проверить что база подписана на базу
				var rg = [];
				var res = [];
				if (Array.isArray(rootGuids))				
					rg = rootGuids;
				else {
					if ((rootGuids == "res") || (rootGuids == "data") || (rootGuids == "all")) 
						rg = this.getRootGuids(rootGuids);
					else 
						rg.push(rootGuids);					
				}	
				//var obj = null;
						
				for (var i=0; i<rg.length; i++) {
					if (this.pvt.robjs.length > 0) {
						var ro = this.pvt.rcoll[rg[i]];
						if (ro) {
							//obj = ro.obj; // ВРЕМЕННО
							//if (!obj) return null;
						
							// добавляем подписчика
							var subProxy = this.pvt.subscribers[dbGuid];
							if (subProxy) {
								var clog = ro.obj.getLog();
								if (!clog.getActive()) clog.setActive(true); // если лог неактивен, то активировать, чтобы записывать в него все изменения
								//this.pvt.rcoll[rg[i]]
								ro.subscribers[dbGuid] = subProxy; 
								res.push(this.serialize(ro.obj));
							}
						}
					}
				}
				// TODO ВАЖНО! нужно сделать рассылку только для данного корневого объекта - оптимизировать потом!!!!
				this.pvt.controller.genDeltas(this.getGuid());	
				return res;	
			},
			
			prtSub: function(root) {
				console.log("***");
				for (var guid  in root.subscribers) {
					console.log(guid+"  "+root.subscribers[guid].connect.name());
				}
			},

			
            /**
             * "сериализация" объекта базы
             * @param {object} obj
             * @returns {*}
             */
			serialize: function(obj) {
				// проверить, что объект принадлежит базе
				if (!("getDB" in obj) || (obj.getDB()!=this)) return null;
				
				var newObj = {};
				newObj.$sys = {};
				newObj.$sys.guid = obj.getGuid();
				newObj.ver = obj.getRootVersion();
				/*if (obj.getObjType()) // obj
					newObj.$sys.typeGuid = obj.getObjType().getGuid();
				else // meta obj
					newObj.$sys.typeGuid = "12345";*/
				newObj.$sys.typeGuid = obj.getTypeGuid();
				// поля объекта TODO? можно сделать сериализацию в более "компактном" формате, то есть "массивом" и без названий полей
				newObj.fields = {};
				for (var i=0; i<obj.count(); i++) 
					newObj.fields[obj.getFieldName(i)] = obj.get(i);		
				// коллекции
				newObj.collections = {};
				for (i=0; i<obj.countCol(); i++) {
					var cc=obj.getCol(i);
					var cc2=newObj.collections[cc.getName()] = {};
					for (var j=0; j<cc.count(); j++) {
						var o2=this.serialize(cc.get(j));
						cc2[j] = o2;
					}
				}					
				return newObj;	// TODO? делать stringify тут?
			},

            /**
             * десериализация в объект
             * @param {object} sobj - объект который нужно десериализовать
			 * @param {object} parent - родительский "объект" - parent.obj, parent.colName для некорневых либо {} для корня, rtype: "res"|"data"
			 * @callback cb - вызов функции, которая выполняет доп.действия после создания объекта
             * @returns {*}
             */
			deserialize: function(sobj,parent,cb) {
				function ideser(that,sobj,parent) {
					if (!("obj" in parent)) parent.db = that;
					switch (sobj.$sys.typeGuid) {
						case metaObjFieldsGuid:
							var o = new MemMetaObjFields(parent,sobj);
							break;
						case metaObjColsGuid:
							o = new MemMetaObjCols(parent,sobj);
							break;
						case metaRootGuid:
							//o = that.getObj(metaRootGuid);
							that.pvt.meta = new MemMetaRoot(parent,sobj);
							o = that.pvt.meta;
							break;
						case metaObjGuid:
							o = new MemMetaObj(parent,sobj);
							break;
						default:
							var typeObj = that.getObj(sobj.$sys.typeGuid);
							//if ("db" in parent) parent.nolog=true;
							if (!("obj" in parent)) { // вместо верхней строки, теперь db не нужно передавать сюда
								parent.nolog = true; 
								//parent.db = that;
							}
							o = new MemObj( typeObj,parent,sobj);
							if (typeObj) 
								if ((typeObj.getRtype() == "res") && (cb!=undefined)) cb(o);				
							//if ((parent.rtype == "res") &&(cb!==undefined)) cb(o);
							break;						
					}
					for (var cn in sobj.collections) {
						for (var co in sobj.collections[cn]) 
							ideser(that,sobj.collections[cn][co],{obj:o, colName:cn});
					}
					return o;
				};
				// TODO пока предполагаем что такого объекта нет, но если он есть что делаем?	
				
				//this.getCurrentVersion(); // пока из-за этого не работает!
				
				if ("obj" in parent) parent.obj.getLog().setActive(false); // отключить лог на время десериализации
				var res = ideser(this,sobj,parent);
				var rholder = this.getRoot(res.getGuid());
				if (rholder) { // TODO Сергей: поставил проверку иначе при создании контекста ошибки
					if (!("ver" in sobj)) {
						rholder.vver = 0; // Если в сериализованном представлении нет номера версии, полагаем =0
						rholder.sver = 0;
						rholder.dver = 0;
						}
					else {
						rholder.vver = sobj.ver; // TODOХ не до конца ясно как поступать с версиями в случае частичной сериализации - продумать
						rholder.sver = sobj.ver;
						rholder.dver = sobj.ver;
					}
				}
				res.getLog().setActive(true);
				// TODO - запомнить "сериализованный" объект (или еще раз запустить сериализацию?)
				return res; 
			},
			
			setDefaultCompCallback: function(cb) {
				this.pvt.defaultCompCallback = cb;
			},
			
			getDefaultCompCallback: function() {
				return this.pvt.defaultCompCallback;
			},

            /**
             * добавить корневые объекты путем десериализации
             * @param {array} sobjs - массив объектов которые нужно десериализовать
			 * @callback cb - вызов функции, которая выполняет доп.действия после создания каждого объекта
			 * @param subDbGuid - гуид базы данных подписчика (для идентификации)
             * @returns {*}
             */
			// ДОЛЖНА РАБОТАТЬ ТОЛЬКО ДЛЯ МАСТЕР БАЗЫ - СЛЕЙВ НЕ МОЖЕТ ДОБАВИТЬ В СЕБЯ РУТ, МОЖЕТ ТОЛЬКО ПОДПИСАТЬСЯ НА РУТ МАСТЕРА!
			addRoots: function(sobjs, cb, subDbGuid) {
				var res = [];
				
				this.getCurrentVersion();

				if (!cb) cb = this.getDefaultCompCallback();

				for (var i = 0; i<sobjs.length; i++) {
					var croot = this.deserialize(sobjs[i], { }, cb);
					
					// добавить в лог новый корневой объект, который можно вернуть в виде дельты
					var serializedObj=this.serialize(croot); // TODO по идее можно взять sobjs[i], но при десериализации могут добавляться гуиды
					var o = { adObj: serializedObj, obj:croot, type:"newRoot"};
					croot.getLog().add(o);

					// форсированная подписка для данных (не для ресурсов) - в будущем скорее всего понадобится управлять этим
					
					var allSubs = this.getSubscribers();
					for (var guid in allSubs) {
						var subscriber = allSubs[guid];
						if (subscriber.kind == 'remote') {
							/*UCCELLO_CONFIG.classGuids.DataRoot*/
							// Подписываем либо данные (тогда всех) либо подписчика
							if ((croot.getTypeGuid() == "87510077-53d2-00b3-0032-f1245ab1b74d" ) || (subDbGuid==subscriber.guid)) 
							  this.pvt.rcoll[croot.getGuid()].subscribers[subscriber.guid] = subscriber; //subProxy;

						}							
					}
					
					
					res.push(croot); 
				}
				


				if (!this.inTran()) { // автоматом "закрыть" транзакцию (VALID VERSION = DRAFT VERSION)				
					this.setVersion("valid",this.getVersion());			// сразу подтверждаем изменения в мастере (вне транзакции)				
					this.getController().genDeltas(this.getGuid());		// рассылаем дельты
				}
				console.log("SERVER VERSION " + this.getVersion());
				
				return res;
			},
						
            /**
             * вернуть ссылку на контроллер базы данных
             * @returns {*}
             */
			getController: function() {
				return this.pvt.controller;
			},
			
			/*getConnection: function() {
				return this.pvt.masterConnection;
			},*/
			
            /**
             * Вернуть название БД
             * @returns {*}
             */
			getName: function() {
				return this.pvt.name;
			},

            /**
             * Вернуть версию БД - УСТАРЕЛО
             */			
			getVersion: function(verType) {
				switch (verType) {
					case "sent": return this.pvt.sentVersion;
					case "valid": return this.pvt.validVersion;
					default: return this.pvt.version;
				}				
			},



			setVersion: function(verType,val) {
				switch (verType) {
					case "sent":
						if (/*(val>=this.pvt.validVersion) && */(val<=this.pvt.version)) this.pvt.sentVersion=val;
						else {
							console.log("*** sent setversion error");
							console.log("VALID:"+this.getVersion("valid")+"draft:"+this.getVersion()+"sent:"+this.getVersion("sent"));
						}
					
						break;
					case "valid": 
						this.pvt.validVersion=val;
						console.log("*** valid setversion "+val);
						/*if ((val<=this.pvt.sentVersion) && (val<=this.pvt.version)) this.pvt.validVersion=val; 
						else {
							console.log("*** valid setversion error");
							console.log("VALID:"+this.getVersion("valid")+"draft:"+this.getVersion()+"sent:"+this.getVersion("sent"));
						}*/
						//if (this.pvt.sentVersion<this.pvt.validVersion) this.pvt.sentVersion = this.pvt.validVersion; - на сервере может быть <
						if (this.pvt.version<this.pvt.validVersion) this.pvt.version = this.pvt.validVersion;
						break;
					default: 
						if ((val>=this.pvt.validVersion) && (val>=this.pvt.sentVersion)) this.pvt.version=val; 
						else {
							console.log("*** draft setversion error");
							console.log("VALID:"+this.getVersion("valid")+"draft:"+this.getVersion()+"sent:"+this.getVersion("sent"));
						}
						break;
				}	
			},

			// вернуть "текущую" версию, которой маркируются изменения в логах
			getCurrentVersion: function() {
			
				var sver = this.getVersion("sent");
				var ver = this.getVersion();
				if (ver==sver) this.setVersion("draft",this.getVersion()+1);
				return this.getVersion();			
			},
			
			inTran: function() {
				return this.pvt.inTran;
			},

            /**
             * countRoot
             * @returns {Number}
             */
			countRoot: function() {
				return this.pvt.robjs.length;
			},
			
            /**
             * вернуть корневой объект по его Guid или по порядковому номеру
             * @param {number} id
             * @returns {*}
             */
			getRoot: function(id) {
				if (typeof id == "number")
					return this.pvt.robjs[id];
				else
					return this.pvt.rcoll[id];
			},
			
			
			
            /**
             * Является ли мастер базой
             * @returns {boolean}
             */
			isMaster: function() {
				if (this.pvt.proxyMaster == undefined)
					return true;
				else
					return false;
			},
			
            /**
             * вернуть мастер-базу если локальна
             * @returns {dbsl.proxyMaster|*|dbs2.proxyMaster}
             */
			getProxyMaster: function() {
				return this.pvt.proxyMaster;
			},
			
            /**
             * вернуть корневой объект метаинфо
             * @returns {key.meta|*|memMetaRoot}
             */
			getMeta: function() {
				return this.pvt.meta;
			},
			
            /**
             * Получить следующий local id
             * @returns {number}
             */
			getNewLid: function() {  // TODO сделать DataBaseController и перенести туда?
				return this.pvt.$idCnt++;
			},

            /**
             * вернуть счетчик изменения для БД (в логе)
             * @returns {number}
             */
			getNewCounter: function() {
				return this.pvt.counter++;
			},
			

            /**
             * вернуть подписчиков на БД
             * @returns {object}
             */			
			getSubscribers: function() {
				return this.pvt.subscribers;		
			},
			
            /**
             * полуить объект по его гуиду
             * @param {string} guid
             * @returns {*}
             */
			getObj: function(guid) {
				return this.pvt.objs[guid];
			},
			
            /**
             * добавить новый корневой объект в мастер-базу
             * @param {object} objType
             * @param {object} flds
             * @returns {*}
             */
			newRootObj: function(objType,flds) {
				if (this.isMaster()) {
					var obj = new MemObj( objType,{"db":this, "mode":"RW"},flds);
					return obj;
				}
				else	
					return null;
			},

            /**
             * Проиграть назад изменения по логам базы данных
			 * @param {number} version - номер версии, до которого нужно откатить
             */			
			undo: function(version) {	
				console.log("****************************************  UNDO MODIFICATIONS!!!!!!!!!!");
				if (version<this.getVersion("valid"))
					return false;
				for (var i=0; i<this.countRoot(); i++)
					this.getRoot(i).obj.getLog().undo(version);	

				if (this.getVersion("sent")>version) this.setVersion("sent",version);
				this.setVersion("draft",version); 
				return true;
			},
			
            /**
             * Сгенерировать "дельты" по логу изменений
             * (для сервера нужно будет передавать ИД подписчика)
             * @returns {Array}
             */
			genDeltas: function() {
				var allDeltas = [];
				for (var i=0; i<this.countRoot(); i++) {
					var d=this.getRoot(i).obj.getLog().genDelta();
					if (d!=null) 
						allDeltas.push(d);
				}
				if (this.isMaster())		// TODO закрывать транзакцию?	
					this.setVersion("valid",this.getVersion());			// сразу подтверждаем изменения в мастере (вне транзакции)				
				
				// вторая часть условия - чтобы разослать на клиенты "правильную" версию
				if ((allDeltas.length>0) || (this.isMaster() && this.getVersion("valid")!=this.getVersion("sent"))) {
					//this.pvt.tranCounter++;
					allDeltas.push( { last: 1, dbVersion:this.getVersion()  });
					//allDeltas[allDeltas.length-1].last = 1; // признак конца транзакции
				}
				
				return allDeltas;

			},
			
            /**
             * применить дельты к БД для синхронизации
             * @param data
             */
			applyDeltas:function(data) {
				
			},

            /**
             * получить guid
             * @returns {guid}
             */
            getGuid: function() {
                return this.pvt.guid;
            },
			
			
			resetModifLog: function() {
				for (var g in this.pvt.objs) 
					this.getObj(g).resetModifFldLog();	
			}
			
        });
		return MemDataBase;
	}
);