if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memProtoObj'],
	function(MemProtoObj) {
		var MemMetaObjCols = MemProtoObj.extend({
		
			init: function(parent, flds){
				//flds.$sys = { guid: "99628583-1667-3341-78e0-fb2af29dbe8" };
				UccelloClass.super.apply(this, [null,{obj : parent.obj, colName : "cols" },flds]);
				this.pvt.typeGuid = UCCELLO_CONFIG.guids.metaObjColsGuid;
				this.pvt.fields.push(flds.fields.cname);
				this.pvt.fields.push(this._deserializeType(flds.fields.ctype));
				this.finit();				
			},

		    /**
             * Converts a collection type from serialized representation 
             * to the internal one
             * 
             * @param {String|Object} tp Serialized representation of the collection type
             * @private
             */
			_deserializeType: function (tp) {
			    var res = { type: "", strict: false };
			    if (typeof (tp) === "string")
			        res.type = tp;
			    else {
			        res.type = tp.type;
			        res.strict = typeof (tp.strict) === "boolean" ? tp.strict : false;
			    };
			    return res;
			},

		    /**
             * Converts the internal representation of the collection type
             * to the serialized one
             *
             * @param {Object} val Internal representation of the collection type
             * @return {String|Object} Serialized representation
             */
			_serializeType: function (val) {
			    var res = val.type;
			    if (val.strict)
			        res = { type: val.type, strict: true };
			    return res;
			},

			// ПОЛЯ
			
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
			        case "cname":
			            oldVal = this.pvt.fields[0];
			            newVal = String(value);
			            if (oldVal !== newVal) {
			                is_modified = true;
			                this.pvt.fields[0] = newVal;
			            };
			            break;

			        case "ctype":
			            oldVal = this.pvt.fields[1];
			            newVal = this._deserializeType(value);
			            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
			                is_modified = true;
			                this.pvt.fields[1] = newVal;
			                oldVal = this._serializeType(oldVal);
			                newVal = this._serializeType(newVal);
			            };
			            break;

			        default:
			            throw new Error("MemMetaObjFields.set: Undefined field name \"" + field + "\".");
			            break;
			    };

			    if (is_modified)
			        this._finalizeModif(field, oldVal, newVal);
			},

		    get: function(field) {

				if (typeof field == "string") { // ищем по имени			
					if (field=="cname") return this.pvt.fields[0];
					if (field=="ctype") return this.pvt.fields[1];
				}
				
				if (typeof field == "number")  // ищем по индексу
					return UccelloClass.super.apply(this, [field]);
			},
			
			getSerialized: function (field) {
			    var idx = field;
			    if (typeof field == "string") { // ищем по имени			
			        if (field == "cname") idx = 0;
			        if (field == "ctype") idx = 1;
			    }
			    var res;
			    switch (idx) {
			        case 0:
			            res = this.pvt.fields[0];
			            break;
			        case 1:
			            res = this._serializeType(this.pvt.fields[1]);
			            break;
			    };
			    return res;
			},

		    // получить имя поля по индексу
		    // получить имя поля по индексу
			getFieldName: function(i) {
				if (i==0) return "cname";
				if (i==1) return "ctype";
			},			
			


		});
		return MemMetaObjCols;
	}
);