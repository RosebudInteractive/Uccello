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
	        _add: function (obj, index) {

	            this.fire({
	                type: "beforeAdd",
	                target: this,
	                obj: obj
	            });

	            var res_idx = this._elems.length;
	            if (typeof (index) === "number") {
	                if ((index >= 0) && (index <= this._elems.length)) {
	                    for(var guid in this._guidIndex)
	                        if(this._guidIndex[guid] >= index)
	                            this._guidIndex[guid]++;
                        
	                    this._elems.splice(index, 0, obj);
	                    this._guidIndex[obj.getGuid()] = index;
	                    res_idx = index;

                    }
	                else
	                    throw new Error("MemCol::_add: Invalid \"index\" parameter: " +
                            index + ". Allowed range: [0.." + this._elems.length + "].");
	            }
	            else {
	                this._elems.push(obj);
	                this._guidIndex[obj.getGuid()] = res_idx;
	            };

	            if (this._obj.getLog().getActive()) {
	                var mg = (obj.getParent() ? obj.getParent().getGuid() : "");
	                var newObj = this._obj.getDB().serialize(obj);
	                var o = { adObj: newObj, obj: obj, colName: this._name, guid: mg, type: "add" };
	                this._obj.getLog().add(o);
	            }
	            var p = this.getParent();
	            p.logColModif("add", this._name, obj, res_idx);

	            this.fire({
	                type: "add",
	                target: this,
	                obj: obj
	            });

	            if (typeof (obj.onAddToCollection) === "function") {
                    // Информирование объекта о том, что он добавлен в коллекцию
	                obj.onAddToCollection(this, false);
	            };

	            // Генерация событий "addParent" для всех дочерних элементов
	            this._iterateChilds(obj, true, 0, function (add_obj) {
	                if (typeof (add_obj.onAddToCollection) === "function") {
	                    // Информирование объекта о том, что он добавлен в родительскую коллекцию
	                    add_obj.onAddToCollection(add_obj.getParentCol(), true);
	                };
	            });

	            return res_idx;
	        },

	        _del: function (obj) {
	            // TODO временный вариант - необходимо будет сделать нормально как можно быстрее
	            var result;
	            for (var i = 0; i < this._elems.length; i++) {
	                if (this._elems[i] == obj) {
	                    result = i;
	                    this.fire({
	                        type: "beforeDel",
	                        target: this,
	                        obj: obj
	                    });

	                    for (var guid in this._guidIndex)
	                        if (this._guidIndex[guid] > i)
	                            this._guidIndex[guid]--;

	                    this._elems.splice(i, 1);

	                    if (this._obj.getLog().getActive()) { // записать в лог если активен
	                        var oldObj = this._obj.getDB().serialize(obj);
	                        var o = { delObj: oldObj, obj: obj, colName: this._name, guid: obj.getParent().getGuid(), type: "del" };
	                        this._obj.getLog().add(o);
	                    }
	                    this.getDB().onDeleteObject(obj);  // уведомить свою базу данных
	                    var p = this.getParent();
	                    p.logColModif("del", this._name, obj, result);

	                    this.fire({
	                        type: "del",
	                        target: this,
	                        obj: obj
	                    });

	                    // Генерация событий "delParent" для всех дочерних элементов
	                    this._iterateChilds(obj, false, 0, function (del_obj) {
	                        var curr_col = del_obj.getParentCol();
	                        curr_col.fire({
	                            type: "delParent",
	                            target: curr_col,
	                            obj: del_obj
	                        });
	                    });

						delete this._guidIndex[obj.getGuid()];
	                    return result;
	                }
	            }
	        },

	        _iterateChilds: function (obj, isRootFirst, lvl, proc) {
	            if (typeof (proc) === "function") {
	                for (var i = 0; i < obj.countCol() ; i++) {
	                    var childCol = obj.getCol(i);
	                    for (var j = 0; j < childCol.count() ; j++) {
	                        var child = childCol.get(j);
	                        if (isRootFirst)
	                            proc(child);
	                        this._iterateChilds(child, isRootFirst, lvl + 1, proc);
	                    };
                    };
	                if ((!isRootFirst) && (lvl > 0))
	                    proc(obj);
                };
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
			},

			indexOfGuid: function(guid) {
				return this._guidIndex[guid];
			},

			clear: function(){
				for (var i = this._elems.length - 1; i >= 0; i--){
					this._del(this._elems[i])
				}
			}
	    });
	    return MemCol;
	}
);