﻿if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * База данных
 * @module MemDataBase
 */
define(
	["../system/event", "../system/utils", "./memObjLog", "./memProtoObj", "./memCol", "./memObj", "./memMetaRoot", "./memMetaObj",
        "./memMetaObjFields", "./memMetaObjCols", "../metaData/metaDataMgr"],
	function (Event, Utils, MemObjLog, MemProtoObj, MemCollection, MemObj, MemMetaRoot, MemMetaObj, MemMetaObjFields, MemMetaObjCols, MetaDataMgr) {


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
		    init: function (controller, params, cb) {
		        var pvt = this.pvt = {};
		        pvt.name = params.name;
		        pvt.constructHolder = params.constructHolder ? params.constructHolder : null;

		        pvt.robjs = [];				// корневые объекты базы данных
		        pvt.rcoll = {};
		        pvt.objs = {};				// все объекты по гуидам
		        pvt.resMap = {};			// связь гуида ресурса и гуида экземпляра
		        pvt.resNameMap = {};		// связь имени ресурса и их экзепляров (имена уникальны внутри типа ресурса)
		        pvt.refTo = {};			    // исходящие ссылки (по объектам)
		        pvt.refFrom = {};			// входящие ссылки (по объектам)
		        pvt.uLinks = {};			// неразрешенные ссылки
		        pvt.logIdx = [];			// упорядоченный индекс логов
		        pvt.$idCnt = 0;
		        pvt.$maxRootId = -1;        // максимальный номер корневого объекта
		        pvt.subscribers = {}; 		// все базы-подписчики
		        pvt.dataRoots = {};         // список всех dataRoots

		        // создать лог записи изменений
		        this._dbLog = new MemObjLog(this);
		        this._dbLog.setActive(true);

		        if ("guid" in params)
		            pvt.guid = params.guid;
		        else
		            pvt.guid = controller.guid();
		        pvt.counter = 0;
		        pvt.controller = controller; //TODO  если контроллер не передан, то ДБ может быть неактивна
		        pvt.controller.createLocalProxy(this);

		        pvt.defaultCompCallback = null; // коллбэк по умолчанию для создания компонентов
		        if (pvt.constructHolder) {
		            var self = this;
		            pvt.defaultCompCallback = function (typeObj, parent, sobj) {
		                var newObj = null;
		                var constr = self.pvt.constructHolder.getComponent(typeObj.getGuid());
		                if (constr && constr.constr) {
		                    var params = { ini: sobj, parent: parent.obj, colName: parent.colName };
		                    newObj = new constr.constr(self, params);
		                };
		                return newObj;
		            };
		        };

		        pvt.version = 0;
		        pvt.validVersion = 0;
		        pvt.sentVersion = 0;

		        this.event = new Event();
		        // транзакции
		        pvt.curTranGuid = undefined; // версия текущей транзакции БД
		        pvt.tranCounter = 0;		// счетчик транзакции
		        pvt.tho = {};
		        pvt.tha = [];
		        // лог удаленных вызовов и входящих
		        pvt.rco = {};
		        pvt.rca = [];
		        pvt.rexeco = {};
		        pvt.rexeca = [];

		        pvt.execQ = [];
		        pvt.execTr = {};
		        pvt.memTranIdx = 0;

		        if (params.kind != "master") {
		            var db = this;
		            controller._subscribe(this, params.proxyMaster, function (result) {
		                pvt.proxyMaster = controller.getProxy(params.proxyMaster.guid);
		                controller.subscribeRoots(db, UCCELLO_CONFIG.guids.metaRootGuid, function () {
		                    db._buildMetaTables();
		                    if (cb !== undefined && (typeof cb == "function")) cb();
		                });
		            });

		        }
		        else { // master base
		            // Создать объект с коллекцией метаинфо
		            pvt.meta = new MemMetaRoot({ db: this }, {});
		            if (cb !== undefined && (typeof cb == "function")) cb(this);
		        }
		    },

		    getConstructHolder: function () {
		        return this.pvt.constructHolder ? this.pvt.constructHolder :
                                    (this.getContext() ? this.getContext().getConstructorHolder() : null);
		    },

		    getDbLog: function () {
		        return this._dbLog;
		    },

		    /**
             * Добавить корневой объект в БД
             * @param obj
             * @param opt - опции opt.type - тип (res|data), opt.mode - режим ("RO"|"RW")
             * @private
             */
		    _addRoot: function (obj, opt) {

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
             * Удалить корневой объект в БД
             *  !!! Пока работает некорректно: не логгируется удаление и не учитываются
             *    возможные подписчики
             * @param obj
             * @private
             */
		    _deleteRoot: function (obj) {

		        this.event.fire({
		            type: "beforeDelRoot",
		            target: this,
		            obj: obj
		        });

		        this.clearObjRefs(obj);
		        this._deleteResFromNameMap(obj);

		        for (var i = 0; i < this.pvt.robjs.length; i++) {
		            if (this.pvt.robjs[i].obj === obj) {
		                this.pvt.robjs.splice(i, 1);
		                break;
		            }
		        }
		        delete this.pvt.rcoll[obj.getGuid()];

		        this.event.fire({
		            type: "delRoot",
		            target: this,
		            obj: obj
		        });
		    },

		    /**
             * Поиск ресурса по имени
             * @param {String}  res_name    имя ресурса
             * @param {String}  class_guid  guid типа ресурса
             * @return {Object} найденный ресурс или null
             * @private
             */
		    findResByName: function (res_name, class_guid) {
		        var result = null;
		        var res_names = this.pvt.resNameMap[class_guid];
		        if (res_names) {
		            var res_list = res_names[res_name];
		            if (res_list) {
		                var guids = Object.keys(res_list);
		                if (guids.length === 1)
		                    result = res_list[guids[0]];
		            };
		        };
		        return result;
		    },

		    /**
             * Удаляет ресурс из словаря
             * @param {Object} obj  ресурс
             * @private
             */
		    _deleteResFromNameMap: function (obj) {
		        var resClassGuid = obj.getNearestChildOf(UCCELLO_CONFIG.classGuids.Resource);
		        if (resClassGuid)
		            resClassGuid = resClassGuid.getGuid();
		        if (resClassGuid) {
		            var guid = obj.getGuid();
		            var res_name = obj.resName();
		            var res_names = this.pvt.resNameMap[resClassGuid];
		            if (res_names) {
		                var res_list = res_names[res_name];
		                if (res_list)
		                    delete res_list[guid];
		            };
		        };
		    },

		    /**
             * Регистрирует ресурс в словаре ресурсов
             * @param {Object} obj  ресурс
             * @private
             */
		    _addResToNameMap: function (obj) {
		        var resClassGuid = obj.getNearestChildOf(UCCELLO_CONFIG.classGuids.Resource);
		        if (resClassGuid)
		            resClassGuid = resClassGuid.getGuid();
		        if (resClassGuid) {
		            var guid = obj.getGuid();
		            var res_name = obj.resName();
		            var res_names = this.pvt.resNameMap[resClassGuid] ? this.pvt.resNameMap[resClassGuid] : this.pvt.resNameMap[resClassGuid] = {};
		            var res_list = res_names[res_name] ? res_names[res_name] : res_names[res_name] = {};
		            res_list[guid] = obj;
		        };
		    },

		    /**
             * Вызывается после завершения создания объекта в memDB 
             * @param {Object} obj  объект
             * @private
             */
		    afterObjectFinalized: function (obj) {
		        this._addResToNameMap(obj);
		    },

	        /**
             * зарегистрировать объект в списке по гуидам
             * @param obj
             * @private
             */
		    _addObj: function (obj) {

		        var root = obj.getRoot();
		        var is_root = !obj.getParent();
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
             * @return {Object} A link
             */
		    addLink: function (obj, ref, field, type) {
		        var guid = obj.getGuid();
		        var link = this.pvt.refTo[guid];
		        var refFrom = null;
		        var result = ref;

		        if (link)
		            link = link[field];
		        else
		            this.pvt.refTo[guid] = {};

		        if (link) {
		            // Link already exists
		            var old_ref = link.val;
		            if (type.isEqual(old_ref, ref))
		                return old_ref; // If values are equal we'll do nothing

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
		        return result;
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
		            this.resolveRef(link.val, link.src, link.type);
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
             * @param {Object} ref      The internal representaton of a value of the reference type
             * @param {Object} obj      A MemProtoObject which [ref] belongs to
             * @param {Object} ref_type A type of [ref]
             */
		    resolveRef: function (ref, obj, ref_type) {
		        ref.objRef = null;
		        var objRef = null;
		        var resRef = null;

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
		                if ((!objRef) && ref.resName) {
		                    // Try to resolve by name
		                    resRef = this.findResByName(ref.resName, ref_type.resType());
		                    if (resRef) {
		                        ref.guidRes = resRef.getGuidRes();
		                    };
                        }
		                if ((!ref.guidInstanceRes) && (objRef || resRef)) {
		                    ref.guidInstanceRes = objRef ? objRef.root.getGuid() : resRef.getGuid();
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

		            var is_ref_to_res = ref_type.isRefToResource();
		            if (objRef) {
		                resRef = objRef.root;
		                //if (ref.guidElem == ref.guidRes)
		                if (is_ref_to_res)
		                    objRef = objRef.root; // Ref to the root object
		                else
		                    objRef = objRef.elems[ref.guidElem]
		            };

		            if (resRef && (!objRef)) {
		                if (is_ref_to_res)
		                    objRef = resRef;
		                else
		                    if (ref.elemName) {
		                        if (resRef.isInstanceOf(UCCELLO_CONFIG.classGuids.Resource))
		                            objRef = resRef.getResElemByName(ref.elemName);
		                    };
		            };

		            if (objRef) {
		                ref.guidInstanceElem = objRef.getGuid();
		                if (!ref.guidElem)
		                    ref.guidElem = objRef.parseGuid(ref.guidInstanceElem).guid;
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
		    _addLogItem: function (item) {
		        this.pvt.logIdx.push(item);
		    },


		    /**
             * buildMetaTables description
             * @private
             */
		    _buildMetaTables: function () {
		        var metacol = this.getMeta().getCol("MetaObjects");
		        for (var i = 0; i < metacol.count() ; i++) {
		            var o = metacol.get(i);
		            if ((o.pvt.fieldsTable == undefined) || (o.pvt.colsTable == undefined))
		                o._bldElemTable();
		        }
		    },

		    /**
             * вернуть список гуидов корневых объектов за исключением метаинфо
			 * @param rootKind - "res"|"data" - тип рута, если не передается или "all", то все
             */
		    getRootGuids: function (rootKind) {
		        var guids = [];
		        if (Array.isArray(rootKind))
		            var guids = rootKind;
		        else {
		            if ((rootKind == "res") || (rootKind == "data") || (rootKind == "all") || (!rootKind)) {
		                var ro = this.pvt.robjs;
		                for (var i = 0; i < ro.length; i++) {
		                    var cguid = ro[i].obj.getGuid();
		                    if ((cguid != metaRootGuid) && ((ro[i].type == rootKind) || (rootKind === undefined) || (rootKind === "all")))
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

		        //this._clearSingleObjRefs(obj);
		        this.clearObjRefs(obj);//!!! РАЗОБРАТЬСЯ: Это правильная строчка, но движок с ней падает

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
		    subscribeRoots: function (rootGuid, callback, callback2) {
		        this.pvt.controller.subscribeRoots(this, rootGuid, callback, callback2);
		    },

		    /**
             * Стать подписчиком базы данных
             * @param proxy
             */
		    onSubscribe: function (proxy) {
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
		    isSubscribed: function (dbGuid) {
		        var s = this.pvt.subscribers[dbGuid];
		        return (s) ? s : null;
		    },

		    /**
             * onUnsubscribe
             * @param connectId
             */
		    onUnsubscribe: function (connectId) {
		        //var g = (subProxy.dataBase) ? subProxy.dataBase.getGuid() : subProxy.guid;
		        for (var g in this.pvt.subscribers) {
		            var p = this.pvt.subscribers[g];
		            if (p.connect.getId() == connectId)
		                delete this.pvt.subscribers[g]; // убрать из общего списка подписчиков
		        }
		        for (g in this.pvt.rcoll) {
		            var p = this.pvt.rcoll[g];
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
		    onSubscribeRoots: function (dbGuid, rootGuids) {
		        // TODO проверить что база подписана на базу
		        var rg = [];
		        var res = [];

		        this.pvt.controller.genDeltas(this.getGuid());

		        rg = this.getRootGuids(rootGuids);

		        for (var i = 0; i < rg.length; i++) {
		            if (this.pvt.robjs.length > 0) {
		                var ro = this._onSubscribeRoot(dbGuid, rg[i]);
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
		    _onSubscribeRoot: function (dbGuid, rootGuid, inLog) {
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
		                    clog.add({ obj: ro.obj, sobj: sobj, type: "subscribe", subscriber: dbGuid });
		                }
		                return ro;
		            }
		        }
		        return null;
		    },

		    prtSub: function (root) {
		        if (DEBUG) {
		            console.log("***");
		            for (var guid in root.subscribers) {
		                console.log(guid + "  " + root.subscribers[guid].connect.name());
		            }
		        }
		    },


		    /**
             * "сериализация" объекта базы
             * @param {object}  obj
             * @param {boolean} [use_resource_guid = false] использовать гуид ресурса вместо гуида инстанса
             * @returns {*}
             */
		    serialize: function (obj, use_resource_guid) {
		        // проверить, что объект принадлежит базе
		        if (!("getDB" in obj) || (obj.getDB() != this)) return null;

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
		        for (i = 0; i < obj.countCol() ; i++) {
		            var cc = obj.getCol(i);
		            var cc2 = newObj.collections[cc.getName()] = {};
		            for (var j = 0; j < cc.count() ; j++) {
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
		        var self = this;
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
		        var constructHolder = this.getConstructHolder();

		        function add_to_types(type_guid) {
		            if (type_guid && constructHolder && (!types.list[type_guid])
                        && ((!constructHolder.getComponent(type_guid)) || notCheck)) {
		                types.list[type_guid] = true;
		                types.arrTypes.push(type_guid);
		            }
		            else
		                if (type_guid && (!types.list[type_guid])) {
		                    self.getTypeObj(type_guid);
		                };
		        };

		        if (obj.$sys.requiredTypes && (obj.$sys.requiredTypes.length > 0))
		            for (var i = 0; i < obj.$sys.requiredTypes.length; i++)
		                add_to_types(obj.$sys.requiredTypes[i]);

		        add_to_types(objTypeGuid);
		    },

		    getTypeObj: function (guid) {
		        var is_by_name = (typeof (guid) !== "string") && (typeof (guid.className) === "string");
		        var metaObj = is_by_name ?
                    this.getObj(UCCELLO_CONFIG.guids.metaRootGuid).getTypeByName(guid.className) :
                    this.getObj(guid);

		        if ((!metaObj) && this.getMeta()) {
		            var constructHolder = this.getConstructHolder();
		            if (constructHolder) {
		                var constr = is_by_name ? constructHolder.getComponentByName(guid.className) : constructHolder.getComponent(guid);
		                if (constr)
		                    constr = constr.constr;
		                if (constr) {
		                    new constr(this);
		                    metaObj = this.getObj(constr.prototype.classGuid);
		                }
		            };
		        };
		        return metaObj;
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
		                    var o = new MemMetaObjFields(parent, sobj);
		                    break;
		                case metaObjColsGuid:
		                    o = new MemMetaObjCols(parent, sobj);
		                    break;
		                case metaRootGuid:
		                    //o = that.getObj(metaRootGuid);
		                    that.pvt.meta = new MemMetaRoot(parent, sobj);
		                    o = that.pvt.meta;
		                    break;
		                case metaObjGuid:
		                    o = new MemMetaObj(parent, sobj);
		                    break;
		                default:
		                    var typeObj = that.getTypeObj(sobj.$sys.typeGuid);

		                    if (typeObj) {
		                        if (cb != undefined)
		                            o = cb(typeObj, parent, sobj)
		                        else
		                            throw new Error("MemDataBase::deserialize: Callback function is not defined!");
		                    };
		                    if (!o)
		                        throw new Error("MemDataBase::deserialize: Can't deserialize object of type: \"" + sobj.$sys.typeGuid + "\"!");
		                    break;
		            }
		            for (var cn in sobj.collections) {
		                for (var co in sobj.collections[cn])
		                    ideser(that, sobj.collections[cn][co], { obj: o, colName: cn });
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
		                if (currObj) {
                            // Удаляем "старый" объект из коллекции
		                    var col = currObj.getParentCol();
		                    if (col)
		                        col._del(currObj);
		                    this.clearObjRefs(currObj);
		                };
		            }
		        };

		        var res = ideser(this, sobj, parent);
		        var rholder = this.getRoot(res.getGuid());

		        if (rholder)   // VER инициализация номеров версий рута
		            if (("ver" in sobj)) {
		                res.setRootVersion("draft", sobj.ver);
		                res.setRootVersion("sent", sobj.ver);
		                res.setRootVersion("valid", sobj.ver);
		            }

		        this.resolveAllRefs();
		        res.getLog().setActive(true);

		        return res;
		    },

		    setDefaultCompCallback: function (cb) {
		        this.pvt.defaultCompCallback = cb;
		    },

		    getDefaultCompCallback: function () {
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
		                if (objArr[i])
		                    this.getListOfTypes(objArr[i], types);
		            };
		            if (types.arrTypes.length > 0) {
		                var constructHolder = this.getConstructHolder();
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
		                var constructHolder = this.getConstructHolder();
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
		    addRoots: function (sobjs, params, rg, rgsubs) {
		        if (!this.isMaster()) return null; // Работает только на мастер-базе. Слейв добавляет рут через мастер.

		        this.getController().genDeltas(this.getGuid());		// рассылаем дельты

		        var subDbGuid = params.subDbGuid;
		        var cb = this.getDefaultCompCallback();

		        var res = [];

		        var allSubs = this.getSubscribers();

		        for (var i = 0; i < rg.length; i++) {
		            var root = null;
		            if (rg[i].length > 36) {
		                root = this.getRoot(rg[i]);
		                var croot = this.deserialize(sobjs[i], {}, cb, false, rg[i]);
		            }
		            else croot = this.deserialize(sobjs[i], {}, cb);

		            croot.getCurVersion();

		            // возвращаем гуид если рута не было, или был, но не были подписаны
		            if (!root || (root && !(root.subscribers[subDbGuid]))) res.push(croot.getGuid());

		            // форсированная подписка для данных (не для ресурсов) - в будущем скорее всего понадобится управлять этим
		            // если добавляются новые ДАННЫЕ, то все подписчики этого корня также будут на них подписаны
		            // Альтернатива: можно запрашивать их с клиента при изменении rootInstance, несколько проще, но придется посылать их много раз
		            // что хуже с точки зрения нагрузки на сервер и трафика

		            for (var guid in allSubs) {
		                var subscriber = allSubs[guid];
		                if (subscriber.kind == 'remote') {
		                    // Подписываем либо данные (тогда всех) либо подписчика
		                    if (croot.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot) || subDbGuid == subscriber.guid)
		                        this._onSubscribeRoot(guid, croot.getGuid(), true);
		                }
		            }

		            if (params.expr) {
		                root = this.getRoot(croot.getGuid());
		                root.hash = params.expr;
		            }
		        }

		        // формирование списка рутов для подписки с учетом зависимостей
		        if ((rgsubs.length > 0) && (params.depth > 0)) {
		            var dep_res = [];
		            var init_res = rgsubs.concat();
		            for (var i = 0; i < params.depth; i++) {
		                dep_res = this.getResolvedResRefs(init_res);
		                if (dep_res.length > 0) {
		                    Array.prototype.push.apply(rgsubs, dep_res);
		                    init_res = dep_res.concat();
		                } else
		                    break;
		            };
		        };

		        // просто подписать остальные руты
		        for (i = 0; i < rgsubs.length; i++) {
		            root = this.getRoot(rgsubs[i]);
		            if (root) {
		                croot = root.obj;
		                // возвращаем гуид если не были подписаны
		                if (!(root.subscribers[subDbGuid])) res.push(croot.getGuid());
		                for (guid in allSubs) { // то же, что и выше TODO отрефакторить
		                    subscriber = allSubs[guid];
		                    if (subscriber.kind == 'remote') {
		                        // Подписываем либо данные (тогда всех) либо подписчика (если ресурс), но только если еще не подписан!
		                        var subs2 = this.pvt.rcoll[croot.getGuid()].subscribers;
		                        if ((croot.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot) || subDbGuid == subscriber.guid) && !(subs2[subscriber.guid]))
		                            this._onSubscribeRoot(guid, croot.getGuid(), true);
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

		    addObj: function (objType, parent, flds) {
		        return new MemObj(objType, parent, flds);
		    },

		    /**
             * вернуть ссылку на контроллер базы данных
             * @returns {*}
             */
		    getController: function () {
		        return this.pvt.controller;
		    },

		    /**
             * Вернуть название БД
             * @returns {*}
             */
		    getName: function () {
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
		    countRoot: function () {
		        return this.pvt.robjs.length;
		    },

		    /**
             * вернуть корневой объект по его Guid или по порядковому номеру
             * @param {number} id
             * @returns {*}
             */
		    getRoot: function (id) {
		        if (typeof id == "number")
		            return this.pvt.robjs[id];
		        else
		            return this.pvt.rcoll[id];
		    },



		    /**
             * Является ли мастер базой
             * @returns {boolean}
             */
		    isMaster: function () {
		        if (this.pvt.proxyMaster == undefined)
		            return true;
		        else
		            return false;
		    },

		    /**
             * вернуть мастер-базу если локальна
             * @returns {dbsl.proxyMaster|*|dbs2.proxyMaster}
             */
		    getProxyMaster: function () {
		        return this.pvt.proxyMaster;
		    },

		    /**
             * вернуть корневой объект метаинфо
             * @returns {key.meta|*|memMetaRoot}
             */
		    getMeta: function () {
		        return this.pvt.meta;
		    },

		    /**
             * Получить следующий local id
             * @returns {number}
             */
		    getNewLid: function () {  // TODO сделать DataBaseController и перенести туда?
		        return this.pvt.$idCnt++;
		    },

		    /**
             * вернуть счетчик изменения для БД (в логе)
             * @returns {number}
             */
		    getNewCounter: function () {
		        return this.pvt.counter++;
		    },


		    /**
             * вернуть подписчиков на БД
             * @returns {object}
             */
		    getSubscribers: function () {
		        return this.pvt.subscribers;
		    },

		    /**
             * получить объект по его гуиду
             * @param {string} guid
             * @returns {*}
             */
		    getObj: function (guid) {
		        return this.pvt.objs[guid];
		    },

		    /**
             * Проиграть назад изменения по логам базы данных
			 * @param {number} version - номер версии, до которого нужно откатить
             */
		    undo: function (version) {
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
		    genDeltas: function () {
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
		    getGuid: function () {
		        return this.pvt.guid;
		    },


		    resetModifLog: function (log_name) {
		        for (var g in this.pvt.objs)
		            this.getObj(g).resetModifFldLog(log_name);
		    },

		    // Транзакции
		    // - только 1 транзакция в единицу времени на memDB			
		    tranStart: function (guid, srcDbGuid) {
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
		                //console.log("EXTERNAL TRAN START ",srcDbGuid);
		                p.externalTran = true;
		            }
		            else {
		                p.curTranGuid = Utils.guid();
		                p.externalTran = false;
		            }
		            p.tranCounter = 1;
		            this._setTranState(p.curTranGuid, 's', srcDbGuid);
		            /*
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
					*/

		        }
		        //if (DEBUG) 
		        console.log("TRANSTART " + p.curTranGuid + " | " + p.tranCounter, " Ext:", p.externalTran);
		        //console.trace();
		        return p.curTranGuid;

		    },

		    tranCommit: function () {
		        var that = this, p = this.pvt, memTran = p.curTranGuid;
		        if (p.tranCounter == 0)
		            return;
		        if (p.tranCounter == 1) {	// Счетчик вложенности = 1, закрываем транзакцию
		            var guids = this.getRootGuids(), isMaster = this.isMaster();

		            // сгенерировать и разослать дельты (либо на сервер либо подписчикам)
		            if (isMaster)
		                this.getController().genDeltas(this.getGuid());
		            else
		                if (!p.externalTran)
		                    this.getController().genDeltas(this.getGuid(), undefined, function (res, cb) { that.sendDataBaseDelta(res, cb); });

		            var memTr = p.curTranGuid;
		            if (isMaster || p.externalTran) // TODO 10 точно ли так нужно обрабатывать externalTran?
		                this._setTranState(memTr, 'c');
		            else { 								// клиент, который инициировал транзакцию
		                this._setTranState(memTr, 'p'); 	// установить транзакцию в pre-commit 
		                this._rcCommit();
		            }
		            if (isMaster) // разослать маркер конца транзакции всем подписчикам кроме srcDbGuid					  
		                this.subsRemoteCall("endTran", undefined, this.pvt.srcDbGuid);

		            p.curTranGuid = undefined;
		            p.tranCounter = 0;
		            var memExternal = p.externalTran;
		            p.externalTran = false;
		            p._memFunc = [];
		            p._memFuncDone = [];

		            if (memTran && !this.inTran()) {
		                delete this.pvt.execTr[memTran]; // почистить очередь транзакции
		                this.pvt.execQ.splice(0, 1);
		                this.pvt.memTranIdx++;
		            }
		            this.event.fire({
		                type: 'commit',
		                external: memExternal
		            });
		        }
		        else p.tranCounter--;
		        //if (DEBUG)				
		        console.log("TRAN|COMMIT " + memTran + " | " + p.tranCounter);
		        //console.trace();
		    },

		    // синхронизировать в рамках транзакции
		    syncInTran: function () {

		        if (!this.inTran()) return;
		        if (!this.pvt._memFunc || !this.pvt._memFunc.length) {
		            //console.log("%c NO DATA TO SYNC","color:red");
		            return;
		        }

		        this._rc(this.pvt._memFunc, this.pvt._memFuncDone, true);
		        this.pvt._memFunc = [];
		        this.pvt._memFuncDone = [];
		    },

		    rc2: function (obj, func, aparams, cb) {
		        function rpc_cb(result) {

		            cb(result);
		            that.tranCommit();
		        }
		        var that = this;
		        aparams.push(rpc_cb);
		        this.tranStart();
		        func.apply(obj, aparams);
		    },

		    rc: function (objGuid, func, aparams, cb) {

		        if (this.isMaster()) {
		            // TODO кинуть исключение
		            return;
		        }

		        if (this.inTran()) { // запомнить удаленный вызов на клиенте в транзакции		

		            if (objGuid && !this.get(objGuid)) {
		                console.log("Объект не принадлежит базе ", objGuid);
		                return;
		            }
		            var args = { objGuid: objGuid, func: func, aparams: aparams };
		            if (func == "sendDataBaseDelta") { // Дельты в пакете всегда перед вызовами других методов, поэтому вставляем в начало массива
		                this.pvt._memFunc.splice(0, 0, args);
		                this.pvt._memFuncDone.splice(0, 0, cb);
		            }
		            else {
		                this.pvt._memFunc.push(args);
		                this.pvt._memFuncDone.push(cb);
		            }
		        }
		        else
		            this._rc([{ objGuid: objGuid, func: func, aparams: aparams }], [cb]); // Эта ветка сейчас не работает. 
		    },

		    // команда завершения транзакции
		    _rcCommit: function () {
		        function icb(result) {
		            that._setTranState(memTr, 'c');
		        }
		        var that = this, memTr = this.getCurTranGuid();
		        var args = { objGuid: undefined, func: "endTran", aparams: undefined };
		        this._rc([args], [icb]);
		    },

		    logRemoteCall: function (data, ctype, trGuid) {
		        var t = new Date();
		        if (ctype == 'c')
		            var ar = data.args.rc;
		        else
		            ar = data;
		        for (var i = 0; i < ar.length; i++) {
		            var o = {};
		            o.time = t;
		            o.type = ctype == 'c' ? 'out' : 'rsp';
		            o.trGuid = trGuid;
		            if (ctype == 'c') {
		                o.trGuid = data.trGuid;
		                o.src = data.srcDbGuid;
		                o.rc = ar[i];
		            }
		            else {
		                o.rc = {};
		                o.rc.aparams = ar[i];
		            }

		            this.pvt.rca.push(o);
		        }
		    },

		    // удалить элементы из лога удаленных вызовов
		    truncRcLog: function (guid) {
		        var rca = this.pvt.rca;
		        if (guid) {
		            for (var i = 0; i < rca.length; i++) {
		                if (rca[rca.length - i - 1].trGuid == guid) {
		                    rca.splice(0, rca.length - i);
		                    break;
		                }
		            }
		        }
		        else this.pvt.rca = [];
		    },

		    getRcLog: function () {
		        return this.pvt.rca;
		    },

		    _rc: function (rcargs, rccbs, tran) { // TODO 10 - если есть удаленный вызов кроме дельты, то установить lock
		        function icb(result) {
		            var actDone = false;
		            for (var i = 0; i < result.cbres.length; i++)
		                if (rccbs[i]) {
		                    rccbs[i](result.cbres[i]);
		                    actDone = true;
		                }
		            that.logRemoteCall(result.cbres, 'r', data.trGuid);
		            if (actDone) {
		                that.getController().genDeltas(that.getGuid(), undefined, function (res, cb1) { that.sendDataBaseDelta(res, cb1); });
		                that.syncInTran();
		            }
		            if (tran) that.tranCommit();
		        }

		        if (!rcargs.length) return;
		        var that = this;
		        var socket = this.getSocket();
		        var pg = this.getProxyMaster().guid;
		        var data = { action: "remoteCall3", type: "method", args: { masterGuid: pg, rc: rcargs } };

		        if (tran) this.tranStart();

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
		        this.logRemoteCall(data, 'c');
		        socket.send(data, icb, data.trGuid);
		        /*
				if (this.pvt.name!="System") {
					for (var i=0, s = ""; i<rcargs.length; i++) s += rcargs[i].func + " ";
					console.log("%c SEND DATA ("+s+")  ","color: blue", data.args, " trGuid: ",data.trGuid);
				}*/
		    },

		    inTran: function () {
		        if (this.pvt.tranCounter > 0) return true;
		        else return false;
		    },

		    isExternalTran: function () {
		        return (this.inTran() && this.pvt.externalTran);
		    },

		    tranRollback: function () {
		    },

		    getCurTranGuid: function () {
		        return this.pvt.curTranGuid;
		    },

		    getCurTranCounter: function () {
		        return this.pvt.tranCounter;
		    },

		    getTranObj: function (guid) {
		        return this.pvt.tho[guid];
		    },

		    getTranList: function (guid) { // TODO 10 лучше скопировать?
		        return this.pvt.tha;
		    },

		    // установить состояние транзакции
		    _setTranState: function (guid, state, srcDbGuid) {
		        var p = this.pvt;
		        var tobj = this.getTranObj(guid);
		        if (state == 's') {
		            if (!tobj) {
		                var ct = p.tho[guid] = {};
		                ct.guid = guid;
		                ct.start = new Date();
		                ct.src = srcDbGuid ? srcDbGuid : this.getGuid();
		                ct.state = 's';
		                ct.prev = (p.tha.length > 0) ? p.tha[p.tha.length - 1] : null; // сослаться на предыдующую транзакцию
		                ct.roots = {};
		                p.tha.push(ct);
		            }
		            return;
		        }

		        if (!tobj) return;
		        if (state == 'p') { // установить в pre-commited
		            if (!tobj.prev || tobj.prev.state == 'p' || tobj.prev.state == 'c') {
		                tobj.state = 'p';
		                tobj.pend = new Date();
		                return true;
		            }
		            return false;
		        }
		        if (state == 'c') { // установить в commited
		            if (!tobj.prev || tobj.prev.state == 'p' || tobj.prev.state == 'c') { // проверить предыдущую транзакцию
		                tobj.state = 'c';
		                for (var g in tobj.roots) {
		                    var r = this.getObj(g);
		                    r.setRootVersion("valid", tobj.roots[g].max);
		                }
		                tobj.end = new Date();
		                // удалить из истории последнюю подтвержденную транзакцию (может быть в комменте в целях тестирования)
		                if (tobj.prev && tobj.prev.state == 'c' && tobj.prev.prev && tobj.prev.prev.prev)
		                    this.truncTran(tobj.prev.prev.prev.guid);
		                return true;
		            }
		            return false;
		        }
		    },

		    // почистить все транзакции до транзакции с гуидом guid (хронологически), если guid==undefined, то почистить все
		    truncTran: function (guid) {
		        var p = this.pvt;
		        if (guid) {
		            var roots = {};
		            for (var i = 0; i < p.tha.length; i++) {
		                var tobj = p.tha[i];
		                for (var g in tobj.roots)
		                    roots[g] = roots[g] ? Math.max(roots[g], tobj.roots[g].max) : tobj.roots[g].max;
		                if (tobj.guid == guid) {
		                    for (var g in roots)
		                        this.getObj(g).truncVer(roots[g]);
		                    for (var j = 0; j < i; j++)
		                        delete p.tho[p.tha[j].guid];
		                    p.tha.splice(0, i + 1);
		                    if (p.tha.length > 0) p.tha[0].prev = null;
		                    break;
		                }
		            }
		        }
		        else {
		            p.tha = [];
		            p.tho = {};
		            var rg = this.getRootGuids();
		            for (i = 0; i < rg.length; i++)
		                this.getObj(rg[i]).truncVer();
		        }
		        this.truncRcLog(guid);
		    },

		    onRemoteCall3Plus: function (rc, srcDbGuid, trGuid, rootv, done) {
		        var l = rc.length;
		        var l2 = l;
		        var globres = [];
		        function idone(res) {
		            l2--;
		            globres.push(res);
		            if (!l2) {
		                done({ cbres: globres });
		            }
		        };
		        for (var i = 0; i < l; i++) {
		            var c = rc[i];
		            var uobj = (c.objGuid) ? this.getObj(c.objGuid) : this;
		            this.remoteCallExec(uobj, c, srcDbGuid, trGuid, undefined, idone);
		        }
		    },

		    // временный вариант ф-ции для рассылки оповещений подписантам, используется для рассылки признака конца транзакции
		    subsRemoteCall: function (func, aparams, excludeGuid) {
		        var subs = this.getSubscribers();
		        var trGuid = this.getCurTranGuid();
		        for (var guid in subs) {
		            var csub = subs[guid];
		            if (excludeGuid != guid) // для всех ДБ кроме исключенной (та, которая инициировала вызов)
		                csub.connect.send({ action: func, trGuid: trGuid, dbGuid: guid, srcDbGuid: excludeGuid }); //TODO TRANS2 сделать вызов любого метода
		        }
		    },

		    /**
             * Метод для отправки дельт - инкапсуляция аналогичного метода контроллера БД
			 * (требуется для проведения посылки дельт через транзакционный механизм)
             * @param data
			 * @param cb
             */
		    sendDataBaseDelta: function (data, cb) {
		        if (this.isMaster()) {
		            var cdb = this.getController();
		            var res = cdb.applyDeltas(data.dbGuid, data.srcDbGuid, data.delta);
		            if (cb) cb({ data: { /*dbVersion: cdb.getDB(data.dbGuid).getVersion() */ } });
		        }
		        else {
		            this.rc(undefined, 'sendDataBaseDelta', [data], cb);
		        }
		    },

		    _checkRootVer: function (rootv) {
		        if (DEBUG)
		            console.log("CHECK ROOT VERSIONS");
		        for (var guid in rootv) console.log(guid, rootv[guid], this.getObj(guid).getRootVersion("valid"));
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
		    remoteCallExec: function (uobj, args, srcDbGuid, trGuid, rootv, done) {
		        var db = this;
		        var trans = this.pvt.execTr;
		        var queue = this.pvt.execQ;
		        var auto = false;
		        // пропускаем "конец" транзакции если клиент был сам ее инициатором
		        if (trGuid && (db.getCurTranGuid() == trGuid) && !(db.isExternalTran()) && (args.func == "endTran"))
		            return;
		        if (!trGuid) {	// "автоматическая" транзакция, создается если нет гуида транзакции
		            trGuid = Utils.guid();
		            auto = true;
		        }
		        if (!(trGuid in trans)) { // создать новую транзакцию и поставить в очередь
		            var qElem = {};
		            qElem.tr = trGuid;
		            qElem.src = srcDbGuid
		            qElem.q = [];
		            qElem.a = auto;
		            queue.push(qElem);
		            trans[trGuid] = this.pvt.memTranIdx + queue.length - 1; // "индекс" для быстрого доступа в очередь
		        }
		        var tqueue = queue[trans[trGuid] - this.pvt.memTranIdx].q;

		        function done2(res, endTran) { // коллбэк-обертка для завершения транзакции				
		            var memTranGuid = db.getCurTranGuid();
		            tq = queue[trans[memTranGuid] - db.pvt.memTranIdx];
		            db.getController().genDeltas(db.getGuid()); // сгенерировать дельты и разослать подписчикам
		            var commit = tq.a || endTran; // конец транзакции - либо автоматическая либо признак конца
		            if (commit) {
		                //db.subsRemoteCall("endTran",undefined, srcDbGuid); // разослать маркер конца транзакции всем подписчикам кроме srcDbGuid
		                if (db.isExternalTran()) // закрываем только "внешние" транзакции (созданные внутри remoteCallExec)
		                    db.tranCommit();   // TODO 10 -	isExternalTran должна возвр тру, эта проверка лишняя?

		                if (done) done(res);

		                delete trans[memTranGuid];
		                queue.splice(0, 1);
		                db.pvt.memTranIdx++;
		                db.pvt.execFst = false;

		                if (queue.length > 0) { // Если есть другие транзакции в очереди, то перейти к их выполнению
		                    db._checkRootVer(rootv);
		                    db.tranStart(queue[0].tr, queue[0].src);
		                    db.pvt.execFst = true;
		                    var f = queue[0].q[0];
		                    f();
		                }
		            }
		            else {
		                if (done) done(res); // сейчас срабатывает только на сервере, чтобы вернуть ответ на клиент

		                tq.q.splice(0, 1);
		                if (tq.q.length > 0)
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
		                done2(null, true);
		            else
		                uobj[args.func].apply(uobj, aparams); // выполняем соответствующий метод uobj.func(aparams)		
		        }
		        // ставим в очередь
		        tqueue.push(function () { exec1(); });
		        //console.log("RCEXEC PUSH TO QUEUE ",args.func,args,trGuid,auto, queue);

		        if (!db.inTran()) {
		            this._checkRootVer(rootv);
		            db.tranStart(trGuid, srcDbGuid); // Если не в транзакции, то заходим в нее
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

		    /**
             * Инсталляция типов данных СУБД (вызывается провайдером)
             * 
             * @param {Object} sqlTypes Таблица типов
             * @param {Object} engine dataObjectEngine
             */
		    installSqlTypes: function (sqlTypes, engine) {
		        this.pvt.sqlTypes = { types: sqlTypes, engine: engine };
		    },

		    /**
             * Деинсталляция типов данных СУБД
             * 
             */
		    removeSqlTypes: function () {
		        this.pvt.sqlTypes = undefined;
		    },

		    /**
             * Заменяет конструктор "обычного" типа данных на тип
             *   данных СУБД, если он имеется в таблице провайдера
             *
             * @param {Constructor} dataType Конструктор "обычного" типа данных
             * @throws Генерирует прерывание, если провайдер не поддерживает запрошенный конструктор
             * @return {Constructor} Конструктор типа данных СУБД
             */
		    resolveSqlType: function (dataType) {
		        var result = dataType;
		        if (this.pvt.sqlTypes) {
		            result = this.pvt.sqlTypes.types[dataType.prototype.key];
		            if (!result)
		                throw new Error("Provider: \"" +
                            (this.pvt.sqlTypes.engine.getProvider() ? this.pvt.sqlTypes.engine.getProvider().providerId : "UNKNOWN") +
                            "\" doesn't support type \"" + dataType.prototype.key + "\".");
		        }
		        return result;
		    },

		    /**
             * Возвращает конструктор MetaDataMgr
             * 
             */
		    getMetaDataMgrConstructor: function () {
		        return MetaDataMgr;
		    },

		    /**
             * Возвращает массив GUID-ов разрешенных внешних ссылок на ресурсы для множества objects,
             *   представляющего из себя массив GUID-ов
             *
             * @param {Array} objects Исходное множество объектов
             * @return {Array} Список разрешенных ссылок на ресурсы (массив GUID-ов)
             */
		    getResolvedResRefs: function (objects) {
		        var result = [];
		        var self = this;
		        var curr_guids = {};

		        objects.forEach(function (guid) {
		            curr_guids[guid] = true;
		        });

		        objects.forEach(function (root) {
		            self._iterateChilds(self.getObj(root), true, function (obj, lvl) {
		                var objRefs = self.pvt.refTo[obj.getGuid()];
		                if (objRefs) {
		                    var keys = Object.keys(objRefs);
		                    keys.forEach(function (key) {
		                        var link = objRefs[key];
		                        if (link.val.objRef && link.val.is_external &&
                                    (link.val.objRef.isInstanceOf(UCCELLO_CONFIG.classGuids.Resource)||
                                    link.val.objRef.isInstanceOf(UCCELLO_CONFIG.classGuids.ResElem))) {
		                            // Разрешенная внешняя ссылка на ресурс
		                            var res_guid = link.val.objRef.getRoot().getGuid();
		                            if (!curr_guids[res_guid]) {
		                                curr_guids[res_guid] = true;
		                                result.push(res_guid);
		                            };
		                        };
		                    });
		                };
		            });
		        });

		        return result;
		    },

		    /**
             * Возвращает массив неразрешенных внешних ссылок для множества objects
             *
             * @param {Array} objects Исходное множество объектов
             * @return {Array} Список неразрешенных ссылок: массив {guidRes, resName, resType}
             */
		    getUnresolvedRefs: function (objects) {
		        var uRefsByGuid = {};
		        var uRefsByName = uRefsByGuid;

		        var self = this;
		        objects.forEach(function (root) {
		            self._iterateChilds(root, true, function (obj, lvl) {
		                var objRefs = self.pvt.refTo[obj.getGuid()];
		                if (objRefs) {
		                    var keys = Object.keys(objRefs);
		                    keys.forEach(function (key) {
		                        var link = objRefs[key];
		                        if ((!link.val.objRef) && link.val.is_external) {
		                            // Неразрешенная внешняя ссылка
		                            var ref = {
		                                guidRes: link.val.guidRes,
		                                resName: link.val.resName,
		                                resType: link.type.resType()
		                            };
		                            var oldRefByGuid = uRefsByGuid[ref.guidRes];
		                            if (oldRefByGuid) {
		                                if (oldRefByGuid.resName && ref.resName && (oldRefByGuid.resName !== ref.resName))
		                                    throw new Error("Different names (\"" + oldRefByGuid.resName + "\" and \"" +
                                                ref.resName + "\") of resource \"" + ref.guidRes + "\" are not allowed.");
		                                if ((!oldRefByGuid.resName) && ref.resName) {
		                                    oldRefByGuid.resName = ref.resName;
		                                };
		                            }
		                            else {
		                                if (ref.guidRes)
		                                    uRefsByGuid[ref.guidRes] = ref;
		                            };
		                            if (ref.resName)
		                                if (ref.guidRes)
		                                    delete uRefsByName[ref.resName + "_" + ref.resType];
		                                else
		                                    uRefsByName[ref.resName + "_" + ref.resType] = ref;
                                };
		                    });
		                };
		            });
		        });

		        var result = [];
		        Object.keys(uRefsByGuid).forEach(function (key) {
		            result.push(uRefsByGuid[key]);
		        });

		        return result;
		    },

		    /**
             * Совершает обход дерева объектов
             * @param {Object | String} obj         Корневой объект (может быть задан своим GUID)
             * @param {Boolean}         isRootFirst Если true, то сначала обходятся корневые элементы
             * @param {Function}        proc        Процедура, вызываемая для каждого узла дерева
             *                                        параметры: узел и текущий уровень (целое число, начальный уровень=0).
             */
		    _iterateChilds: function (obj, isRootFirst, proc) {

		        function iterate_childs(obj, isRootFirst, lvl, proc) {
		            if (typeof (proc) === "function") {
		                if (isRootFirst)
		                    proc(obj, lvl);
		                for (var i = 0; i < obj.countCol() ; i++) {
		                    var childCol = obj.getCol(i);
		                    for (var j = 0; j < childCol.count() ; j++) {
		                        var child = childCol.get(j);
		                        iterate_childs(child, isRootFirst, lvl + 1, proc);
		                    };
		                };
		                if (!isRootFirst)
		                    proc(obj, lvl);
		            };
		        };

		        var curr_obj = null;
		        if (obj instanceof MemProtoObj) {
		            curr_obj = obj;
		        }
		        else
		            if (typeof (obj) === "string") {
		                curr_obj = this.getObj(obj);
		            };

		        if (curr_obj)
		            iterate_childs(curr_obj, isRootFirst, 0, proc);

		    },

		});
		return MemDataBase;
	}
);