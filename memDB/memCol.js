if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	[],
	function() {
		var MemCol = Class.extend({
		
			init: function(name,obj){
				this._elems = [];			// массив элементов коллекции
				this._elemsByName = {};
				this._name = name;
				this._obj = obj;
				this._db = obj.getDB();
				//this.event = new Event();
				obj._addCol(this);
			},
			
			
			// добавить объект в коллекцию
			_add: function(obj) {
				// TODO проверить корректность типа
				this._elems.push(obj);
				// TODO ВРЕМЕННО
				var cname = obj.get("cname");
				if (cname!==undefined)
					this._elemsByName[cname]=this._elems.length-1;
				var fname = obj.get("fname");
				if (fname!==undefined)
					this._elemsByName[fname]=this._elems.length-1;				
				// ВРЕМЕННО КОНЕЦ
				if (this._obj.getLog().getActive()) { 
						var newObj=this._obj.getDB().serialize(obj);
						var o = { adObj: newObj, obj:obj, colName: this._name, type:"add"};
						this._obj.getLog().add(o);
					}
				var p = this.getParent();
				p.logColModif("add",this._name,obj);
			},
			
			_del: function(obj) {
				// TODO временный вариант - необходимо будет сделать нормально как можно быстрее
				for (var i=0; i<this._elems.length; i++) {
					if (this._elems[i] == obj) {
						this._elems.splice(i,1);
						
						if (this._obj.getLog().getActive()) { // записать в лог если активен
							var o = { obj:obj, colName: this._name, type:"del"};
							this._obj.getLog().add(o);					
						}
						this.getDB().onDeleteObject(obj);  // уведомить свою базу данных
						var p = this.getParent();
						p.logColModif("del",this._name,obj);
						return;
					}
				}
				

				
			},
			
			getName: function() {
				return this._name;
			},
			
			// TODO ВРЕМЕННАЯ ИМПЛЕМЕНТАЦИЯ - УБРАТЬ ПОСЛЕ ТОГО КАК БУДУТ СДЕЛАНЫ ИНДЕКСЫ
			getObjById: function(id) {
				for (var i=0; i<this.count(); i++) {
					if (this.get(i).get("Id")==id) return this.get(i);
				}
			},
			
			// вернуть количество элементов коллекции
			count: function() {
				return this._elems.length;
			},
			
			get: function(i) {
				return this._elems[i]; // TODO проверить диапазон
			},
			
			getIdxByName: function(name) {
				return this._elemsByName[name];
			},
			
			getDB: function() {
				return this._db;
			},
			
			getParent: function() {
				return this._obj;
			}
			

		});
		return MemCol;
	}
);