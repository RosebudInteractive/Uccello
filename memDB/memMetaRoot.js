﻿if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['./memProtoObj','./memCol'],
	function(MemProtoObj,MemCol) {
		var MemMetaRoot = MemProtoObj.extend({
		
			init: function(parent, flds){
				
				flds.$sys = { guid: UCCELLO_CONFIG.guids.metaRootGuid };
				
				this._super(null,{ db: parent.db },flds); // Корневой метаобъект в БД - является корнем всех остальных метаобъектов
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
					return this._super(col);
				return null;
			}

			

		});
		return MemMetaRoot;
	}
);