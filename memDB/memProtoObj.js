if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memObjLog'],
	function(MemObjLog) {

	    var csFullGuidDelimiter = "@"; // GUID delimiter

		var MemProtoObj = UccelloClass.extend({
				
			// objType - ссылка на объект-тип
			// parent - ссылка на объект и имя коллекции либо db, null для корневых  (obj и colname)
			init: function(objType, parent,flds){

				var pvt = this.pvt = {}; // приватные члены
				 
				pvt.objType = objType;
				pvt.fields = [];				// значения полей объекта
				pvt.collections = [];			// массив дочерних коллекций
				pvt.log = null; 
				pvt.fldLog = {};
				pvt.colLog = {};				// лог изменений в дочерних коллекциях
				pvt.isModified = false;
				pvt.cntFldModif=0;
				pvt.cntColModif=0;
				pvt.$rootId = -1;

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

				if (this.getDB() == undefined) if (DEBUG) console.log(parent.obj);
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
				        if (rootId != fullGuid.rootId)
				            throw new Error("Root (\"" + pvt.root.getGuid() +
                                "\") and object (\"" + pvt.guid + "\") GUIDs are inconsistent.");
				    };
				};
				pvt.guid = fullGuid.guid + ((pvt.$rootId > 0) ? csFullGuidDelimiter + pvt.$rootId : "");

				if (!parent.obj) {	// корневой объект				
					pvt.log = new MemObjLog(this);	// создать лог записи изменений
					// активизация корневого НЕ НУЖНА? TODO R2
					// 20/4 - не факт, что это правильно, пока оставляем в комментах..
					//if ((parent.mode == "RW") && (!parent.nolog) && (!pvt.db.isMaster())) // не мастер, то активируем, для мастера - на 1й подписке
					//	pvt.log.setActive(true); // лог активен только для корневого объекта, который создан в режиме ReadWrite
					// ## перенес на 3 строки ниже, чтобы лог уже существовал
					if (!objType || this.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot))
						pvt.db._addRoot(this,{ type: "data", mode: parent.mode});
					else 
						pvt.db._addRoot(this,{ type: "res", mode: parent.mode});
				}

				this.getDB()._addObj(this);

			},
/*
			protoobjInit: function(objType, parent,flds){
			
				var pvt = this.pvt = {}; // приватные члены
				 
				pvt.objType = objType;
				pvt.fields = [];				// значения полей объекта
				pvt.collections = [];			// массив дочерних коллекций
				pvt.log = null; 
				//pvt.state = 0;
				pvt.fldLog = {};
				pvt.colLog = {};				// лог изменений в дочерних коллекциях
				pvt.isModified = false;
				pvt.cntFldModif=0;
				pvt.cntColModif=0;
				
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
				        if (rootId != fullGuid.rootId)
				            throw new Error("Root (\"" + pvt.root.getGuid() +
                                "\") and object (\"" + pvt.guid + "\") GUIDs are inconsistent.");
				    };
				};
				pvt.guid = fullGuid.guid + ((pvt.$rootId > 0) ? csFullGuidDelimiter + pvt.$rootId : "");

				if (!parent.obj) {	// корневой объект				
					pvt.log = new MemObjLog(this);	// создать лог записи изменений
					if (!objType || this.isInstanceOf(UCCELLO_CONFIG.classGuids.DataRoot))
						pvt.db._addRoot(this,{ type: "data", mode: parent.mode});
					else 
						pvt.db._addRoot(this,{ type: "res", mode: parent.mode});
				}

				this.getDB()._addObj(this);
										
			},
*/
			
		    // вернуть корневой элемент объекта
			_getRoot: function () {
			    var r = this;
			    while (r.getParent() != null) r = r.getParent();
			    return r;
			},

		    // завершение инициализации (вызывается из наследников)
			finit: function() {
				if (this.pvt.col)
					this.pvt.col._add(this);
				//this.pvt.state = 1;
				
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
			            for (var i = 0; i < ancestors.length - 1; i++) {
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
			getCol2: function(i) {
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
			
						
			isFldModified: function(fldName) {
				if (fldName in this.pvt.fldLog) 
					return true;
				else
					return false;
					
			},
			
			_setModified: function(field,oldValue) {
				if (!(field in this.pvt.fldLog)) this.pvt.cntFldModif++;
				this.pvt.fldLog[field] = oldValue;
				this.pvt.isModified = true;
				
			},
			
			countModifiedFields: function() {
				return this.pvt.cntFldModif;
			},
			
			getOldFldVal: function(fldName) {
				if (fldName in this.pvt.fldLog) 
					return this.pvt.fldLog[fldName];
				else
					return undefined;
			},
			
			resetModifFldLog: function() {
				this.pvt.fldLog = {};
				
				for (var col in this.pvt.colLog) {
					this.pvt.colLog[col].del = {};
					this.pvt.colLog[col].add = {};
					this.pvt.colLog[col].mod = {};
				}
				
				this.pvt.isModified = false;
				this.pvt.cntColModif = 0;
				this.pvt.cntFldModif = 0;
				
			},
			
			logColModif: function(op,colName,obj) {
				if (!(colName in this.pvt.colLog))  {
					this.pvt.colLog[colName] = {};
					this.pvt.colLog[colName].del = {};
					this.pvt.colLog[colName].add = {};
					this.pvt.colLog[colName].mod = {};
					this.pvt.cntColModif++;
				}
				this.pvt.colLog[colName][op][obj.getGuid()] = obj;
				this.pvt.isModified = true;
			},

			countModifiedCols: function() {
				return this.pvt.cntColModif;
			},
			
			getLogCol: function(colName) {
				return this.pvt.colLog[colName];
			},
			
			// возвращает true, если данные были изменены
			isDataModified: function() {
				return this.pvt.isModified;
				
			}
			
			

		});
		return MemProtoObj;
	}
);