﻿if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

// memobj
define(
	['./memProtoObj','./memCol','../system/event'],
	function(MemProtoObj,MemCol,Event) {
		var MemObj = MemProtoObj.extend({

			init: function(objType, parent, flds){
				UccelloClass.super.apply(this, [objType, parent, flds]);

				this.event = new Event();
/*
				var ot = this.pvt.objType.pvt;
				for (var i=0; i<ot.fieldsArr.length; i++) {
				    var f = ot.fieldsArr[i];
				    var ft = ot.fieldsTypes[i];
				    var is_complex = ft.is_complex;
				    ft = ft.type;
				    if ((flds != undefined) && ("fields" in flds) && (f in flds.fields)) {
				        if (is_complex) {
				            var val = ft.setValue(flds.fields[f], f, this, false);
				            this.pvt.fields[i] = val;
				        } else
				            this.pvt.fields[i] = flds.fields[f]; // TODO проверять типы?
				    } else
				        this.pvt.fields[i] = undefined;						
				}
*/
				var otp = this.pvt.objType.pvt;
				var ot = otp.fieldsArr;
				this.pvt.fields = new Array(ot.length);
				var cf = this.pvt.fields;
				if ((flds!=undefined) && ("fields" in flds)) {
					for (var i=0; i<ot.length; i++) {
							//var f = ;
					    var ft = otp.fieldsTypes[i];
					    var is_complex = ft.is_complex;
					    ft = ft.type;
					    if (ot[i] in flds.fields) {
					        if (is_complex) {
					            var val = ft.setValue(flds.fields[ot[i]], ot[i], this, false);
					            cf[i] = val;
					        } else
					            cf[i] = flds.fields[ot[i]];
					    } else
					        cf[i] = undefined;
					}
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
			/*
			memobjInit: function(objType, parent, flds) {

				this.protoobjInit(objType, parent, flds);
				
				//this.event = new Event();
				
				var otp = this.pvt.objType.pvt;
				var ot = otp.fieldsArr;
				this.pvt.fields = new Array(ot.length);
				var cf = this.pvt.fields;
				if ((flds!=undefined) && ("fields" in flds)) {
					for (var i=0; i<ot.length; i++) {
							//var f = ;
					    var ft = otp.fieldsTypes[i];
					    var is_complex = ft.is_complex;
					    ft = ft.type;
					    if (ot[i] in flds.fields) {
					        if (is_complex) {
					            var val = ft.setValue(flds.fields[ot[i]], ot[i], this, false);
					            cf[i] = val;
					        } else
					            cf[i] = flds.fields[ot[i]]; // TODO проверять типы?
					    } else
					        cf[i] = undefined;
					}
				}*/
				
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
			    var fldIdx = -1;
			    var objType = this.pvt.objType.pvt;
			    var maxIdx = objType.fieldsArr.length;

			    if (typeof field == "string") { // ищем по имени
			        if (objType.fieldsTable[field] === undefined)
						return undefined;
			        fldIdx = objType.fieldsTable[field].cidx;
                }
				if (typeof field == "number")  // ищем по индексу
				    fldIdx = field;

				if ((fldIdx != -1) && (fldIdx < maxIdx)) {
				    var val = this.pvt.fields[fldIdx];
				    var tp = objType.fieldsTypes[fldIdx];
				    if (tp.is_complex)
				        val = tp.type.getValue(val);
				    return val;
				} else
				    return undefined;
			},
			
			getSerialized: function (field, use_resource_guid) {
			    var fldIdx = -1;
			    var objType = this.pvt.objType.pvt;
			    var maxIdx = objType.fieldsArr.length;

			    if (typeof field == "string") { // ищем по имени
			        if (objType.fieldsTable[field] === undefined)
			            return undefined;
			        fldIdx = objType.fieldsTable[field].cidx;
			    }
			    if (typeof field == "number")  // ищем по индексу
			        fldIdx = field;

			    if ((fldIdx != -1) && (fldIdx < maxIdx)) {
			        return objType.fieldsTypes[fldIdx].type.getSerializedValue(this.pvt.fields[fldIdx], use_resource_guid);
			    } else
			        return undefined;
			},

			set: function (field, value, withCheckVal) {
			    var objType = this.pvt.objType.pvt;

			    if (objType.fieldsTable[field] === undefined)
			        throw new Error("Field \"" + field + "\" doesn't exist in the object \"" + this.pvt.guid + "\".");
			    var i = objType.fieldsTable[field].cidx;
				var oldValue = this.pvt.fields[i];

				var fldType = objType.fieldsTypes[i];
				var is_complex = fldType.is_complex;
				fldType = fldType.type;
				var newValue = value;
				if (is_complex || withCheckVal)
				    newValue = fldType.setValue(value, field, this, withCheckVal);

				if (fldType.isEqual(oldValue, newValue)) return;

				this.pvt.fields[i] = newValue;
				var oldSerialized = oldValue;
				var newSerialized = newValue;

				if (is_complex) {
				    oldSerialized = fldType.getSerializedValue(oldValue);
				    newSerialized = fldType.getSerializedValue(newValue);
				}

				if (this.getLog().getActive()) {
					var o = { flds: {}, obj:this, type:"mp"};
					o.flds[field] = { old: oldSerialized, new: newSerialized };
					this.getLog().add(o);
				}
				//else { // запоминаем свойства только если ЛОГ выключен - это соответствует режиму применения дельты
					/*if (field == "Cursor") {
						console.log("MEMCURSOR " +value);
					}*/
					if (!this.isFldModified(field)) { // запоминаем измененные свойства
					    this._setModified(field, oldSerialized);
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