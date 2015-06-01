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
             * @return {String|Object} Serialized representation
             */
			_serializeType: function () {
			    var res = this.pvt.fields[1].type;
			    if (this.pvt.fields[1].strict)
			        res = { type: this.pvt.fields[1].type, strict: true };
			    return res;
			},

			// ПОЛЯ
			
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
			            res = this._serializeType();
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