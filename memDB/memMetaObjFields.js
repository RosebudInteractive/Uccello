if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memProtoObj', './memMetaType'],
	function (MemProtoObj, MemMetaType) {
		var MemMetaObjFields = MemProtoObj.extend({
		
			init: function(parent, flds){
				//flds.$sys = { guid: "0fa90328-4e86-eba7-b12b-4fff3a057533" };
				UccelloClass.super.apply(this, [null,{obj : parent.obj, colName : "fields" }, flds]);
				this.pvt.typeGuid = UCCELLO_CONFIG.guids.metaObjFieldsGuid;
				this.pvt.fields.push(flds.fields.fname);
				this.pvt.fields.push(MemMetaType.createTypeObject(flds.fields.ftype, this.getDB()));
				this.pvt.fields.push(flds.fields.fdefault);
				this.finit();

			},
			
		    // ПОЛЯ
			
			get: function(field) {

				if (typeof field == "string") { // ищем по имени			
					if (field=="fname") return this.pvt.fields[0];
					if (field=="ftype") return this.pvt.fields[1];
					if (field=="fdefault") return this.pvt.fields[2];
				}
				
				if (typeof field == "number")  // ищем по индексу
				    return UccelloClass.super.apply(this, [field]);
			},
			
			getSerialized: function (field) {

			    if (typeof field == "string") { // ищем по имени			
			        if (field == "fname") return this.pvt.fields[0];
			        if (field == "ftype") return this.pvt.fields[1].serialize();
			        if (field == "fdefault") return this.pvt.fields[2];
			    };

			    if (typeof field == "number") {  // ищем по индексу
			        if (field == 1)
			            return this.pvt.fields[1].serialize();

			        return this.pvt.fields[field];
			    };

			    return undefined;
			},

			getFieldType: function () {
			    return this.pvt.fields[1];
			},

		    // получить имя поля по индексу
			getFieldName: function(i) {
				if (i==0) return "fname";
				if (i==1) return "ftype";
				if (i==2) return "fdefault";
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

			    switch (field) {
			        case "fname":
			            oldVal = this.pvt.fields[0];
			            newVal = String(value);
			            if (oldVal !== newVal) {
			                is_modified = true;
			                this.pvt.fields[0] = newVal;
			            };
			            break;

			        case "ftype":
			            oldVal = this.pvt.fields[1];
			            newVal = value;
			            if (!(newVal instanceof MemMetaType.BaseType))
			                newVal = MemMetaType.createTypeObject(value, this.getDB()); // Convert serialized type to type object
			            if (oldVal.hash() !== newVal.hash()) {
			                is_modified = true;
			                this.pvt.fields[1] = newVal;
			                oldVal = oldVal.serialize();
			                newVal = newVal.serialize();
                        };
			            break;

			        case "fdefault":
			            break;

			        default:
			            throw new Error("MemMetaObjFields.set: Undefined field name \"" + field + "\".");
			            break;
			    };

			    if (is_modified)
			        this._finalizeModif(field, oldVal, newVal);
			}

		});
		return MemMetaObjFields;
	}
);