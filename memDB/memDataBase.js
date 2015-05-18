﻿if (typeof define !== 'function') {
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


		var metaObjFieldsGuid =  UCCELLO_CONFIG.guids.metaObjFieldsGuid;
		var metaObjColsGuid =  UCCELLO_CONFIG.guids.metaObjColsGuid;
		var metaRootGuid =  UCCELLO_CONFIG.guids.metaRootGuid;
		var metaObjGuid =  UCCELLO_CONFIG.guids.metaObjGuid;

		var MemDataBase = Class.extend(/** @lends module:MemDataBase.MemDataBase.prototype */{

		    /**
             * params.kind - "master" - значит мастер-база, другое значение - подчиненная база
             * params.proxyMaster
             * @constructs
             * @param controller
             * @param params
			 *		params.name - имя базы
			 *		params.guid - гуид базы данных (если не передается, то генерируем в конструкторе)
			 *		params.kind - master | slave
			 *		params.proxyMaster - прокси мастер-базы (для kind = "slave")
             * @param cb
             */
		    init: function(controller, params, cb) {
		        var pvt = this.pvt = {};
		        pvt.name = params.name;
		        pvt.robjs = [];				// корневые объекты базы данных
		        pvt.rcoll = {};
		        pvt.objs = {};				// все объекты по гуидам
		        pvt.resMap = {};			// связь гуида ресурса и гуида экземпляра
		        pvt.refTo = {};			    // исходящие ссылки (по объектам)
		        pvt.refFrom = {};			// входящие ссылки (по объектам)
		        pvt.uLinks = {};			// неразрешенные ссылки
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
		                controller.subscribeRoots(db, UCCELLO_CONFIG.guids.metaRootGuid, function(){
		                    db._buildMetaTables();
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
		        /*  --- Перенесено в memObj
				this.event.fire({
                    type: 'newRoot',
                    target: obj,
					options:opt
				});*/

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
		    _addObj: function (obj) {

		        var root = obj.getRoot();
		        var is_root = ! obj.getParent();
		        var guid = obj.getGuid();
		        var guidRes = obj.getGuidRes();

		        var rootGuid = root.getGuid();
		        var rootGuidRes = root.getGuidRes();

		        if (is_root) {
		            if (!this.pvt.resMap[rootGuidRes])
		                this.pvt.resMap[rootGuidRes] = {};
		            this.pvt.resMap[rootGuidRes][guid] = { root: obj, elems: {} };
		        } else {
		            this.pvt.resMap[rootGuidRes][rootGuid].elems[guidRes] = obj;
		        };

		        this.pvt.objs[guid] = obj;
		    },

		    /**
             * Returns MemPrortoObject
             * given by it's [root] and resource GUID.
             * 
             * @param {Object} root A Root
             * @param {String} objGuid A MemProtoObject object resource GUID
             * @return {Object} A MemProtoObject
             */
		    getObjByRoot: function (root, objGuid) {
		        var res = undefined;
		        var root_guid = root.getGuid();
		        var root_guidRes = root.getGuidRes();
		        var obj = this.pvt.resMap[root_guidRes];
		        if (obj) {
		            obj = obj[root_guid];
		            if (obj)
		                res = obj.elems[objGuid];
		        };
		        return res;
		    },

		    /**
             * Deletes all the referencies related to the MemPrortoObject
             * given by it's instance GUID.
             * 
             * @param {String} guid A MemProtoObject object instance GUID
             */
		    _deleteRefs: function (guid) {
		        var refTo = this.pvt.refTo[guid];
		        if (refTo) {
		            var links = Object.keys(refTo);
		            for (var i = 0; i < links.length; i++) {
		                var link = refTo[links[i]];
		                if (link.val.objRef) {
		                    var refGuid = link.val.objRef.getGuid();
		                    var refFrom = this.pvt.refFrom[refGuid];
		                    if (refFrom)
		                        delete refFrom[guid + "_" + links[i]];
		                } else
		                    delete this.pvt.uLinks[guid + "_" + links[i]];
		            };
		        };
		        var refFrom = this.pvt.refFrom[guid];
		        if (refFrom) {
		            var links = Object.keys(refFrom);
		            for (var i = 0; i < links.length; i++) {
		                var link = refFrom[links[i]];
		                link.val.objRef=null;
		                this.pvt.uLinks[link.src.getGuid() + "_" + link.field] = link;
		            };
		            delete this.pvt.refFrom[guid];
		        };
		    },

		    /**
             * Adds reference to the appropriate lists.
             * Adds link to the [obj] outgoing links list ([refTo]) and
             * if reference is resolved (ref.objRef !== null) adds it to the [ref.objRef]
             * incoming links list ([refFrom]), otherwise adds it to the global
             * unresolved links list ([uLinks]).
             * 
             * @param {Object}  obj A MemProtoObject which [field] belongs to 
             * @param {Object}  ref A value of the reference type
             * @param {String}  field A field name of the [ref] value
             * @param {Object}  type A reference type object
             */
		    addLink: function (obj, ref, field, type) {
		        var guid = obj.getGuid();
		        var link = this.pvt.refTo[guid];
		        var refFrom = null;

		        if (link)
		            link = link[field];
		        else
		            this.pvt.refTo[guid] = {};

		        if (link) {
		            // Link already exists
		            var old_ref = link.val;
		            if (type.isEqual(old_ref, ref))
		                return; // If values are equal we'll do nothing

		            if (old_ref.objRef) {
		                refFrom = this.pvt.refFrom[old_ref.objRef.getGuid()];
		                if (refFrom) {
		                    delete refFrom[guid + "_" + field];
		                };
		            } else
		                if (ref.objRef)
		                    delete this.pvt.uLinks[guid + "_" + field];
		        };

		        link = { src: obj, val: ref, field: field, type: type };
		        this.pvt.refTo[guid][field] = link;

		        if (ref.objRef) {
		            var refGuid = ref.objRef.getGuid();
		            refFrom = this.pvt.refFrom[refGuid];
		            if (!refFrom) {
		                refFrom = {};
		                this.pvt.refFrom[refGuid] = refFrom;
		            };
		            refFrom[guid + "_" + field] = link;
		        }
		        else
		            this.pvt.uLinks[guid + "_" + field] = link;
		    },

		    /**
             * Resolves all the unresolved referencies.
             * 
             */
		    resolveAllRefs: function () {
		        var uLinks = this.pvt.uLinks;
		        var refs = Object.keys(uLinks);
		        for (var i = 0; i < refs.length; i++) {
		            var link = uLinks[refs[i]];
		            this.resolveRef(link.val, link.src);
		            if (link.val.objRef) {
		                // Resolved !
		                var refGuid = link.val.objRef.getGuid();
		                var refFrom = this.pvt.refFrom[refGuid];
		                if (!refFrom) {
		                    refFrom = {};
		                    this.pvt.refFrom[refGuid] = refFrom;
		                };
		                refFrom[link.src.getGuid() + "_" + link.val.field] = link;

		                delete uLinks[refs[i]];
		            };
		        };
		    },

		    /**
             * Resolves reference.
             * Fills [ref.objRef] field with MemProtoObject if reference can be resolved
             * and set it to NULL otherwise.
             * 
             * @param {Object} ref The internal representaton of a value of the reference type
             * @param {Object} obj A MemProtoObject which [ref] belongs to
             */
		    resolveRef: function (ref, obj) {
			    ref.objRef = null;
			    var objRef = null;

			    if (ref.is_external) {
			        // External ref
			        var objResBase = this.pvt.resMap[ref.guidRes];
			        if (objResBase) {
			            // Try to get resorce with GuidInstance == GuidResource
			            objRef = objResBase[ref.guidRes];
			        };
			        if (objResBase && (!objRef)) {
			            // Resorce with GuidInstance == GuidResource doesn't exist,
			            //   then try to get another resorce with that Guid
			            var guids = Object.keys(objResBase);
			            if (guids.length == 1) {
			                // There should be the only resource
			                objRef = objResBase[guids[0]];
			            };
			        };
			        if (objRef) {
			            ref.guidInstanceRes = objRef.root.getGuid();
			        };
                } else {
			        // Internal ref

			        if (obj && (typeof (obj.getRoot) === "function")) {
                        // Set root of current object to resource reference
			            var root = obj.getRoot();
			            ref.guidRes = root.getGuidRes();
			            ref.guidInstanceRes = root.getGuid();
			            objRef = this.pvt.resMap[ref.guidRes];
			            if (objRef)
			                objRef = objRef[ref.guidInstanceRes];
                    };
                };

			    if (objRef)
			        objRef = objRef.elems[ref.guidElem];
			    if (objRef) {
			        ref.guidInstanceElem = objRef.getGuid();
			        ref.objRef = objRef;
			    };
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

				var is_root = !obj.getParent();
				var guid = obj.getGuid();
				var guidRes = obj.getGuidRes();
				var rootGuid = root.obj.getGuid();
				var rootGuidRes = root.obj.getGuidRes();

				this._deleteRefs(guid);

				delete this.pvt.objs[guid];

				if (this.pvt.resMap[rootGuidRes]) {
				    if (is_root) {
				        delete this.pvt.resMap[rootGuidRes][guid];
				        if (Object.keys(this.pvt.resMap[rootGuidRes]).length == 0)
				            delete this.pvt.resMap[rootGuidRes];
				    } else {
				        if (this.pvt.resMap[rootGuidRes][rootGuid])
				            delete this.pvt.resMap[rootGuidRes][rootGuid].elems[guidRes];
				    };
				};

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
				if (DEBUG) console.log(this.getGuid());
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
				if (DEBUG) {
					console.log("***");
					for (var guid  in root.subscribers) {
						console.log(guid+"  "+root.subscribers[guid].connect.name());
					}
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
				newObj.$sys.guid = obj.getGuidRes();
				newObj.ver = obj.getRootVersion();
				/*if (obj.getObjType()) // obj
					newObj.$sys.typeGuid = obj.getObjType().getGuid();
				else // meta obj
					newObj.$sys.typeGuid = "12345";*/
				newObj.$sys.typeGuid = obj.getTypeGuid();
				// поля объекта TODO? можно сделать сериализацию в более "компактном" формате, то есть "массивом" и без названий полей
				newObj.fields = {};
				for (var i = 0; i < obj.count() ; i++)
				    newObj.fields[obj.getFieldName(i)] = obj.getSerialized(i);
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
			 * @param {boolean} make_clone клонировать ли объект при десериализации?
             * @returns {*}
             */
			deserialize: function(sobj,parent,cb,make_clone,instGuid) {
			    function ideser(that, sobj, parent) {
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
						    if (make_clone)
						        sobj.$sys.make_clone = true;
						    var typeObj = that.getObj(sobj.$sys.typeGuid);
							/*if (!("obj" in parent)) { 
								parent.nolog = true;
							}*/
							// o = new MemObj( typeObj,parent,sobj);
							if (typeObj /*&& (typeObj.getRtype() == "res") */) {
								//if ((typeObj.getRtype() == "res") && (cb!=undefined)) cb(0);
								if (/*(typeObj.getRtype() == "res") && */(cb!=undefined)) o = cb(typeObj, parent, sobj);
								if (!o) 
								  console.log("BAD GUID === "+sobj.$sys.typeGuid);
							}
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
				// заменить гуид ресурса на гуид экземпляра
				if (instGuid) sobj.$sys.guid = instGuid;
				
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
				this.resolveAllRefs();
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
			 * @param override - true - перезагрузить рут, false - только подписать
             * @returns {*} - возвращает массив корневых гуидов - либо созданных рутов либо уже существующих но на которые не были подписаны
             */
			// ДОЛЖНА РАБОТАТЬ ТОЛЬКО ДЛЯ МАСТЕР БАЗЫ - СЛЕЙВ НЕ МОЖЕТ ДОБАВИТЬ В СЕБЯ РУТ, МОЖЕТ ТОЛЬКО ПОДПИСАТЬСЯ НА РУТ МАСТЕРА!
			addRoots: function(sobjs, params, rg, override) {
				var subDbGuid = params.subDbGuid;
				var cb = params.compcb;
				
				var res = [];

				this.getCurrentVersion();

				if (!cb) cb = this.getDefaultCompCallback();

				//for (var i=0; i<sobjs.length; i++) {
				for (var i=0; i<rg.length; i++) {
					var root = null;
					if (rg[i].length>36) root = this.getRoot(rg[i]); //sobjs[i].$sys.guid);
					if (!root || override) {
						var time = Date.now();
						if (rg[i].length>36)
							var croot = this.deserialize(sobjs[i], { }, cb, false, rg[i]);
						else croot = this.deserialize(sobjs[i], { }, cb);
						
						var timeEnd = Date.now();
						logger.info((new Date()).toISOString()+';deserialize;'+(timeEnd-time));
						// добавить в лог новый корневой объект, который можно вернуть в виде дельты
						var time = Date.now();
						var serializedObj=this.serialize(croot); // TODO по идее можно взять sobjs[i], но при десериализации могут добавляться гуиды
						var timeEnd = Date.now();
						logger.info((new Date()).toISOString()+';serialize;'+(timeEnd-time));
						var o = { adObj: serializedObj, obj:croot, type:"newRoot"};
						croot.getLog().add(o);
						
					}
					else croot = root.obj;
					var allSubs = this.getSubscribers();

					// возвращаем гуид если рута не было, или был, но не были подписаны, или в режиме оверрайд
					// TODO RFDS проверить нужно ли условие с  "|| override"
					if (!root || (root && !(root.subscribers[subDbGuid])) || override) res.push(croot.getGuid());		

					// форсированная подписка для данных (не для ресурсов) - в будущем скорее всего понадобится управлять этим
					// если добавляются новые ДАННЫЕ, то все подписчики этого корня также будут на них подписаны
					// Альтернатива: можно запрашивать их с клиента при изменении rootInstance, несколько проще, но придется посылать их много раз
					// что хуже с точки зрения нагрузки на сервер и трафика
					for (var guid in allSubs) {
						var subscriber = allSubs[guid];
						if (subscriber.kind == 'remote') {
							// Подписываем либо данные (тогда всех) либо подписчика
							if ((croot.getTypeGuid() == UCCELLO_CONFIG.classGuids.DataRoot ) || (subDbGuid == subscriber.guid))
							  this.pvt.rcoll[croot.getGuid()].subscribers[subscriber.guid] = subscriber;
						}
					}			
					
					if (params.expr) {
						root = this.getRoot(croot.getGuid()); 
						root.hash = params.expr;
					}
				}

				if (!this.inTran()) { // автоматом "закрыть" транзакцию (VALID VERSION = DRAFT VERSION)
					this.setVersion("valid",this.getVersion());			// сразу подтверждаем изменения в мастере (вне транзакции)
					this.getController().genDeltas(this.getGuid());		// рассылаем дельты
				}
				if (DEBUG) console.log("SERVER VERSION " + this.getVersion());

				return res;
			},
			
			addObj: function(objType, parent, flds) {
				return new MemObj(objType, parent, flds);
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
							if (DEBUG) console.log("*** sent setversion error");
							if (DEBUG) console.log("VALID:"+this.getVersion("valid")+"draft:"+this.getVersion()+"sent:"+this.getVersion("sent"));
						}

						break;
					case "valid":
						this.pvt.validVersion=val;
						if (DEBUG) console.log("*** valid setversion "+val);
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
							if (DEBUG) console.log("*** draft setversion error");
							if (DEBUG) console.log("VALID:"+this.getVersion("valid")+"draft:"+this.getVersion()+"sent:"+this.getVersion("sent"));
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
				if (DEBUG) console.log("****************************************  UNDO MODIFICATIONS!!!!!!!!!!");
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