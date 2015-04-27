if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

// memobj
define(
	['./memProtoObj','./memCol','../system/event'],
	function(MemProtoObj,MemCol,Event) {
		var MemObj = MemProtoObj.extend({

			init: function(objType, parent, flds){
				this._super(objType, parent, flds);

				this.event = new Event();

				var ot = this.pvt.objType;
				for (var i=0; i<ot.pvt.fieldsArr.length; i++) {
					var f = ot.pvt.fieldsArr[i];
					if ((flds!=undefined) && ("fields" in flds) && (f in flds.fields))
					  this.pvt.fields[i] = flds.fields[f]; // TODO проверять типы?	
					else
					  this.pvt.fields[i] = undefined;				
				}
				
				// создать пустые коллекции по типу
				var ccol = objType.getCol("cols");
				for (var i=0; i<ccol.count(); i++)
					new MemCol(ccol.get(i).get("cname"),this);
				
				this.finit();

				if (!parent.obj) { // TODO возможно потребуется сделать подобное собыие для метаинформации
					this.getDB().event.fire({
						type: 'newRoot',
						target: this
					});
				}
			},
			
			memobjInit: function(objType, parent, flds) {

				this.protoobjInit(objType, parent, flds);
				
				//this.event = new Event();
				
				var ot = this.pvt.objType;
				var cf = this.pvt.fields;
				if ((flds!=undefined) && ("fields" in flds)) {
					for (var i=0; i<ot.pvt.fieldsArr.length; i++) {
							var f = ot.pvt.fieldsArr[i];
							if (f in flds.fields)
							  cf[i] = flds.fields[f]; // TODO проверять типы?	
							else
							  cf[i] = undefined;				
					}
				}
				
				// создать пустые коллекции по типу
				var ccol = objType.getCol("cols");
				for (var i=0; i<ccol.count(); i++) 
					new MemCol(ccol.get(i).get("cname"),this);

				this.finit();

				if (!parent.obj) { // TODO возможно потребуется сделать подобное собыие для метаинформации
					this.event = new Event();
					this.getDB().event.fire({
						type: 'newRoot',
						target: this
					});
				}
			},

			
			// получить коллекцию по имени или по индексу
			getCol: function(col) {
				if (typeof col == "string") {
					var i=this.pvt.objType.getCol("cols").getIdxByName(col);
					return this.pvt.collections[i];
				}
				if (typeof col == "number") 
					return this.getCol2(col);
				return null;
			},
			
			
			// получить значение поля по имени или по названию
			get: function(field) {
				if (typeof field == "string") { // ищем по имени
					if (this.pvt.objType.pvt.fieldsTable[field]=== undefined)
						return undefined;
					var i=this.pvt.objType.pvt.fieldsTable[field].cidx;
					return this.pvt.fields[i];
				}
				if (typeof field == "number")  // ищем по индексу
					return this._super(field);
					
				return undefined;				
			},
			
			set: function(field,value) {
				var i=this.pvt.objType.pvt.fieldsTable[field].cidx;
				var oldValue = this.pvt.fields[i];
				if (this.pvt.fields[i] == value) return;
				this.pvt.fields[i] = value;
				if (this.getLog().getActive()) {
					var o = { flds: {}, obj:this, type:"mp"};
					o.flds[field] = {old:oldValue,new:value};
					this.getLog().add(o);
				}
				//else { // запоминаем свойства только если ЛОГ выключен - это соответствует режиму применения дельты
					/*if (field == "Cursor") {
						console.log("MEMCURSOR " +value);
					}*/
					if (!this.isFldModified(field)) { // запоминаем измененные свойства
						this._setModified(field,oldValue);
						//this.pvt.fldLog[field] = oldValue;
					}
					if (this.getParent()) this.getParent().logColModif("mod",this.getColName(),this);
					
				//}
				
				this.event.fire({
                    type: "mod",
                    target: this,
					field: field
				});	
				
			},
						
			// получить имя поля по индексу
			getFieldName: function(i) {
				return this.pvt.objType.pvt.fieldsArr[i];
			},
			
			getFieldType: function(i) {
				return this.pvt.objType.pvt.fieldsTable[this.pvt.objType.pvt.fieldsArr[i]].ftype;
			},
			
			countFields: function() {
				return this.pvt.objType.pvt.fieldsArr.length;
			}

			
			// добавить объект obj в коллекцию colName
			/*
			addToCol: function(colName,obj) {
				var c = this.getCol(colName);
				if (c) {
					c._add(obj);
					if (this.getLog().getActive()) { // TODO перенести в _add для надежности
						var newObj=this.getDB().serialize(obj);
						var o = { adObj: newObj, obj:obj, colName: colName, type:"add"};
						this.getLog().add(o);
					}
					return true;
				}
				else
					return false;
			}*/
			
			

		});
		return MemObj;
	}
);