if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memProtoObj','./memCol'],
	function(MemProtoObj,MemCol) {
		var MemMetaRoot = MemProtoObj.extend({
		
			init: function(parent, flds){
				
			    flds.$sys = { guid: UCCELLO_CONFIG.guids.metaRootGuid, keep_guid: (flds) && (flds.$sys) && (flds.$sys.keep_guid) };

				UccelloClass.super.apply(this, [null,{ db: parent.db },flds]);// Корневой метаобъект в БД - является корнем всех остальных метаобъектов
				this.pvt.typeGuid = UCCELLO_CONFIG.guids.metaRootGuid;
				// инициализируем коллекции для метаинфо - описание вложенных метаобъектов
				new MemCol("MetaObjects",this);
				
				this.finit();
			},

			// ПОЛЯ
			
			// получить имя поля по индексу
			getFieldName: function(i) {
				return undefined;
			},
			
					
			// КОЛЛЕКЦИИ
					
			// получить коллекцию по имени или по индексу
			getCol: function(col) {
				if (typeof col == "string") {
					if (col == "MetaObjects")
						return this.pvt.collections[0]; 
				}
				if (typeof col == "number") 
					return UccelloClass.super.apply(this, [col]);
				return null;
			}

			

		});
		return MemMetaRoot;
	}
);