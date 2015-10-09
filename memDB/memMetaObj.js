if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memProtoObj', './memCol'],
	function(MemProtoObj, MemCol) {
		var MemMetaObj = MemProtoObj.extend({
		
			init: function(parent, flds){
							
				//flds.$sys = { guid: "4dcd61c3-3594-7456-fd86-5a3527c5cdcc" };
				var db = (parent.db) ? parent.db: parent.obj.getDB();
				//if (db.getMeta())
				UccelloClass.super.apply(this, [null,{ obj: db.getMeta(), colName: "MetaObjects" },flds]);
				this.pvt.typeGuid = UCCELLO_CONFIG.guids.metaObjGuid;
				//else 
				//	this._super(null,{ db: db },flds); // Корневой метаобъект в БД - является корнем всех остальных метаобъектов
				this.pvt.fields.push(flds.fields.typeName); // TODO проверка наличия с пустой инициализацией
				this.pvt.fields.push(flds.fields.parentClass);
				
				this.pvt.ancestors = [];
				this.pvt.ancestors.push(this);
				var par = this.getDB().getObj(flds.fields.parentClass);
				if (this.getGuid() == UCCELLO_CONFIG.classGuids.DataRoot || this.getGuid() == UCCELLO_CONFIG.classGuids.DataObject)
					this.pvt.rtype = "data";
				else
					this.pvt.rtype = "res";
				while (par) {
					this.pvt.ancestors.push(par);
					if (par && (par.getGuid() == UCCELLO_CONFIG.classGuids.DataRoot || par.getGuid() == UCCELLO_CONFIG.classGuids.DataObject))
						this.pvt.rtype = "data";
					par = (par.get("parentClass")==undefined) ? null : this.getDB().getObj(par.get("parentClass"));
				}

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
				pvt.fieldsTypes = [];

				pvt.colsTable = {};
				pvt.colsTypes = [];
				var n = this.countParentClass();
				var k=0;
				for (var i = 0; i < n; i++) {
				    var c = this.getParentClass(n - i - 1);
				    for (var j = 0; j < c.getCol("fields").count() ; j++) {
				        var name = c.getCol("fields").get(j).get("fname");
				        var typ = c.getCol("fields").get(j).get("ftype");
				        if (pvt.fieldsTable[name] === undefined) {
				            pvt.fieldsTable[name] = { obj: c, idx: j, cidx: k++, ftype: typ };
				            pvt.fieldsArr.push(name);
				            pvt.fieldsTypes.push({ type: typ, is_complex: typ.isComplex(), orig: c });
				        } else {
				            throw new Error("Field \"" + name + "\" in class \"" +
                                c.get("typeName") + "\" has been already defined in parent class.");
				        };
				    };

				    for (j = 0; j < c.getCol("cols").count() ; j++) {
				        var name = c.getCol("cols").get(j).get("cname");
				        var typ = c.getCol("cols").get(j).get("ctype");
				        var typeCol = this.getRoot().getTypeByName(typ.type);
				        typeCol = typeCol ? typeCol : null;

				        if (! typeCol)
				            if (DEBUG) console.warn("Collection \"" + name + "\" in class \"" +
                                c.get("typeName") + "\" is of undefined type \"" + typ.type + "\".");
                        //
				        // Пока не будем делать проверку на наличие типа объекта, являющегося элементом
				        //   коллекции.
                        //
                        //throw new Error("Collection \"" + name + "\" in class \"" +
                        //        c.get("typeName") + "\" is of undefined type \"" + typ.type + "\".");

                        var colIdx = pvt.colsTable[name];
				        if (colIdx === undefined) {
				            pvt.colsTable[name] = pvt.colsTypes.length;
				            pvt.colsTypes.push({ name: name, typeDef: typ, typeObj: typeCol ? typeCol : null, orig: c });
				        } else {
				            var isError = (pvt.colsTypes[colIdx].typeObj === null) || (typeCol === null);
				            pvt.colsTypes[colIdx].typeDef = typ;
				            pvt.colsTypes[colIdx].orig = c;
				            pvt.colsTypes[colIdx].typeObj = typeCol;
				            if (!isError) {
				                isError = !typeCol.isDescendantOf(pvt.colsTypes[colIdx].typeObj, pvt.colsTypes[colIdx].typeDef.strict);
				            }
				            else
				                isError = false;
				            if (isError)
				                throw new Error("Collection \"" + name + "\" in class \"" +
                                    c.get("typeName") + "\" has been already defined in parent class \"" +
                                        pvt.colsTypes[pvt.colsTable[name]].orig.get("typeName") + "\".");
				        };
				    }
				};
			},
			
		    /**
             * Checks if this type is a descendant of "parentType" type
             * 
             * @param {String} parentType Base type
             * @param {Boolean} isStrict If true then this type should be exactly "parentType"
             * @return {Boolean}
             */
			isDescendantOf: function (parentType, isStrict) {
			    var result = false;
			    var typeGuid = parentType.getGuid();
			    var ancestors = this.pvt.ancestors;
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
			    return result;
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
					return UccelloClass.super.apply(this, [field]);
					
				return undefined;				
			},
			
			getSerialized: function (field) {
			    return this.get(field);
			},

		    // получить имя поля по индексу
			getFieldName: function(i) {
				if (i==0) return "typeName";
				if (i==1) return "parentClass";
			},
			
		    /**
             * Sets field value.
             * 
             * @param {String} field Field name
             * @param {Object} value Field value
             * @throws Will throw an error if field doesn't exist
             */
			set: function (field, value) {

			    var oldVal, newVal;
			    var is_modified = false;
			    var idx = -1;

			    switch (field) {
			        case "typeName":
			            idx = 0;
			            break;

			        case "parentClass":
			            idx = 1;
			            break;

			        default:
			            throw new Error("MemMetaObjFields.set: Undefined field name \"" + field + "\".");
			            break;
			    };

			    oldVal = this.pvt.fields[idx];
			    newVal = String(value);
			    if (oldVal !== newVal) {
			        is_modified = true;
			        this.pvt.fields[idx] = newVal;
			    };

			    if (is_modified)
			        this._finalizeModif(field, oldVal, newVal);
			},

			getFieldType: function (fld) {
			    if (this.pvt.colsTypes === undefined)
			        this._bldElemTable();
			    var result = null;
			    var fname = fld;
			    if (typeof fname === "number")
			        fname = this.pvt.fieldsArr[fld];
			    if (fname && this.pvt.fieldsTable[fname])
			        result = this.pvt.fieldsTable[fname].ftype;
			    return result;
			},

			// КОЛЛЕКЦИИ
					
		    /**
             * Returns the collection list (if it doesn't exist then we'll build it).
             * 
             * @return {Array}
             */
			getColList: function () {
			    if (this.pvt.colsTypes === undefined)
			        this._bldElemTable();
			    return this.pvt.colsTypes;
			},

		    /**
             * Returns the index of "colName" collection in collection list
             *  (if it doesn't exist then we'll build it).
             * 
             * @param {String}   colName Collection name
             * @return {Integer}
             */
			getColIdx: function (colName) {
			    if (this.pvt.colsTypes === undefined)
			        this._bldElemTable();
			    return this.pvt.colsTable[colName];
			},

		    /**
             * Returns the collection type definition
             * 
             * @param {String|Integer} col Collection name or index
             * @return {Object}
             */
			getColType: function (col) {
			    var res;
			    if (this.pvt.colsTypes === undefined)
			        this._bldElemTable();

			    var idx = col;
			    if (typeof col === "string") {
			        if (this.pvt.colsTable[col] !== undefined)
			            idx = this.pvt.colsTable[col];
			    };

			    if (typeof (idx) === "number")
			        res = this.getColTypeByIdx(idx);

			    return res;
			},

		    /**
             * Returns the collection type definition using collection index
             * 
             * @param {Integer} idx Collection index
             * @return {Object}
             */
			getColTypeByIdx: function (idx) {
			    var res;
			    if (this.pvt.colsTypes === undefined)
			        this._bldElemTable();
			    if (idx < this.pvt.colsTypes.length) {
			        res = this.pvt.colsTypes[idx];
			        if (res.typeObj === null) {
			            var typeObj = this.getRoot().getTypeByName(res.typeDef.type);
			            res.typeObj = typeObj ? typeObj : null;
			        };
			    }
			    return res;
			},

		    // получить коллекцию по имени или по индексу
			getCol: function(col) {
				if (typeof col == "string") {
					if (col == "fields")
						return this.pvt.collections[0]; 
					if (col == "cols")
						return this.pvt.collections[1];
				}
				if (typeof col == "number") 
					return UccelloClass.super.apply(this, [col]);
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