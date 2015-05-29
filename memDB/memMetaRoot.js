if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memProtoObj','./memCol'],
	function(MemProtoObj,MemCol) {
	    var MemMetaRoot = MemProtoObj.extend({
		
	        init: function(parent, flds){
				
	            this._types = {};
	            flds.$sys = { guid: UCCELLO_CONFIG.guids.metaRootGuid, keep_guid: (flds) && (flds.$sys) && (flds.$sys.keep_guid) };

	            UccelloClass.super.apply(this, [null,{ db: parent.db },flds]);// Корневой метаобъект в БД - является корнем всех остальных метаобъектов
	            this.pvt.typeGuid = UCCELLO_CONFIG.guids.metaRootGuid;
	            // инициализируем коллекции для метаинфо - описание вложенных метаобъектов
	            (new MemCol("MetaObjects", this)).on({
	                type: 'add',
	                subscriber: this,
	                callback: function (args) {
	                    var name = args.obj.get("typeName");
	                    if (this._types[name] === undefined)
	                        this._types[name] = args.obj;
	                    else
	                        throw new Error("Type \"" + name + "\" is already defined.");

	                }
	            }).on({
	                type: 'del',
	                subscriber: this,
	                callback: function (args) {
	                    delete this._types[args.obj.get("typeName")];
	                }
	            });
				
	            this.finit();
	        },

	        /**
             * Returns type object given by it's name
             * 
             * @param {String} tpName Type name
             * @return {Object}
             */
	        getTypeByName: function (tpName) {
	            return this._types[tpName];
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