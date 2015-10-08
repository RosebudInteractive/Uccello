if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

// memobj
define(
	['./memProtoObj','./memCol'],
	function(MemProtoObj,MemCol) {
		var MemObj = MemProtoObj.extend({

			init: function(objType, parent, flds){
				UccelloClass.super.apply(this, [objType, parent, flds]);

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
				//var ccol = objType.getCol("cols");
				//for (var i=0; i<ccol.count(); i++)
				//	new MemCol(ccol.get(i).get("cname"),this);
				
				var colList = objType.getColList();
				for (var i = 0; i < colList.length ; i++)
				    (new MemCol(colList[i].name, this)).on({
				        type: 'add',
				        subscriber: this,
				        callback: this.getCheckColElemType(i)
				    });

				this.finit();

				if (!parent.obj) { // TODO возможно потребуется сделать подобное собыие для метаинформации
					this.getDB().event.fire({
						type: 'newRoot',
						target: this
					});
				}
			},


		    /**
             * Returns a function which verifies the type of object which is being added to the collection.
             * 
             * @param {Integer} colIdx Collection index
             * @return {Function}
             */
			getCheckColElemType: function (colIdx) {
			    return function (args) {
			        var colType = this.pvt.objType.getColTypeByIdx(colIdx);
			        if (colType.typeObj) {
			            if (!args.obj.isInstanceOf(colType.typeObj.getGuid(), colType.typeDef.strict)) {
			                throw new Error("Invalid object type \"" + args.obj.getObjType().get("typeName") +
                                "\" in collection \"" + colType.name + "\" of type \"" + this.getObjType().get("typeName") +
                                "\". Required type is \"" + colType.typeObj.get("typeName") + "\".");
			            }
			        } else {
			            throw new Error("Unknown collection type \"" + colType.typeDef.type +
                            "\" in collection \"" + colType.name + "\" of type \"" + this.getObjType().get("typeName") + "\".");
			        };
			    };
			},

			// получить коллекцию по имени или по индексу
			getCol: function(col) {
				if (typeof col == "string") {
					var i = this.pvt.objType.getColIdx(col);
					if (typeof (i) == "number")
					    return this.pvt.collections[i];
                }
				if (typeof col == "number") 
				    return UccelloClass.super.apply(this, [col]);
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

		    /**
             * Compares field values of this["field"] and otherObj["field"]
             *   "this" and "otherObj" should be the instances of the compatible types
             *   but this fact is not being verified here (be careful)
             * 
             * @param {String}       field Field name
             * @param {Object}       otherObj Another object of the type compatible with "this"
             * @throws               Will throw an error if the "field" doesn't exist
             * @return {Integer}
             *                       0 - this["field"] = otherObj["field"]
             *                       1 - this["field"] > otherObj["field"]
             *                     (-1) - this["field"] < otherObj["field"]
             */
			cmpFldVals: function (field, otherObj) {
				var objType = this.pvt.objType.pvt;
				if (objType.fieldsTable[field] === undefined)
					throw new Error("cmpFldVals: Field \"" + field + "\" doesn't exist in the object \"" + this.pvt.guid + "\".");
				var i = objType.fieldsTable[field].cidx;
				var fldType = objType.fieldsTypes[i].type;
				var Value = this.pvt.fields[i];

				if (otherObj instanceof MemObj) {
					var otherType = otherObj.pvt.objType.pvt;
					if (otherType.fieldsTable[field] === undefined)
						throw new Error("cmpFldVals: Field \"" + field + "\" doesn't exist in the OTHER object \"" + otherObj.pvt.guid + "\".");
					i = otherType.fieldsTable[field].cidx;
					var otherValue = otherObj.pvt.fields[i];
				}
				else
					otherValue = otherObj;

				return fldType.compare(Value, otherValue);
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

				this._finalizeModif(field, oldSerialized, newSerialized);
			},

		    /**
		     * Returns "end-user" representation of "old value".
		     *  "Old-value" is represented in log in serialized form.
             *
             * @param {String} fldName Field name
             * @param {String} [log_name=this.dfltLogName] Log name
             * @return {Object}
             */
			getOldFldVal: function (fldName, log_name) {
		        var logName = log_name ? log_name : this.dfltLogName;
		        if (fldName in this.pvt.fldLog[logName]) {
		            var old_val = this.pvt.fldLog[logName][fldName];
			        if (old_val !== undefined) {
			            var objType = this.pvt.objType.pvt;
			            if (objType.fieldsTable[fldName] === undefined)
			                throw new Error("Field \"" + fldName + "\" doesn't exist in the object \"" + this.pvt.guid + "\".");
			            var i = objType.fieldsTable[fldName].cidx;
			            var fldType = objType.fieldsTypes[i];
			            var is_complex = fldType.is_complex;
			            fldType = fldType.type;
			            if (is_complex) {
			                var curr_val = fldType.getSerializedValue(this.pvt.fields[i]);
			                old_val = fldType.getValue(fldType.setValue(old_val, fldName, this, false));
			                fldType.setValue(curr_val, fldName, this, false);
			            };
			        };
			        return old_val;
                }
			    else
			        return undefined;
			},

		    // получить имя поля по индексу
			getFieldName: function(i) {
				return this.pvt.objType.pvt.fieldsArr[i];
			},
			
			getFieldType: function (fld) {
			    var fname = fld;
			    if (typeof fname === "number")
			        fname = this.pvt.objType.pvt.fieldsArr[fld];
			    return this.pvt.objType.pvt.fieldsTable[fname].ftype;
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