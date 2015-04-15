if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['./memProtoObj','./memCol'],
	function(MemProtoObj,MemCol) {
		var MemMetaObj = MemProtoObj.extend({
		
			init: function(parent, flds){
							
				//flds.$sys = { guid: "4dcd61c3-3594-7456-fd86-5a3527c5cdcc" };
				var db = (parent.db) ? parent.db: parent.obj.getDB();
				//if (db.getMeta())
				this._super(null,{ obj: db.getMeta(), colName: "MetaObjects" },flds); 
				this.pvt.typeGuid = "4dcd61c3-3594-7456-fd86-5a3527c5cdcc";
				//else 
				//	this._super(null,{ db: db },flds); // Корневой метаобъект в БД - является корнем всех остальных метаобъектов
				this.pvt.fields.push(flds.fields.typeName); // TODO проверка наличия с пустой инициализацией
				this.pvt.fields.push(flds.fields.parentClass);
				
				this.pvt.ancestors = [];
				this.pvt.ancestors.push(this);
				var par = this.getDB().getObj(flds.fields.parentClass);
				while (par) {
					this.pvt.ancestors.push(par);
					par = (par.get("parentClass")==undefined) ? null : this.getDB().getObj(par.get("parentClass"));
				}
				
				// TODO ПЕРЕДЕЛАТЬ!!!
				if ((flds.$sys.guid == UCCELLO_CONFIG.classGuids.DataRoot) ||
					(flds.$sys.guid == "73596fd8-6901-2f90-12d7-d1ba12bae8f4") ||
					(flds.$sys.guid == "59583572-20fa-1f58-8d3f-5114af0f2c51") ||
					(flds.$sys.guid == "16ec0891-1144-4577-f437-f98699464948") ||
					(flds.$sys.guid == "08a0fad1-d788-3604-9a16-3544a6f97721") ||
					(flds.$sys.guid == "86c611ee-ed58-10be-66f0-dfbb60ab8907") ||
					(flds.$sys.guid == "56cc264c-5489-d367-1783-2673fde2edaf")
				)
					this.pvt.rtype = "data";
				else
					this.pvt.rtype = "res";

				// инициализируем коллекции для метаинфо - описание полей и описание коллекций
				new MemCol("fields",this);
				new MemCol("cols",this);
				
				this.finit();

			},
			
			// сделать таблицу элементов с учетом наследования
			_bldElemTable: function() {
				var pvt = this.pvt;
				pvt.fieldsTable = {};
				pvt.fieldsArr = [];
				var n = this.countParentClass();
				var k=0;
				for (var i=0; i<n; i++) {
					var c = this.getParentClass(n-i-1);
					for (var j=0; j<c.getCol("fields").count(); j++) {
						var name = c.getCol("fields").get(j).get("fname");
						var typ = c.getCol("fields").get(j).get("ftype");
						pvt.fieldsTable[name]= { obj: c, idx: j, cidx:k++, ftype: typ };
						pvt.fieldsArr.push(name);
					}
				}
			},
			
			// получить класс-предок 
			// i=0 this, i=1 parent, i=2 parent+1
			getParentClass: function(i) {
				var i1 = 1;
				if (i!==undefined) i1=i;
				if ((this.pvt.ancestors.length-1)>=i1)
					return this.pvt.ancestors[i1];
				else
					return null;
				//return this._fields[1];
			},
			
			countParentClass: function() {
				return this.pvt.ancestors.length;
			},
			

			// ПОЛЯ
			
			// получить значение поля по имени или по названию
			get: function(field) {
				if (typeof field == "string") { // ищем по имени
					if (field=="typeName")
						return this.pvt.fields[0];
					if (field=="parentClass")
						return this.pvt.fields[1];
				}
				if (typeof field == "number")  // ищем по индексу
					return this._super(field);
					
				return undefined;				
			},
			
			// получить имя поля по индексу
			getFieldName: function(i) {
				if (i==0) return "typeName";
				if (i==1) return "parentClass";
			},
			
					
			// КОЛЛЕКЦИИ
					
			// получить коллекцию по имени или по индексу
			getCol: function(col) {
				if (typeof col == "string") {
					if (col == "fields")
						return this.pvt.collections[0]; 
					if (col == "cols")
						return this.pvt.collections[1];
				}
				if (typeof col == "number") 
					return this._super(col);
				return null;
			},
			
			getRtype: function() {
				return this.pvt.rtype;
			},
			
			// получить индекс элемента коллекции с учетом наследования
			getIdxElem: function() {
				
			}
			

		});
		return MemMetaObj;
	}
);