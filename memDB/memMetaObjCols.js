if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['./memProtoObj'],
	function(MemProtoObj) {
		var MemMetaObjCols = MemProtoObj.extend({
		
			init: function(parent, flds){
				//flds.$sys = { guid: "99628583-1667-3341-78e0-fb2af29dbe8" };

				this._super(null,{obj : parent.obj, colName : "cols" },flds );
				this.pvt.typeGuid = UCCELLO_CONFIG.guids.metaObjColsGuid;
				this.pvt.fields.push(flds.fields.cname);
				this.pvt.fields.push(flds.fields.ctype);
				this.finit();				
			},
			
			// ПОЛЯ
			
			get: function(field) {

				if (typeof field == "string") { // ищем по имени			
					if (field=="cname") return this.pvt.fields[0];
					if (field=="ctype") return this.pvt.fields[1];
				}
				
				if (typeof field == "number")  // ищем по индексу
					return this._super(field);
			},
			
			getSerialized: function (field) {
			    return this.get(field);
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