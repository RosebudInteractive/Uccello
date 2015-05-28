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
				this.pvt.actver = -1;
				this.pvt.newlog = true;  // новый корневой лог - до первой генерации дельты
				
			},
			
			truncate: function() {
				this.pvt.log = [];
			},
			
			setActive: function(active) {
				if (active) {
					this.pvt.active = true;
					//this.pvt.actver=this.getDB().getCurrentVersion();
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
							break;
					}						
				}
				this.setActive(true);				
			},
			
			// сгенерировать "дельту" изменений по логу объекта
			genDelta: function() {
				var delta = {};
				var deltaIdx = {};
				delta.items = [];
				//delta.rtype = this.getObj()
				
				var log = this.pvt.log;
				//if (log.length == 0) return null;
				var db = this.getObj().getDB();
				var sver = db.getVersion("sent");
				var ver = db.getVersion();
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
						// добавление самого корневого элемента
						case "newRoot":
							curd.newRoot = c.adObj;
							break;
						// удаление объекта из иерархии
						case "del":
							curd.parentGuid = c.guid;
							curd.parentColName = c.colName;
							curd.deleted = 1;
							break;
					}
				}
				delta.rootGuid = this.getObj().getRoot().getGuid();
				delta.dbVersion = this.getObj().getDB().getVersion();
				if (this.getObj().getDB().getCurTranGuid()) delta.trGuid = this.getObj().getDB().getCurTranGuid();
				//this.truncate();
				return delta;
			},
			
			// применить "дельту" изменений к объекту
			applyDelta: function(delta) {
				this.setActive(false);
				var db = this.getObj().getDB();
				for (var i=0; i<delta.items.length; i++) {
					var c = delta.items[i];
					if ("deleted" in c) {
						var o = db.getObj(c.parentGuid);
						// TODO коллбэк на удаление 
						o.getCol(c.parentColName)._del(db.getObj(c.guid));
					}
					else {
						if ("newRoot" in c) {
							//db.deserialize(c.newRoot, { } , cb );
						}
						if ("add" in c) {							
							var o = db.getObj(c.parentGuid);
							var cb = db._cbGetNewObject(db.getObj(c.parentGuid).getRoot().getGuid());
							db.deserialize(c.add, { obj: o, colName: c.parentColName }, cb );
							//o.getDB().deserialize(c.add, { obj: o, colName: c.parentColName }, cb ); 
							
						}
						o2 = this.getObj().getDB().getObj(c.guid);
						if (o2) {
							for (var cf in c.fields) {
								// TODO проверить наличие полей с таким именем в метаинфо
								o2.set(cf,c.fields[cf]);
								//console.log("apply to obj "+o2.getGuid());
							}
							
						}
					}
				}
				this.setActive(true);
			},
			

			
			add: function(item) {
			
				var db = this.getObj().getDB();
				// инкрементируем версию если нужно
				var ver = db.getCurrentVersion();

				if (!(ver.toString() in this.pvt.versions))
					this.pvt.versions[ver] = this.pvt.log.length; // отмечаем место в логе, соответствующее началу этой версии
				
				
				if (this.getActive()) {
					item.idx = this.getObj().getDB().getNewCounter();
					this.pvt.log.push(item);				// добавить в лог корневого объекта
				}

			}
		});
		return MemObjLog;
	}
);