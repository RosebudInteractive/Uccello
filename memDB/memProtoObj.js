if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memObjLog', '../system/event', '../system/utils'],
	function (MemObjLog, Event, Utils) {

	    var DFLT_LOG = "def";

	    var MemProtoObj = UccelloClass.extend({

	        dfltLogName: DFLT_LOG,

			// objType - ссылка на объект-тип
			// parent - ссылка на объект и имя коллекции либо db, null для корневых  (obj и colname)
			init: function(objType, parent,flds){

			    this.event = new Event();
			    var pvt = this.pvt = {}; // приватные члены
				 
				pvt.objType = objType;
				pvt.fields = [];				// значения полей объекта
				pvt.collections = [];			// массив дочерних коллекций
				pvt.log = null; 
				pvt.fldLog = {};
				pvt.colLog = {};				// лог изменений в дочерних коллекциях
				pvt.isModified = {};
				pvt.cntFldModif = {};
				pvt.cntColModif = {};
				this.resetModifFldLog(this.dfltLogName, true);

				pvt.$rootId = -1;

				if (flds && flds.$sys && flds.$sys.$collection_index)
				    pvt.$collection_index = flds.$sys.$collection_index;

				if (!parent.obj) {	// корневой объект
					pvt.col = null;
					pvt.db = parent.db;
					pvt.parent = null;
					pvt.root = this;
                }
				else {				// объект в коллекции (не корневой)
					pvt.col = parent.obj.getCol(parent.colName);
					pvt.parent = parent.obj;	
					pvt.colName = parent.colName;
					pvt.root = pvt.parent.pvt.root;
                }

				if (this.getDB() == undefined)
				    if (DEBUG) console.log(parent.obj);
			    pvt.$id = this.getDB().getNewLid();		// локальный идентификатор
				if ((flds) && (flds.$sys) && (flds.$sys.guid))	// если гуид пришел в системных полях, то используем его
					pvt.guid = flds.$sys.guid;
				else 											// если нет - генерируем динамически
					pvt.guid =  this.getDB().getController().guid();  // TODO перенести в UTILS?

				var fullGuid = this.parseGuid(pvt.guid);
				var keep_guid = (flds) && (flds.$sys) && (flds.$sys.keep_guid);

				pvt.$rootId = fullGuid.rootId;
				if (fullGuid.rootId == -1) {
				    if (!keep_guid) {
				        if (!pvt.parent)
				            pvt.$rootId = this.getDB().getNextRootId();
				        else
				            pvt.$rootId = pvt.root.getRootId();
				    };
                } else {
				    if (!pvt.parent)
				        this.getDB().setMaxRootId(fullGuid.rootId);
				    else {
				        var rootId = pvt.root.getRootId();
				        if (rootId != fullGuid.rootId) {
				            //throw new Error("Root (\"" + pvt.root.getGuid() +
				            //    "\") and object (\"" + pvt.guid + "\") GUIDs are inconsistent.");
				            if (DEBUG) console.warn("### Root (\"" + pvt.root.getGuid() +
				                "\") and object (\"" + pvt.guid + "\") GUIDs are inconsistent.");
				        };
				    };
				};

				fullGuid.rootId = pvt.$rootId;
			    pvt.guid= this.getDB().makeGuid(fullGuid);

				if (!parent.obj) {	// корневой объект				
					pvt.log = new MemObjLog(this);	// создать лог записи изменений
					// активизация корневого НЕ НУЖНА? TODO R2
					// 20/4 - не факт, что это правильно, пока оставляем в комментах..
					//if ((parent.mode == "RW") && (!parent.nolog) && (!pvt.db.isMaster())) // не мастер, то активируем, для мастера - на 1й подписке
					//	pvt.log.setActive(true); // лог активен только для корневого объекта, который создан в режиме ReadWrite
				    // ## перенес на 3 строки ниже, чтобы лог уже существовал
					var root_type = "res";
					if (!objType || this.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot))
					    root_type = "data";
					else
					    if (this.isInstanceOf(UCCELLO_CONFIG.classGuids.Resource))
					        root_type = "res";

					pvt.db._addRoot(this, { type: root_type, mode: parent.mode });
				}

				this.getDB()._addObj(this);

			},
			
		    // вернуть корневой элемент объекта
			_getRoot: function () {
			    var r = this;
			    while (r.getParent() != null) r = r.getParent();
			    return r;
			},

		    // завершение инициализации (вызывается из наследников)
			finit: function() {
				if (this.pvt.col)
				    this.pvt.col._add(this, this.pvt.$collection_index);
				//this.pvt.state = 1;
				if (!this.getParent())
				    this.getDB().event.fire({
				        type: "addRoot",
				        target: this.getDB(),
				        obj: this
				    });
				this.getDB().afterObjectFinalized(this);  // уведомить свою базу данных
			},
			
			// Добавляем логгер
			
			
			addChild: function(colName,obj) {
				
			},
						
			getDB: function() {
				if (!this.pvt.col) return this.pvt.db;
				else return this.pvt.col.getDB();
			},
			
			// получить локальный идентификатор объекта
            getLid: function() {
                return this.pvt.$id;
            },
			
			getGuid: function() {
			    return this.pvt.guid;
			},
			
			getGuidRes: function () {
			    return this.parseGuid(this.pvt.guid).guid;
			},

		    /**
             * Returns root id
             * 
             * @return {Integer}
             */
			getRootId: function () {
			    return this.pvt.$rootId;
			},

		    /**
             * Splits "full" GUID into 2 parts (see memDataBase.parseGuid)
             * 
             * @param {String} val Full GUID
             * @return {Object}
             * @return {String} retval.guid - GUID part
             * @return {Integer} retval.rootId - root id part (=-1 if missing)
             */
			parseGuid: function (aGuid) {
			    return this.getDB().parseGuid(aGuid);
			},

			getObjType: function () {
				return this.pvt.objType;
			},
			
			getTypeGuid: function() {
				return (this.pvt.objType == null) ? this.pvt.typeGuid : this.pvt.objType.getGuid();
			},
			
		    /**
             * Checks if this object is an instance of given type
             * 
             * @param {String} typeGuid A type GUID
             * @param {Boolean} isStrict If true then object should be exactly of this type
             * @return {Boolean} True if this object is instance of [typeGuid]
             */
			isInstanceOf: function (typeGuid, isStrict) {
			    var result = false;
			    if (this.pvt.objType) {
			        var ancestors = this.pvt.objType.pvt.ancestors;
			        var depth = -1;
			        if (ancestors) {
			            for (var i = 0; i < ancestors.length; i++) {
			                if (ancestors[i].getGuid() === typeGuid) {
			                    depth = i;
			                    break;
			                }
			            };
			            result = ((depth == 0) && isStrict) || ((depth != -1) && (!isStrict));
			        };
			    };
			    return result;
			},

	        /**
             * Get nearest child class of a given type which belongs object inheritance hierarchy
             * 
             * @param {String} typeGuid A type GUID
             * @return {Object} Class object
             */
			getNearestChildOf: function (typeGuid) {
			    var result = null;
			    if (this.pvt.objType) {
			        var ancestors = this.pvt.objType.pvt.ancestors;
			        if (ancestors) {
			            for (var i = ancestors.length- 1 ; i >= 0; i--) {
			                if (ancestors[i].getGuid() === typeGuid) {
			                    if (i > 0)
			                        result = ancestors[i- 1];
			                    break;
			                }
			            };
			        };
			    };
			    return result;
			},

	        /**
             * Rollbacks changes in a field.
             * 
             * @param {String}  field Field name
             * @param {Integer} idx Field index
             * @param {Object}  old_value Old field value
             * @throws          Always throws an error? ecause it should be overriden in descendant
             * @private
             */
			_rollback: function (field, idx, old_value) {
			    throw new Error("MemProtoObj._rollback wasn't overriden in descendant.");
			},

	        /**
             * Finalizes field modification: writes to log and fires events.
             * 
             * @param {String} field Field name
             * @param {Object} oldVal Old field value
             * @param {Object} newVal New field value
             * @param {Object} idx Field index
             * @private
             */
			_finalizeModif: function (field, oldVal, newVal, idx) {

			    try {
			        this.event.fire({
			            type: "beforeMod",
			            target: this,
			            field: field
			        });

			        this.event.fire({
			            type: "beforeMod%" + field,
			            target: this,
			        });
			    } catch (err) {
			        this._rollback(field, idx, oldVal);
			        throw err;
			    };

			    if (this.getLog().getActive()) {
			        var o = { flds: {}, obj: this, type: "mp" };
			        o.flds[field] = { old: oldVal, new: newVal };
			        this.getLog().add(o);
			    }

			    this._setModified(field, oldVal); // запоминаем измененные свойства

			    if (this.getParent())
			        this.getParent().logColModif("mod", this.getColName(), this);

			    this.event.fire({
			        type: "mod",
			        target: this,
			        field: field
			    });

			    this.event.fire({
			        type: "mod%" + field,
			        target: this,
			    });
			},

	        /**
             * Subscribes on event of ["field"] modification
             * 
             * @param {String}       field Field name
             * @param {Object}       handler Event handler (unlike "event object" handler it doesn't have "type" property)
             */
			onFieldModif: function (field, handler) {
			    if (handler) {
			        var _handler = {
			            type: "mod%" + field,
			            subscriber: handler.subscriber,
			            callback: handler.callback
			        };
			        this.event.on(_handler);
			    }
			},

	        /**
             * Unsubscribes from event of ["field"] modification
             * 
             * @param {String}       field Field name
             * @param {Object}       handler Event handler (unlike "event object" handler it doesn't have "type" property)
             */
			offFieldModif: function (field, handler) {
			    if (handler) {
			        var _handler = {
			            type: "mod%" + field,
			            subscriber: handler.subscriber,
			            callback: handler.callback
			        };
			        this.event.off(_handler);
			    }
			},

			getParent: function () {
				return this.pvt.parent;
			},
			
			// вернуть корневой элемент объекта
			getRoot: function() {
				return this.pvt.root;
			},
			
            /**
             * вернуть версию дерева объектов для данного объекта
			 * @param verType - тип версии sent|valid|draft
             * @returns {number} - версия
             */			
			getRootVersion: function(verType) {
				var robj = this.getRoot();
				var rholder = this.getDB().getRoot(robj.getGuid());
				switch (verType) {
					case "sent": return rholder.sver;
					case "valid": return rholder.vver;
					default: return rholder.dver;
				}					
			},	
			
			_setDraftVer: function(n) {
				var robj = this.getRoot();
				var rholder = this.getDB().getRoot(robj.getGuid());
				var oldver = rholder.dver;
				if (oldver == n) return;
				if (oldver > n) {
					console.log("ERROR: cannot decrement version");
					return;
				}
				var trGuid = this.getDB().getCurTranGuid();
				var trobj = rholder.vho[n.toString()];
				if (!trobj) {
					trobj = rholder.vho[n.toString()] = this.getDB().getTranObj(trGuid);
					rholder.vha.push({ ver: n, tr: trobj, guid: Utils.guid() });
				}
				if (trobj) {
					var r = trobj.roots[robj.getGuid()];
					if (!r) 
						r = trobj.roots[robj.getGuid()] = {};
					r.max = r.max ? Math.max(r.max,n) : n;
					r.min = r.min ? Math.min(r.min,n) : n;
				}	
				rholder.dver=n;
				return n;
			},
			
			setRootVersion: function(verType, n) {	
				var robj = this.getRoot();
				var rholder = this.getDB().getRoot(robj.getGuid());
				switch (verType) { // TODO 10 добавить проверку, что версия не может уменьшаться
					case "sent": 	rholder.sver = n;
									if (rholder.dver<n) this._setDraftVer(n);
									return rholder.sver;
					case "valid":  	rholder.vver = n;
									if (rholder.dver<n) this._setDraftVer(n);
									return rholder.vver;
					default: return this._setDraftVer(n);
				}					
			},	
			
			// вернуть "текущую" версию, которой маркируются изменения в логах
			getCurVersion: function() {

				var sver = this.getRootVersion("sent");
				var ver = this.getRootVersion();
				if (ver<=sver) {
					ver = sver+1;
					this.setRootVersion("draft",ver);
					//this.getDB().getCurrentVersion();
				}
				return ver;
			},
			
			getVerHist: function() {
				var robj = this.getRoot();
				var rholder = this.getDB().getRoot(robj.getGuid());
				return rholder.vha;
			},
			
			// удалить из лога все версии до n включительно, если n==undefined, то чистятся все версии
			truncVer: function(n) {
				if (!n) n = 1E8;
				var robj = this.getRoot();
				var rholder = this.getDB().getRoot(robj.getGuid());			

				for (var i=0; i<rholder.vha.length; i++) {
					var el = rholder.vha[i];
					if (el.ver <= n) 
						delete rholder.vho[el.ver.toString()];
					else
						break;
				}
				rholder.vha.splice(0,i);	
			},
			
			getLog: function() {
				var p = this;
				while (!p.pvt.log) p=p.getParent();
				return p.pvt.log; // TODO вернуть корневой лог (ссылку на корневой объект?)
			},
			

			// Поля
			
			// поиск по индексу
			get: function(field) {
				return this.pvt.fields[field];
			},
			// поиск по индексу
			_get: function(field) {
				return this.pvt.fields[field];
			},		
			
			// вернуть количество полей объекта
			count: function() {
				return this.pvt.fields.length;
			},
			
			
			// Коллекции
			
			// добавить дочернюю коллекцию
			_addCol: function(col) {
				this.pvt.collections.push(col);
			},
			
			// вернуть количество дочерних коллекций
			countCol: function() {
				return this.pvt.collections.length;
			},
			
			// вернуть коллекцию по индексу
			getCol: function(i) {
				return this.pvt.collections[i];
			},
			
			consoleLog: function(buf) {
				if (buf === undefined) buf=""
				else buf+="  ";
				//console.log(buf+" [" + this.+ "]");
				if (DEBUG) {
					for (var i=0; i<this.count(); i++)
					console.log(buf+this.getFieldName(i)+" = "+this.get(i));
				}

				for (i=0; i<this.countCol(); i++) {
					if (DEBUG) console.log(buf+this.getCol(i).getName());
					for (var j=0; j<this.getCol(i).count(); j++) {
					
						this.getCol(i).get(j).consoleLog(buf);
					}
				}
			},
			
			getColName: function() {
				return this.pvt.colName;
			},
			
			getParentCol: function () {
			    return this.pvt.col;
			},

			isFldModified: function (fldName, log_name) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    if (fldName in this.pvt.fldLog[logName])
					return true;
				else
					return false;
					
			},
			
			_setModified: function (field, oldValue) {
			    for (var logName in this.pvt.fldLog) {
			        if (!this.isFldModified(field, logName)) {
			            if (!(field in this.pvt.fldLog[logName])) this.pvt.cntFldModif[logName]++;
			            this.pvt.fldLog[logName][field] = oldValue;
			            this.pvt.isModified[logName] = true;
			        };
			    };
				
			},
			
			countModifiedFields: function (log_name) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    return this.pvt.cntFldModif[logName] !== undefined ? this.pvt.cntFldModif[logName] : 0;
			},
			
			getOldFldVal: function (fldName, log_name) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    if (fldName in this.pvt.fldLog[logName])
			        return this.pvt.fldLog[logName][fldName];
				else
					return undefined;
			},
			
			resetModifFldLog: function (log_name, trueFlag) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    this.pvt.fldLog[logName] = {};
			    this.pvt.colLog[logName] = {};

				this.pvt.isModified[logName] = (trueFlag == undefined) ? false : true;
				this.pvt.cntColModif[logName] = 0;
				this.pvt.cntFldModif[logName] = 0;
				
			},
			
			removeModifFldLog: function (log_name) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    delete this.pvt.fldLog[logName];
			    delete this.pvt.colLog[logName];

			    delete this.pvt.isModified[logName];
			    delete this.pvt.cntColModif[logName];
			    delete this.pvt.cntFldModif[logName];
			},

			logColModif: function (op, colName, obj) {
			    for (var logName in this.pvt.colLog) {
			        var colLog = this.pvt.colLog[logName];
			        if (!colLog) {
			            this.resetModifFldLog(logName);
			            colLog = this.pvt.colLog[logName];
			        }
			        if (!(colName in colLog)) {
			            colLog[colName] = {};
			            colLog[colName].del = {};
			            colLog[colName].add = {};
			            colLog[colName].mod = {};
			            this.pvt.cntColModif[logName]++;
			        }
			        this.pvt.colLog[logName][colName][op][obj.getGuid()] = obj;
			        this.pvt.isModified[logName] = true;
			    };
			},

			countModifiedCols: function (log_name) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    return this.pvt.cntColModif[logName] !== undefined ? this.pvt.cntColModif[logName] : 0;
			},
			
			getLogCol: function (colName, log_name) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    return this.pvt.colLog[logName][colName];
			},
			
			// возвращает true, если данные были изменены
			isDataModified: function (log_name) {
			    var logName = log_name ? log_name : this.dfltLogName;
			    return this.pvt.isModified[logName] ? this.pvt.isModified[logName] : false;
			}
		});
		return MemProtoObj;
	}
);