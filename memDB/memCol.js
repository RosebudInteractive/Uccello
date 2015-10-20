if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	["../system/event"],
	function (Event) {
	    var MemCol = UccelloClass.extend([new Event()], {

	        init: function (name, obj) {
	            this._elems = [];			// массив элементов коллекции
	            this._name = name;
	            this._obj = obj;
	            this._db = obj.getDB();
				this._guidIndex = {};
	            this.eventsInit();  // WARNING !!! This line is essential !!! 
	            obj._addCol(this);
	        },


	        // добавить объект в коллекцию
	        _add: function (obj) {

	            this.fire({
	                type: "beforeAdd",
	                target: this,
	                obj: obj
	            });

	            this._elems.push(obj);

				this._guidIndex[obj.getGuid()] = this._elems.length - 1;

	            if (this._obj.getLog().getActive()) {
	                var mg = (obj.getParent() ? obj.getParent().getGuid() : "");
	                var newObj = this._obj.getDB().serialize(obj);
	                var o = { adObj: newObj, obj: obj, colName: this._name, guid: mg, type: "add" };
	                this._obj.getLog().add(o);
	            }
	            var p = this.getParent();
	            p.logColModif("add", this._name, obj);

	            this.fire({
	                type: "add",
	                target: this,
	                obj: obj
	            });
	        },

	        _del: function (obj) {
	            // TODO временный вариант - необходимо будет сделать нормально как можно быстрее
	            for (var i = 0; i < this._elems.length; i++) {
	                if (this._elems[i] == obj) {

	                    this.fire({
	                        type: "beforeDel",
	                        target: this,
	                        obj: obj
	                    });

	                    this._elems.splice(i, 1);

	                    if (this._obj.getLog().getActive()) { // записать в лог если активен
	                        var oldObj = this._obj.getDB().serialize(obj);
	                        var o = { delObj: oldObj, obj: obj, colName: this._name, guid: obj.getParent().getGuid(), type: "del" };
	                        this._obj.getLog().add(o);
	                    }
	                    this.getDB().onDeleteObject(obj);  // уведомить свою базу данных
	                    var p = this.getParent();
	                    p.logColModif("del", this._name, obj);

	                    this.fire({
	                        type: "del",
	                        target: this,
	                        obj: obj
	                    });
	                    return;
	                }
	            }

				delete this._guidIndex[obj.getGuid()];

	        },

	        getName: function () {
	            return this._name;
	        },

	        // TODO ВРЕМЕННАЯ ИМПЛЕМЕНТАЦИЯ - УБРАТЬ ПОСЛЕ ТОГО КАК БУДУТ СДЕЛАНЫ ИНДЕКСЫ
	        getObjById: function (id) {
	            for (var i = 0; i < this.count() ; i++) {
	                if (this.get(i).id() == id) return this.get(i);
	            }
	        },

	        // вернуть количество элементов коллекции
	        count: function () {
	            return this._elems.length;
	        },

	        get: function (i) {
	            return this._elems[i]; // TODO проверить диапазон
	        },

	        getDB: function () {
	            return this._db;
	        },

	        getParent: function () {
	            return this._obj;
	        },

	        /**
             * Returns this collection type
             * 
             * @return {Object}
             */
	        getColType: function () {
	            var res;
	            if (this._obj && this._obj.getObjType()) {
	                res = this._obj.getObjType().getColType(this._name);
	                if (res)
	                    res = res.typeObj;
	            }
	            return res;
	        },

			indexOf: function(obj) {
				return this._guidIndex[obj.getGuid()];
			}


	    });
	    return MemCol;
	}
);