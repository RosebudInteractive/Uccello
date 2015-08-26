if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	[],
	function() {
		var MemObjLog = UccelloClass.extend({

			init: function(obj){
				this.pvt = {};
				this.pvt.obj = obj;
				this.pvt.log = [];
				this.pvt.versions = {};
				this.pvt.active = false;

				this.pvt.newlog = true;  // новый корневой лог - до первой генерации дельты
				
			},
			
			truncate: function() {
				this.pvt.log = [];
			},
			
			setActive: function(active) {
				if (active) {
					this.pvt.active = true;
				}
				else {
					//this.truncate();
					this.pvt.active = false;
				}
			},
			
			getActive: function() {
				return this.pvt.active;
			},
			
			getObj: function() {
				return this.pvt.obj;
			},

            /**
             * Проиграть назад изменения по логу корневого объекта
			 * @param {number} version - номер версии, до которого нужно откатить
             */		
			undo: function(version) {
				var ver1=String(version+1);
				if (!(ver1 in this.pvt.versions)) return;
				var log = this.pvt.log;
				var db = this.getObj().getDB();
				this.setActive(false);
				for (var i=log.length-1; i>=this.pvt.versions[version+1]; i--) {
					var c = log[i];
					var s = c.obj.getGuid();
					switch(c.type) {
						case "mp":
							for (var fld in c.flds) 
								c.obj.set(fld,c.flds[fld].old);
							break;	
						case "add": // удалить ранее добавленный объект
							var par = c.obj.getParent();
							par.getCol(c.colName)._del(c.obj);
							break;
						case "del":
						    var o = db.getObj(c.guid);
						    //var cb = db._cbGetNewObject(db.getObj(c.guid).getRoot().getGuid());
							//if (!cb) 
							cb = db.getDefaultCompCallback();
						    if (cb)
						        db.deserialize(c.delObj, { obj: o, colName: c.colName }, cb);
						    else
						        if (DEBUG) console.error("Can't restore object \"" + c.delObj.$sys.guid+
                                    "\" because callback function doesn't exist.");
						    break;
					}						
				}
				this.setActive(true);				
			},
			
            /**
             * сгенерировать "дельту" изменений по логу объекта
             */	
			genDelta: function() {
				var delta = {};
				var deltaIdx = {};
				delta.items = [];
				
				var log = this.pvt.log;
				//if (log.length == 0) return null;
				var obj = this.getObj();
				var db = obj.getDB();
				
				// FINALTR
				//var sver = db.getVersion("sent"); // VER определяем с какой по какую версию делать лог
				//var ver = db.getVersion();
				var sver = this.getObj().getRootVersion("sent"); // VER определяем с какой по какую версию делать лог
				var ver = this.getObj().getRootVersion();
				
				if (ver==sver) return null;
				var k=1;
				while ((this.pvt.versions[sver+k]==undefined) && (sver+k<=ver)) k++;
				if (this.pvt.versions[sver+k]==undefined) return null;
				
				var start=this.pvt.versions[sver+k];
				for (var i=start; i<log.length; i++) {
					var c = log[i];
					var s = c.obj.getGuid();
                    if (!(s in deltaIdx)) {
						var curd = {};
						curd.guid = c.obj.getGuid();
						deltaIdx[s] = delta.items.length;
                        delta.items.push(curd); 
						// TODO добавить элемент для идентификации
					}
                    else 
                        curd = delta.items[deltaIdx[s]];
								
					switch(c.type) {
						// изменение поля (свойства)
						case "mp":
							if (!("fields" in curd)) curd.fields = {};
							for (var fld in c.flds) 
								curd.fields[fld] = c.flds[fld].new;
							break;
						// добавление объекта в иерархию
						case "add":
							curd.add = c.adObj;
							curd.parentGuid = c.guid;
							curd.parentColName = c.colName; 
							break;
						// подписка на корневой элемент
						case "subscribe":
							if (!curd.newRoot) curd.newRoot = c.sobj; // сериализованное представление уже в логе, берем его
							// db.serialize(obj);

							if (!("subscribers" in delta)) delta.subscribers={};
							if (c.subscriber) delta.subscribers[c.subscriber] = 1;
							break;
						// удаление объекта из иерархии
						case "del":
						    curd.del = c.delObj;
						    curd.parentGuid = c.guid;
							curd.parentColName = c.colName;
							curd.deleted = 1;
							break;
					}
				}
				delta.rootGuid = obj.getRoot().getGuid();
				
				// FINALTR записывем версию текущей транзакции в дельту
				delta.dbVersion = db.getVersion(); //TODO а есть ли уверенность, что на момент генерации дельты версия еще не поменялась?
				delta.ver = obj.getRootVersion();						
				if (db.inTran()) delta.trGuid = db.getCurTranGuid();
				//this.truncate();
				return delta;
			},
			
			getListOfTypes: function (delta, list) {
			    var db = this.getObj().getDB();
			    var result = list ? list : { arrTypes: [] };
			    for (var i = 0; i < delta.items.length; i++) {
			        var c = delta.items[i];
			        if ("add" in c)
			            db.getListOfTypes(c.add, result, true);
			    };
			    return result;
			},

		    // применить "дельту" изменений к объекту
			applyDelta: function(delta) {
				this.setActive(false);
				var db = this.getObj().getDB();
				for (var i=0; i<delta.items.length; i++) {
					var c = delta.items[i];
					if ("newRoot" in c) 
						continue;
					if ("deleted" in c) {
						var o = db.getObj(c.parentGuid);
						// TODO коллбэк на удаление 
						o.getCol(c.parentColName)._del(db.getObj(c.guid));
					}
					else {
						if ("add" in c) {							
							var o = db.getObj(c.parentGuid);
							cb = db.getDefaultCompCallback();
							db.deserialize(c.add, { obj: o, colName: c.parentColName }, cb );
							
						}
						var o2 = db.getObj(c.guid);
						if (o2) 
							for (var cf in c.fields) o2.set(cf,c.fields[cf]);
					}
				}
				this.setActive(true);
			},
			
			add: function(item) {					
				if (!(this.getActive()))
					return;
				
				var db = this.getObj().getDB();
				/*var dbver =*/ db.getCurrentVersion(); // инкрементируем версии если нужно
				var ver = this.getObj().getCurVersion();

				if (!(ver.toString() in this.pvt.versions))
					this.pvt.versions[ver] = this.pvt.log.length; // отмечаем место в логе, соответствующее началу этой версии

				item.idx = db.getNewCounter();
				this.pvt.log.push(item);				// добавить в лог корневого объекта
			}
		});
		return MemObjLog;
	}
);