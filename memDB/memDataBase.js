if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * База данных
 * @module MemDataBase
 */
define(
	["../system/event","../system/utils", "./memCol", "./memObj", "./memMetaRoot", "./memMetaObj", "./memMetaObjFields", "./memMetaObjCols"],
	function(Event,Utils, MemCollection,MemObj,MemMetaRoot,MemMetaObj,MemMetaObjFields,MemMetaObjCols) {


		var metaObjFieldsGuid =  UCCELLO_CONFIG.guids.metaObjFieldsGuid;
		var metaObjColsGuid =  UCCELLO_CONFIG.guids.metaObjColsGuid;
		var metaRootGuid =  UCCELLO_CONFIG.guids.metaRootGuid;
		var metaObjGuid =  UCCELLO_CONFIG.guids.metaObjGuid;

		var csFullGuidDelimiter = "@"; // GUID delimiter

		var MemDataBase = UccelloClass.extend(/** @lends module:MemDataBase.MemDataBase.prototype */{

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
		        pvt.$maxRootId = -1;        // максимальный номер корневого объекта
		        pvt.subscribers = {}; 		// все базы-подписчики
		        pvt.dataRoots = {};         // список всех dataRoots

		        if ("guid" in params)
		            pvt.guid = params.guid;
		        else
		            pvt.guid = controller.guid();
		        pvt.counter = 0;
		        pvt.controller = controller; //TODO  если контроллер не передан, то ДБ может быть неактивна
		        pvt.controller.createLocalProxy(this);
		        pvt.defaultCompCallback = null; // коллбэк по умолчанию для создания компонентов

		        pvt.version = 0;
		        pvt.validVersion = 0;
		        pvt.sentVersion = 0;

		        this.event = new Event();
				// транзакции
				pvt.curTranGuid = undefined; // верси текущей транзакции БД
				pvt.tranCounter = 0;		// счетчик транзакции
				pvt.tho = {};
				pvt.tha = [];

				pvt.execQ = [];
				pvt.execTr = {};
				pvt.memTranIdx = 0;

				if (params.kind != "master") {
		            var db=this;
		            controller._subscribe(this,params.proxyMaster, function(result) {
		                pvt.proxyMaster = controller.getProxy(params.proxyMaster.guid);
		                /*pvt.version = result.data.dbVersion; // устанавливаем номер версии базы по версии мастера
		                pvt.validVersion = pvt.version;
		                pvt.sentVersion = pvt.version;*/
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
					root.vho = {};			// история версий
					root.vha = [];
		            root.event = new Event();
		            this.pvt.robjs.push(root);
		            this.pvt.rcoll[obj.getGuid()] = root;
		        }

		    },

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
             * @private
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
		            delete this.pvt.refTo[guid];
                };
		        var refFrom = this.pvt.refFrom[guid];
		        if (refFrom) {
		            var links = Object.keys(refFrom);
		            for (var i = 0; i < links.length; i++) {
		                var link = refFrom[links[i]];
		                link.val.objRef = null;
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
		                refFrom[link.src.getGuid() + "_" + link.field] = link;

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

		        // Backup initial state
			    var oldGuidInstanceRes = ref.guidInstanceRes;
			    var isChanged = false;

			    if (ref.guidInstanceElem) {
			        objRef = this.getObj(ref.guidInstanceElem);
			        if (objRef)
			            ref.objRef = objRef;
                } else {
			        if (ref.is_external) {
			            // External ref
			            var objResBase = this.pvt.resMap[ref.guidRes];
			            if (objResBase) {
			                if (ref.guidInstanceRes) {
			                    objRef = objResBase[ref.guidInstanceRes];
			                } else
			                    // Try to get resorce with GuidInstance == GuidResource
			                    objRef = objResBase[ref.guidRes];
			            };
			            if ((!ref.guidInstanceRes) && objResBase && (!objRef)) {
			                // Resorce with GuidInstance == GuidResource doesn't exist,
			                //   then try to get another resorce with that Guid
			                var guids = Object.keys(objResBase);
			                if (guids.length == 1) {
			                    // There should be the only resource
			                    objRef = objResBase[guids[0]];
			                };
			            };
			            if ((!ref.guidInstanceRes) && objRef) {
			                ref.guidInstanceRes = objRef.root.getGuid();
			                isChanged = true;
			            };
			        } else {
			            // Internal ref

			            if (obj && (typeof (obj.getRoot) === "function")) {
			                if (!(ref.guidInstanceRes && ref.guidRes)) {
			                    // Set root of current object to resource reference
			                    var root = obj.getRoot();
			                    ref.guidRes = root.getGuidRes();
			                    ref.guidInstanceRes = root.getGuid();
			                };
			                objRef = this.pvt.resMap[ref.guidRes];
			                if (objRef)
			                    objRef = objRef[ref.guidInstanceRes];
			            };
			        };

			        if (objRef)
			            if (ref.guidElem == ref.guidRes)
			                objRef = objRef.root; // Ref to the root object
			            else
			                objRef = objRef.elems[ref.guidElem];
			        if (objRef) {
			            ref.guidInstanceElem = objRef.getGuid();
			            ref.objRef = objRef;
			        } else
			            // Restore initial state
			            if (isChanged)
			                ref.guidInstanceRes = oldGuidInstanceRes;
                };

			},

		    /**
             * Will set new maximal root id if a parameter value is greater than current one.
             * 
             * @param {Integer} val A new value
             */
		    setMaxRootId: function (val) {
		        this.pvt.$maxRootId = (this.pvt.$maxRootId < val) ? val : this.pvt.$maxRootId;
		    },

		    /**
             * Returns the next incremental root id.
             * 
             * @return {Integer}
             */
		    getNextRootId: function () {
		        return ++this.pvt.$maxRootId;
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
					if ((o.pvt.fieldsTable == undefined) || (o.pvt.colsTable == undefined))
						o._bldElemTable();
				}
			},

            /**
             * вернуть список гуидов корневых объектов за исключением метаинфо
			 * @param rootKind - "res"|"data" - тип рута, если не передается или "all", то все
             */
			getRootGuids: function(rootKind) {
				var guids = [];
				if (Array.isArray(rootKind))
					var guids = rootKind;
				else {
					if ((rootKind == "res") || (rootKind == "data") || (rootKind == "all") || (!rootKind)) {
						var ro = this.pvt.robjs;
						for (var i=0; i<ro.length; i++) {
							var cguid = ro[i].obj.getGuid();
							if ((cguid!=metaRootGuid) && ((ro[i].type==rootKind) || (rootKind===undefined) || (rootKind==="all"))) 
								guids.push(cguid);
						}
					}
					else
						guids.push(rootKind);
				}
				return guids;
			},

		    /**
             * Deletes object [obj] from all the reference lists in memDB .
             * 
             * @param {Object} obj
             */
			_clearSingleObjRefs: function (obj) {
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
			},

			 /**
             * вызывается коллекциями при удалении объекта, генерирует событие, на которое можно подписаться
             */
			onDeleteObject: function (obj) {
			    var root = this.getRoot(obj.getRoot().getGuid());

			    this._clearSingleObjRefs(obj);

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
             * @param dbGuid - гуид базы данных подписчика
             * @param rootGuids - 1 гуид или массив гуидов либо селектор - "res" для ресурсов, "data" для данных, "all" для всех
             * @returns {*}
             */
			onSubscribeRoots: function(dbGuid, rootGuids) {
				// TODO проверить что база подписана на базу
				var rg = [];
				var res = [];

				this.pvt.controller.genDeltas(this.getGuid());
				
				rg  = this.getRootGuids(rootGuids);

				for (var i=0; i<rg.length; i++) {
					if (this.pvt.robjs.length > 0) {
						var ro = this._onSubscribeRoot(dbGuid,rg[i]);
						res.push(this.serialize(ro.obj)); 
					}
				}
				return res;
			},

            /**
             * Подписать клиента на рут
             * @param dbGuid
             * @param rootGuid - 1 гуид 
             * @returns {*}
             */			
			_onSubscribeRoot: function(dbGuid, rootGuid, inLog) {
				var ro = this.pvt.rcoll[rootGuid];
				if (ro) {
					// добавляем подписчика
					var subProxy = this.pvt.subscribers[dbGuid];
					if (subProxy) {
						var clog = ro.obj.getLog();
						if (!clog.getActive()) clog.setActive(true); // если лог неактивен, то активировать и записывать в него изменения
						ro.subscribers[dbGuid] = subProxy;
						if (inLog) { // запоминаем в sobj копию объекта на момент подписки
							var sobj = this.serialize(ro.obj);
							clog.add({ obj:ro.obj, sobj: sobj, type:"subscribe", subscriber: dbGuid });
						}
						return ro;
					}
				}			
				return null;
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
             * @param {object}  obj
             * @param {boolean} [use_resource_guid = false] использовать гуид ресурса вместо гуида инстанса
             * @returns {*}
             */
			serialize: function(obj, use_resource_guid) {
				// проверить, что объект принадлежит базе
				if (!("getDB" in obj) || (obj.getDB()!=this)) return null;

				var newObj = {};
				newObj.$sys = {};

				if (use_resource_guid)
				    newObj.$sys.guid = obj.getGuidRes();
                else
				    newObj.$sys.guid = obj.getGuid();

				newObj.ver = obj.getRootVersion();

				newObj.$sys.typeGuid = obj.getTypeGuid();
				newObj.fields = {};
				for (var i = 0; i < obj.count() ; i++)
				    newObj.fields[obj.getFieldName(i)] = obj.getSerialized(i, use_resource_guid);
				// коллекции
				newObj.collections = {};
				for (i=0; i<obj.countCol(); i++) {
					var cc=obj.getCol(i);
					var cc2=newObj.collections[cc.getName()] = {};
					for (var j=0; j<cc.count(); j++) {
					    var o2 = this.serialize(cc.get(j), use_resource_guid);
						cc2[j] = o2;
					}
				}
				return newObj;	// TODO? делать stringify тут?
			},

		    /**
             * Splits "full" GUID into 2 parts:
             * - GUID itself
             * - root id (integer value)
             * Full GUID format: <Guid><csFullGuidDelimiter><root id>
             * 
             * @param {String} val Full GUID
             * @return {Object}
             * @return {String} retval.guid - GUID part
             * @return {Integer} retval.rootId - root id part (=-1 if missing)
             */
			parseGuid: function (aGuid) {
			    var ret = { guid: aGuid, rootId: -1 };
			    var i = aGuid.lastIndexOf(csFullGuidDelimiter);
			    if (i != -1) {
			        ret.guid = aGuid.substring(0, i);
			        var id = aGuid.substring(i + 1);
			        if (!isNaN(parseInt(id)) && isFinite(id)) {
			            ret.rootId = parseInt(id);
			        };
			    };
			    return ret;
			},

		    /**
             * Makes "full" GUID from guid structure:
             * - GUID itself
             * - root id (integer value)
             * Full GUID format: <Guid><csFullGuidDelimiter><root id>
             * 
             * @param {Object} aGuid
             * @param {String} aGuid.guid GUID part
             * @param {String} aGuid.rootId root id
             * @return {String} "full" GUID
             */
			makeGuid: function (aGuid) {
			    return aGuid.guid + ((aGuid.rootId > 0) ? csFullGuidDelimiter + aGuid.rootId : "");
			},

		    /**
             * Deletes object [obj] (and it's childs as well)
             *  from all the reference lists in memDB.
             *
             * @param {Object} obj
             */
			clearObjRefs: function (obj) {
			    for (var i = 0; i < obj.countCol() ; i++) {
			        var cc = obj.getCol(i);
			        for (var j = 0; j < cc.count() ; j++) {
			            this.clearObjRefs(cc.get(j));
			        };
                };
			    this._clearSingleObjRefs(obj);
			},

			getListOfTypes: function (obj, types, notCheck) {
			    var objTypeGuid = null;
			    if (!types.list)
			        types.list = {};
			    switch (obj.$sys.typeGuid) {

			        case metaObjFieldsGuid:
			            break;

                    case metaObjColsGuid:
			            break;

                    case metaRootGuid:
			            break;

                    case metaObjGuid:
			            objTypeGuid = obj.$sys.guid;
			            break;

			        default:
			            objTypeGuid = obj.$sys.typeGuid;
			    }
			    for (var cn in obj.collections) {
			        for (var co in obj.collections[cn])
			            this.getListOfTypes(obj.collections[cn][co], types, notCheck);
			    };
			    var constructHolder = this.getContext() ? this.getContext().getConstructorHolder() : null;
			    if (objTypeGuid && constructHolder && (!types.list[objTypeGuid])
                    && ((!constructHolder.getComponent(objTypeGuid)) || notCheck)) {
			        types.list[objTypeGuid] = true;
			        types.arrTypes.push(objTypeGuid);
			    };
			},

		    /**
             * десериализация в объект
             * @param {object} sobj - объект который нужно десериализовать
			 * @param {object} parent - родительский "объект" - parent.obj, parent.colName для некорневых либо {} для корня, rtype: "res"|"data"
			 * @callback cb - вызов функции, которая выполняет доп.действия после создания объекта
			 * @param {boolean} keep_guid сохранять ли оригинальные GUID-ы при десериализации?
             * @returns {*}
             */
			deserialize: function (sobj, parent, cb, keep_guid, instGuid) {

                // TEMPORARY SOLUTION (will be deleted) !!!
			    //if (keep_guid === undefined)
			    //    keep_guid = true;

			    function ideser(that, sobj, parent) {
					if (!("obj" in parent)) parent.db = that;
					if (keep_guid)
					    sobj.$sys.keep_guid = true;
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

						    if (!typeObj) {
						        var constructHolder = that.getContext() ? that.getContext().getConstructorHolder() : null;
						        if (constructHolder) {
						            var constr = constructHolder.getComponent(sobj.$sys.typeGuid);
						            if (constr)
						                constr = constr.constr;
						            if (constr) {
						                new constr(that);
						                typeObj = that.getObj(sobj.$sys.typeGuid);
                                    }
						        };
						    };

							if (typeObj) {
								if (cb!=undefined) o = cb(typeObj, parent, sobj);
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

			    if ("obj" in parent) parent.obj.getLog().setActive(false); // отключить лог на время десериализации

				// заменить гуид ресурса на гуид экземпляра
				if (instGuid) sobj.$sys.guid = instGuid;
				
                // Очистить все ссылки на объект, если он уже существует
				if (sobj.$sys.guid) {
				    if ((this.parseGuid(sobj.$sys.guid).rootId != -1)
                            || keep_guid) {
				        var currObj = this.getObj(sobj.$sys.guid);
				        if (currObj)
				            this.clearObjRefs(currObj);
				    }
				};

				var res = ideser(this, sobj, parent);
				var rholder = this.getRoot(res.getGuid());
				
				if (rholder)   // VER инициализация номеров версий рута
					if (("ver" in sobj)) {
						res.setRootVersion("draft",sobj.ver);
						res.setRootVersion("sent",sobj.ver);
						res.setRootVersion("valid",sobj.ver);
						/*
						rholder.vver = sobj.ver; 
						rholder.sver = sobj.ver; // НАЗНАЧЕНИЕ ВЕРСИЙ ВЫНЕСТИ ЗА ПРЕДЕЛЫ ДЕСЕРИАЛАЙЗА
						rholder.dver = sobj.ver;
						*/
					}

				this.resolveAllRefs();
				res.getLog().setActive(true);
				return res;
			},

			setDefaultCompCallback: function(cb) {
				this.pvt.defaultCompCallback = cb;
			},

			getDefaultCompCallback: function() {
				return this.pvt.defaultCompCallback;
			},

		    /**
             * Добавляет конструкторы компонентов от УДАЛЕННЫХ провайдеров,
             *   если они отсутствуют в "constructHolder"
             *   (вызывается перед десериализацией, если это не DELTA)
             *
             * @param  {Array}    objArr    Массив объектов, которые предстоит десериализовать
             * @param  {Function} callback  Вызывается по завершении операции (аргумент: массив(Guid) типов, для которых конструкторы не найдены)
             */
			addRemoteComps: function (objArr, callback) {
			    var callbackNow = callback ? true : false;
			    var self = this;
			    var types = { arrTypes: [] };

			    function localCallback(missingTypes) {

			        if (callback)
			            setTimeout(callback, 0);
			    };

			    if (objArr) {
			        for (var i = 0; i < objArr.length; i++) {
			            this.getListOfTypes(objArr[i], types);
			        };
			        if (types.arrTypes.length > 0) {
			            var constructHolder = this.getContext() ? this.getContext().getConstructorHolder() : null;
			            if (constructHolder) {
			                callbackNow = false;
			                constructHolder.addRemoteComps(types.arrTypes, this, localCallback);
			            };
			        };
			    };
			    if (callbackNow)
			        setTimeout(callback, 0);

			},

		    /**
             * Добавляет конструкторы компонентов от ЛОКАЛЬНЫХ провайдеров,
             *   если они отсутствуют в "constructHolder"
             *   (вызывается перед десериализацией, если это не DELTA)
             *
             * @param  {Array}  objArr    Массив объектов, которые предстоит десериализовать
             */
			addLocalComps: function (objArr) {
			    if (objArr) {
			        var types = { arrTypes: [] };
			        for (var i = 0; i < objArr.length; i++) {
			            this.getListOfTypes(objArr[i], types);
			        };
			        if (types.arrTypes.length > 0) {
			            var constructHolder = this.getContext() ? this.getContext().getConstructorHolder() : null;
			            if (constructHolder) {
			                var missingTypes = constructHolder.addLocalComps(types.arrTypes, this);
                        };
			        };
			    };
			},

		    /**
             * добавить корневые объекты путем десериализации
             * @param {array} sobjs - массив объектов которые нужно десериализовать
			 * @param params.subDbGuid - гуид базы данных подписчика (для идентификации)
			 * @param override - true - перезагрузить рут, false - только подписать
             * @returns {*} - возвращает массив корневых гуидов - либо созданных рутов либо уже существующих но на которые не были подписаны
             */
			addRoots: function(sobjs, params, rg, rgsubs) {
				if (!this.isMaster()) return null; // Работает только на мастер-базе. Слейв добавляет рут через мастер.

				this.getController().genDeltas(this.getGuid());		// рассылаем дельты

				var subDbGuid = params.subDbGuid;
				var cb = this.getDefaultCompCallback();
				
				var res = [];

				var allSubs = this.getSubscribers();

				for (var i=0; i<rg.length; i++) {
					var root = null;
					if (rg[i].length>36) {
						root = this.getRoot(rg[i]);
						var croot = this.deserialize(sobjs[i], { }, cb, false, rg[i]);
					}
					else croot = this.deserialize(sobjs[i], { }, cb);
						
					croot.getCurVersion();					

					// возвращаем гуид если рута не было, или был, но не были подписаны
					if (!root || (root && !(root.subscribers[subDbGuid])) ) res.push(croot.getGuid());		

					// форсированная подписка для данных (не для ресурсов) - в будущем скорее всего понадобится управлять этим
					// если добавляются новые ДАННЫЕ, то все подписчики этого корня также будут на них подписаны
					// Альтернатива: можно запрашивать их с клиента при изменении rootInstance, несколько проще, но придется посылать их много раз
					// что хуже с точки зрения нагрузки на сервер и трафика
			
					for (var guid in allSubs) {
						var subscriber = allSubs[guid];
						if (subscriber.kind == 'remote') {
							// Подписываем либо данные (тогда всех) либо подписчика
							if (croot.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot) || subDbGuid==subscriber.guid)
								this._onSubscribeRoot(guid,croot.getGuid(),true);
						}
					}			

					if (params.expr) {
						root = this.getRoot(croot.getGuid()); 
						root.hash = params.expr;
					}
				}	
				
				// просто подписать остальные руты
				for (i=0; i<rgsubs.length; i++) {
					root = this.getRoot(rgsubs[i]);
					if (root) {
						croot = root.obj;		
						// возвращаем гуид если не были подписаны
						if (!(root.subscribers[subDbGuid]))  res.push(croot.getGuid());	
						for (guid in allSubs) { // то же, что и выше TODO отрефакторить
							subscriber = allSubs[guid];
							if (subscriber.kind == 'remote') {
								// Подписываем либо данные (тогда всех) либо подписчика (если ресурс), но только если еще не подписан!
								var subs2 = this.pvt.rcoll[croot.getGuid()].subscribers;
								if ((croot.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot) || subDbGuid==subscriber.guid) && !(subs2[subscriber.guid])) 
									this._onSubscribeRoot(guid,croot.getGuid(),true);
							}
						}			
					}
					else {
						var ggs = this.getRootGuids();
						console.log("ERROR ROOT SUBSCRIPTION", ggs.length, ggs, rg, rgsubs, this.pvt.rcoll);
					}
					
				}
/*
				if (!this.getCurTranGuid()) {
					// TODO 10
					// this.setVersion("valid",this.getVersion());			// сразу подтверждаем изменения в мастере (вне транзакции)
					this.getController().genDeltas(this.getGuid());		// рассылаем дельты
				}
*/
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
			
            /**
             * Вернуть название БД
             * @returns {*}
             */
			getName: function() {
				return this.pvt.name;
			},
			
            /**
             * Вернуть версию БД
             */
			 /*
			getVersion: function(verType) {
				switch (verType) {
					case "sent": return this.pvt.sentVersion;
					case "valid": return this.pvt.validVersion;
					default: return this.pvt.version;
				}
			},
			
			_getVersion: function(verType) {
				return this.getVersion(verType);
			},

			setVersion: function(verType,val) {
				switch (verType) {
					case "sent":
						if ((val<=this.pvt.version)) this.pvt.sentVersion=val;
						else {
							//if (DEBUG) console.log("*** sent setversion error");
							//if (DEBUG) console.log("VALID:"+this.getVersion("valid")+"draft:"+this.getVersion()+"sent:"+this.getVersion("sent"));
						}

						break;
					case "valid":
						this.pvt.validVersion=val;
						//if (DEBUG) console.log("*** valid setversion "+val);
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
			
			_setVersion: function(verType,val) {
				return this.setVersion(verType,val);
			},*/

			// вернуть "текущую" версию, которой маркируются изменения в логах
			
			/*
			getCurrentVersion: function() {

				var sver = this.getVersion("sent");
				var ver = this.getVersion();
				if (ver==sver) this.setVersion("draft",this.getVersion()+1);
				return this.getVersion();
			},*/


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
             * получить объект по его гуиду
             * @param {string} guid
             * @returns {*}
             */
			getObj: function(guid) {
				return this.pvt.objs[guid];
			},

            /**
             * Проиграть назад изменения по логам базы данных
			 * @param {number} version - номер версии, до которого нужно откатить
             */
			undo: function(version) {
				if (DEBUG) console.log("****************************************  UNDO MODIFICATIONS!!!!!!!!!!");
				// TODO 10 -  ПЕРЕПИСАТЬ
				/*
				if (version<this.XgetVersion("valid"))
					return false;
				for (var i=0; i<this.countRoot(); i++)
					this.getRoot(i).obj.getLog().undo(version);

				if (this.XgetVersion("sent")>version) this.XsetVersion("sent",version);
				this.XsetVersion("draft",version);
				*/
				return true;
			},

            /**
             * Сгенерировать "дельты" по логу изменений
             * (для сервера нужно будет передавать ИД подписчика)
             * @returns {Array}
             */
			genDeltas: function() {
			    var allDeltas = [];

			    for (var i = 0; i < this.countRoot() ; i++) {
			        var log = this.getRoot(i).obj.getLog();
			        var d = log.genDelta();
					if (d != null) {
					    if (d.rootGuid === metaRootGuid) {
                            // Мета-данные д.б. впереди всех дельт
					        allDeltas.unshift(d);
					        /////////////////////////////////////////////////////////////////////////////////////////////////
					        // Добавление кода конструкторов для новых типов из metaRoot
					        //
					        var constructorHolder = this.getContext() ? this.getContext().getConstructorHolder() : null;
					        if (constructorHolder) {
					            var types = log.getListOfTypes(d, types);
				                if (types.arrTypes.length > 0) {
				                    var res = constructorHolder.getLocalComps(types.arrTypes);
				                    if (res.constr.length > 0)
				                        // Конструкторы должны идти сразу за мета-данными
				                        allDeltas.splice(1, 0, { rootGuid: metaRootGuid, constructors: res.constr });
                                };
					        };
					    } 
						else
					        allDeltas.push(d);
					}
				}

				return allDeltas;
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
			},

			// Транзакции
			// - только 1 транзакция в единицу времени на memDB			
			tranStart: function(guid, srcDbGuid) {	
				var p = this.pvt;
				if (p.curTranGuid) {
					if ((p.curTranGuid == guid) || (!guid)) 
						p.tranCounter++;
					else return;
				}
				else {
					p._memFunc = [];
					p._memFuncDone = [];
					if (guid) {
						p.curTranGuid = guid;
						p.srcDbGuid = srcDbGuid;
						p.externalTran = true;
					}
					else {
						p.curTranGuid = Utils.guid();
						p.externalTran = false;
					}
					p.tranCounter=1;
					if (!p.tho[p.curTranGuid]) {
						var ct = p.tho[p.curTranGuid] = {};
						ct.guid = p.curTranGuid;
						ct.start = new Date();
						ct.src = srcDbGuid ? srcDbGuid : this.getGuid();
						ct.state = 's';
						ct.prev = (p.tha.length>0) ? p.tha[p.tha.length-1] : null; // сослаться на предыдующую транзакцию
						p.tha.push(ct);
					}
					var trobj = this.pvt.tho[p.curTranGuid];
					trobj.guid = p.curTranGuid;
					trobj.roots = {};

				}
				if (DEBUG)
				    console.log("TRANSTART "+p.curTranGuid+" | " + p.tranCounter," Ext:",p.externalTran);
				return p.curTranGuid;
				
			},

			tranCommit: function() {				
				function icb() {
					// Когда приходит подтверждение коммита с сервера, выставляем valid-версии в соответствии с тем, что запомнили
					/*
					for (var cguid in verByRoot) {
						that.getObj(cguid).setRootVersion("valid",verByRoot[cguid]);
						console.log("%c Update versions ", "color:red",cguid+" "+verByRoot[cguid]);
					}	
					*/
					that._setTranState(memTr,'c');
					
				}
				var that = this, p = this.pvt, memTran = p.curTranGuid; 
				if (p.tranCounter==0) return;
				if (p.tranCounter==1) {	// Счетчик вложенности = 1, закрываем транзакцию
					var /*verByRoot = {},*/ guids = this.getRootGuids(), isMaster = this.isMaster();
					/*
					for (var i=0; i<guids.length; i++) 
						verByRoot[guids[i]] = this.getObj(guids[i]).getRootVersion(); // запомнить draft-версию для коммита
						*/
					
					// сгенерировать и разослать дельты (либо на сервер либо подписчикам)
					if (isMaster)
						this.getController().genDeltas(this.getGuid());
					else
					  if (!p.externalTran)
						this.getController().genDeltas(this.getGuid(),undefined, function(res,cb) { that.sendDataBaseDelta(res,cb); });
					  
					if (isMaster || p.externalTran) // TODO 10 точно ли так нужно обрабатывать externalTran?
						icb();
					else 
						this._rcCommit(icb);
					if (isMaster) // разослать маркер конца транзакции всем подписчикам кроме srcDbGuid					  
					  this.subsRemoteCall("endTran",undefined,this.pvt.srcDbGuid); 
					
					this.getTranObj(p.curTranGuid).end = new Date();
					var memTr = p.curTranGuid;
					p.curTranGuid = undefined;
					p.tranCounter = 0;
					p.externalTran = false;		
					p._memFunc = [];
					p._memFuncDone = [];
					this._setTranState(memTr,'p'); // установить транзакцию в pre-commit
						
					if (memTran && !this.inTran()) {
						delete this.pvt.execTr[memTran]; // почистить очередь транзакции
						this.pvt.execQ.splice(0,1);
						this.pvt.memTranIdx++;			
					}	
				}
				else p.tranCounter--;
				if (DEBUG)
				    console.log("TRAN|COMMIT " + memTran + " " + p.tranCounter);
			},
									
			// синхронизировать в рамках транзакции
			syncInTran: function(doneBefore,doneAfter) {	
				if (!this.inTran()) return;
				if (!this.pvt._memFunc || !this.pvt._memFunc.length) return; 				

				this.tranStart();
				this._rc(this.pvt._memFunc,this.pvt._memFuncDone,doneBefore,doneAfter);
				this.pvt._memFunc = [];
				this.pvt._memFuncDone = [];
			},

			rc: function(objGuid, func, aparams, cb) {
				if (this.isMaster()) {
					// TODO кинуть исключение
					return;
				}			
				if (this.inTran())
					this._rcAdd(objGuid, func, aparams, cb);
				else
					this._rc([{objGuid: objGuid, func:func, aparams:aparams }],[cb]);
			},

			// запомнить удаленный вызов на клиенте в транзакции
			_rcAdd: function(objGuid, func, aparams, cb) {
				if (this.isMaster() || !this.inTran()) {
					console.log("REMOTE CALL Вне транзакции ");
					return;
				}
				if (objGuid && !this.get(objGuid)) {
					console.log("Объект не принадлежит базе ",objGuid);
					return;
				}
				var args = {objGuid: objGuid, func:func, aparams:aparams };
				if (func == "sendDataBaseDelta") { // Дельты в пакете всегда перед вызовами других методов, поэтому вставляем в начало массива
					this.pvt._memFunc.splice(0,0,args);
					this.pvt._memFuncDone.splice(0,0,cb);
				}
				else {
					this.pvt._memFunc.push(args);
					this.pvt._memFuncDone.push(cb);
				}
			},
						
			// команда завершения транзакции
			_rcCommit: function(cb) {
				if (!this.inTran()) return;				
				function icb(result) {		
					if (cb) cb(result);
				}		
				var args = {objGuid: undefined, func:"endTran", aparams:undefined };
				this._rc([args],[icb]);
			},
			
			_rc: function(rcargs,rccbs,doneBefore,doneAfter) { // TODO 10 - если есть удаленный вызов кроме дельты, то установить lock
				function icb(result) {				
					if (doneBefore) doneBefore();	
					for (var i=0; i<result.cbres.length; i++) 
						if (rccbs[i]) rccbs[i](result.cbres[i]);					
					that.getController().genDeltas(that.getGuid(),undefined, function(res,cb1) { that.sendDataBaseDelta(res,cb1); });
					that.syncInTran(doneBefore,doneAfter); 
					that.tranCommit();
					if (doneAfter) doneAfter();
				}
				var that = this;
				var socket = this.getSocket();
				var pg = this.getProxyMaster().guid;
				var data={action:"remoteCall3",type:"method",args: { masterGuid: pg, rc: rcargs } };
				if (this.getCurTranGuid()) {
					data.trGuid = this.getCurTranGuid();		
					data.srcDbGuid = this.getGuid();
					/*
					data.rootv = {}; // добавить версии рутов
					var guids = this.getRootGuids();
					for (var i=0; i<guids.length; i++)
						data.rootv[guids[i]]=this.getObj(guids[i]).getRootVersion("valid");	
					*/						
				}
				socket.send(data,icb);
				
				if (this.pvt.name!="System") {
					for (var i=0, s = ""; i<rcargs.length; i++) s += rcargs[i].func + " ";
					console.log("%c SEND DATA ("+s+")  ","color: blue", data.args, " trGuid: ",data.trGuid);
				}					
			},
						
			inTran: function() {
				if (this.pvt.tranCounter>0) return true;
				else return false;
			},
			
			isExternalTran: function() {
				return (this.inTran() && this.pvt.externalTran);
			},
						
			tranRollback: function() {
			},
			
			getCurTranGuid: function() {
				return this.pvt.curTranGuid;
			},
			
			getCurTranCounter: function() {
				return this.pvt.tranCounter;
			},
			
			getTranObj: function(guid) {
				return this.pvt.tho[guid];
			},

			getTranList: function(guid) { // TODO 10 лучше скопировать?
				return this.pvt.tha;
			},
			
			// установить состояние транзакции
			_setTranState: function(guid,state) {
				var tobj = this.getTranObj(guid);
				if (!tobj) return;
				if (state == 'p') { // установить в pre-commited
					if (!tobj.prev || tobj.prev.state == 'p' || tobj.prev.state == 'c') {
						tobj.state = 'p';
						return true;
					}
					return false;
				}
				if (state == 'c') { // установить в commited
					if (!tobj.prev || tobj.prev.state == 'c') { // проверить предыдущую транзакцию
						tobj.state = 'c';
						for (var g in tobj.roots) {
							var r = this.getObj(g);
							r.setRootVersion("valid",tobj.roots[g].max);
						}
						return true;
					}
					return false;
				}
				//TODO 10 сделать другие состояния
			},
			
			// почистить все транзакции до транзакции с гуидом guid (хронологически), если guid==undefined, то почистить все
			truncTran: function(guid) {

				var p = this.pvt;
				if (guid) {

					var roots = {};
					for (var i=0; i<p.tha.length; i++) {

						var tobj = p.tha[i];
						for (var g in tobj.roots) 
							roots[g] = roots[g] ? Math.max(roots[g],tobj.roots[g].max) : tobj.roots[g].max;
						
					
						if (tobj.guid == guid) {
							for (var g in roots) 
								this.getObj(g).truncVer(roots[g]);
							for (var j=0; j<i; j++) 
								delete p.tho[p.tha[j].guid];
							p.tha.splice(0,i+1);	
							if (p.tha.length>0) p.tha[0].prev = null;
							break;
						}
					}
				}
				else {
					p.tha = [];
					p.tho = {};
					var rg = this.getRootGuids();
					for (i=0; i<rg.length; i++) 
						this.getObj(rg[i]).truncVer();
				
				}

			},
			
			onRemoteCall3Plus: function(rc, srcDbGuid, trGuid, rootv, done) {
				var l = rc.length;
				var l2 = l;
				var globres = [];
				function idone(res) {
					l2--;
					globres.push(res);
					if (!l2) {
						done( { cbres: globres } );
					}
				};
				for (var i=0; i<l; i++) {
					var c = rc[i];
					var uobj = (c.objGuid) ?  this.getObj(c.objGuid) : this;
					this.remoteCallExec(uobj, c, srcDbGuid, trGuid, undefined, idone);
				}
			},
			
			// временный вариант ф-ции для рассылки оповещений подписантам, используется для рассылки признака конца транзакции
			subsRemoteCall: function(func, aparams, excludeGuid) {		
				var subs = this.getSubscribers();	
				var trGuid = this.getCurTranGuid();
				for(var guid in subs) {
					var csub = subs[guid];
					if (excludeGuid!=guid) // для всех ДБ кроме исключенной (та, которая инициировала вызов)
						csub.connect.send({action:func, trGuid: trGuid, dbGuid:guid, srcDbGuid:excludeGuid }); //TODO TRANS2 сделать вызов любого метода
				}
			},
			
            /**
             * Метод для отправки дельт - инкапсуляция аналогичного метода контроллера БД
			 * (требуется для проведения посылки дельт через транзакционный механизм)
             * @param data
			 * @param cb
             */			
			sendDataBaseDelta: function(data, cb) {
				if (this.isMaster()) {	
					var cdb = this.getController();
					var res=cdb.applyDeltas(data.dbGuid, data.srcDbGuid, data.delta);
					if (cb) cb({data: { /*dbVersion: cdb.getDB(data.dbGuid).getVersion() */}});
				}
				else {
					this.rc(undefined, 'sendDataBaseDelta',[data],cb);
				}
			},			
			
			_checkRootVer: function (rootv) {
			    if (DEBUG)
			        console.log("CHECK ROOT VERSIONS");
				for (var guid in rootv) console.log(guid, rootv[guid],this.getObj(guid).getRootVersion("valid"));
				for (var guid in rootv) 
					if (rootv[guid] != this.getObj(guid).getRootVersion("valid")) return false;
				return true;
			},
			
            /**
             * Ответ на вызов удаленного метода. Ставит вызовы в очередь по транзакциям
             * @param uobj {object}
             * @param args [array] 
             * @param srcDbGuid - гуид БД-источника
			 * @param trGuid - гуид транзакции (может быть null)
			 * @param rootv {object} - версии рутов
			 * @callback done - колбэк
             */
			remoteCallExec: function(uobj, args, srcDbGuid, trGuid, rootv, done) {
				var db = this;
				var trans = this.pvt.execTr;
				var queue = this.pvt.execQ;
				var auto = false;				
				// пропускаем "конец" транзакции если клиент был сам ее инициатором
				if (trGuid && (db.getCurTranGuid() == trGuid) && !(db.isExternalTran()) && (args.func=="endTran")) 
					return;
				if (!trGuid) {	// "автоматическая" транзакция, создается если нет гуида транзакции
					trGuid = Utils.guid();
					auto=true;
				}
				if (!(trGuid in trans)) { // создать новую транзакцию и поставить в очередь
					var qElem = {};
					qElem.tr = trGuid;
					qElem.src = srcDbGuid
					qElem.q = [];
					qElem.a = auto;
					queue.push(qElem);
					trans[trGuid] = this.pvt.memTranIdx+queue.length-1; // "индекс" для быстрого доступа в очередь
				}
				var tqueue = queue[trans[trGuid]-this.pvt.memTranIdx].q;

				function done2(res,endTran) { // коллбэк-обертка для завершения транзакции				
					var memTranGuid = db.getCurTranGuid();
					tq = queue[trans[memTranGuid]-db.pvt.memTranIdx];		
					db.getController().genDeltas(db.getGuid()); // сгенерировать дельты и разослать подписчикам
					var commit = tq.a || endTran; // конец транзакции - либо автоматическая либо признак конца
					if (commit) { 
						//db.subsRemoteCall("endTran",undefined, srcDbGuid); // разослать маркер конца транзакции всем подписчикам кроме srcDbGuid
						if (db.isExternalTran()) // закрываем только "внешние" транзакции (созданные внутри remoteCallExec)
							db.tranCommit();   // TODO 10 -	isExternalTran должна возвр тру, эта проверка лишняя?
						db.event.fire({
							type: 'endTransaction',
							target: db
						});
						
						if (done) done(res);
						
						delete trans[memTranGuid];
						queue.splice(0,1);
						db.pvt.memTranIdx++;
						db.pvt.execFst = false;
						
						if (queue.length>0) { // Если есть другие транзакции в очереди, то перейти к их выполнению
							db._checkRootVer(rootv);
							db.tranStart(queue[0].tr, queue[0].src);
							db.pvt.execFst = true;
							var f=queue[0].q[0];
							f(); 
						}										
					}			
					else {
						if (done) done(res); // сейчас срабатывает только на сервере, чтобы вернуть ответ на клиент
						
						tq.q.splice(0,1);				
						if (tq.q.length>0) 
							tq.q[0]();
						else 
							db.pvt.execFst = false;
					}
					//console.log("RCEXEC DONE ",args.func,args,trGuid,auto,commit, queue);
				}
				var aparams = args.aparams || [];
				aparams.push(done2); // добавить колбэк последним параметром

				function exec1() {
					if (args.func == "endTran")  // если получили маркер конца транзакции, то коммит
						done2(null,true);		
					else
						uobj[args.func].apply(uobj,aparams); // выполняем соответствующий метод uobj.func(aparams)		
				}	
				// ставим в очередь
				tqueue.push(function() { exec1(); });
				//console.log("RCEXEC PUSH TO QUEUE ",args.func,args,trGuid,auto, queue);
							
				if (!db.inTran()) {
					this._checkRootVer(rootv);
					db.tranStart(trGuid,srcDbGuid); // Если не в транзакции, то заходим в нее
				}

				if (trGuid == db.getCurTranGuid()) { // Если мемДБ в той же транзакции, что и метод, можем попробовать его выполнить, но только		
					if (!this.pvt.execFst) { 		// если первый вызов не исполняется в данный момент
						this.pvt.execFst = true;
						tqueue[0](); // выполнить первый в очереди метод
					}				
				}
			},

		    /**
             * Регистрирует dataRoot по имени в списке
             * 
             * @param {String}  name Имя dataRoot
             * @param {Object}  dataRoot Сам dataRoot
             * @return {String}
             */
			registerDataRoot: function (name, dataRoot) {
			    this.pvt.dataRoots[name] = dataRoot;
			},

		    /**
             * Проверяет, существует ли объект по ссылке
             * 
             * @param {Integer}      val Целочисленное значение ссылки
             * @param {Object}       errObj Объект, куда будет записано сообщение об ошибке
             * @param {String}       fldName Имя поля, содержащего ссылку
             * @param {DataObject}   dataObj Объект, который ссылается
             * @param {DataRefType}  refType Описание типа ссылки
             * @return {Boolean}
             */
			checkDataObjectRef: function (val, errObj, fldName, dataObj, refType) {
			    var result = false;
			    var name = refType.model();
			    var dataRoot = this.pvt.dataRoots[name];
			    if (dataRoot) {
			        result = dataRoot.getCol("DataElements").getObjById(val) ? true : false; // Пока не используем индексы
			        if ((!result) && errObj)
			            errObj.errMsg = "Object \"" + name + "\" (Id = " + val + ") doesn't exist.";
                }
			    else
			        if (errObj)
			            errObj.errMsg = "Data Root \"" + name + "\" doesn't exist.";

			    return result;
			},

		    /**
             * Возвращает объект по ссылке
             * 
             * @param {Integer}      val Целочисленное значение ссылки
             * @param {String}       fldName Имя поля, содержащего ссылку
             * @param {DataObject}   dataObj Объект, который ссылается
             * @param {DataRefType}  refType Описание типа ссылки
             * @return {DataObject}
             */
			getRefDataObject: function (val, fldName, dataObj, refType) {
			    var result = null;
			    var name = refType.model();
			    var dataRoot = this.pvt.dataRoots[name];
			    if (dataRoot)
			        result = dataRoot.getCol("DataElements").getObjById(val); // Пока не используем индексы

			    return result ? result : null;
			},

		});
		return MemDataBase;
	}
);