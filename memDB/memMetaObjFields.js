if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['./memProtoObj'],
	function(MemProtoObj) {
		var MemMetaObjFields = MemProtoObj.extend({
		
			init: function(parent, flds){
				//flds.$sys = { guid: "0fa90328-4e86-eba7-b12b-4fff3a057533" };

				this._super(null,{obj : parent.obj, colName : "fields" }, flds ); 
				this.pvt.typeGuid = "0fa90328-4e86-eba7-b12b-4fff3a057533";
				this.pvt.fields.push(flds.fields.fname);
				this.pvt.fields.push(flds.fields.ftype);
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
					return this._super(field);
			},
			
			// получить имя поля по индексу
			getFieldName: function(i) {
				if (i==0) return "fname";
				if (i==1) return "ftype";
				if (i==2) return "fdefault";
			},
			

		});
		return MemMetaObjFields;
	}
);