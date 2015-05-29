if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent', '../system/event'],
    function(AComponent,Event) {
        var Dataset = AComponent.extend({

            className: "Dataset",
            classGuid: UCCELLO_CONFIG.classGuids.Dataset,
            metaFields: [
                {
                    fname: "Root", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.DataRoot,
                        res_elem_type: UCCELLO_CONFIG.classGuids.DataRoot
                    }
                },
				{fname: "RootInstance", ftype: "string"},
                {fname: "Cursor", ftype: "string"},
                {fname: "Active", ftype: "boolean"},
                {
                    fname: "Master", ftype: {
                        type: "ref",
                        res_elem_type: UCCELLO_CONFIG.classGuids.Dataset
                    }
                },
				{fname: "OnMoveCursor", ftype: "event"},
				{fname: "ObjType", ftype: "string"}
            ],
			metaCols: [ {"cname": "Fields", "ctype": "DataField"}],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
				if (!params) return;
                this.pvt.params = params;
				this.pvt.dataObj = null;	

				if (this.get("OnMoveCursor"))
					this.onMoveCursor = new Function("newVal", this.get("OnMoveCursor"));

            },
			
			subsInit: function() {
				var master = this.master(); // подписаться на обновление данных мастер датасета

				if (master && this.active()) {
				    master.event.on({
				        type: 'refreshData',
						subscriber: this,
						callback: function(){ this._dataInit(false); } 
					});
				    master.event.on({
				        type: 'moveCursor',
						subscriber: this,
						callback: function(){ this._dataInit(false); } 
					});
				}
			},
			
			dataInit: function() {
				if (this.active()) this._dataInit(true);
			},
			
			processDelta: function() {

				if (this.isFldModified("Cursor")) this._setDataObj(this.cursor());
				
				this._isProcessed(true);
	
			},
			
			_dataInit: function(onlyMaster) {
				
				if (!this.active()) return;
				function icb(res) {		
					function refrcb() {
						var dataRoot = this.getDB().getObj(res.guids[0]);
						if (dataRoot)
						    this.root(dataRoot);
						this._initCursor(true);
						this.getDB().tranCommit();
					}
					
					that.getControlMgr().userEventHandler(that, refrcb );
				}

				var dataRoot = this.root();
				var rg = this.getSerialized("Root", true).guidRes; // R2305 почему guidRes, а не guidElem
				
				//var rgi = dataRoot ? dataRoot.getGuid() : null; 
				// R2305 инстанс все время загружается новые ветки, а должны быть те же самые
				var rgi = dataRoot ? dataRoot.getGuid() : this.getSerialized("Root", false).guidInstanceRes;

				var master = this.master();
				if (rg) {
					if (!dataRoot || !onlyMaster) {
						if (onlyMaster && master) return; // если НЕ мастер, а детейл, то пропустить
						var that = this;
						var params = {rtype:"data"};
						if (master) { // если детейл, то экспрешн
							params.expr = master.getField("Id");
                        }
						if (rgi)
						  var rgp = rgi;
						else rgp = rg;
						//console.log("%cCALL LOADNEWROOTS "+rgp+" Params: "+params.expr, 'color: red');
						this.getDB().tranStart();
						this.getControlMgr().getContext().loadNewRoots([rgp],params, icb);

					}
					else this._initCursor();
				}
			},	

			// forceRefresh - возбудить событие даже если курсор "не двигался" - это нужно для случая загрузки данных
			_initCursor: function(forceRefresh) {
				var dataRoot = this.root();
				if (dataRoot) {
					var col = dataRoot.getCol("DataElements");
					if (!dataRoot.getCol("DataElements").getObjById(this.cursor())) {
					    if (col.count() > 0) this.cursor(col.get(0).id()); // установить курсор в новую позицию (наверх)
					}
					else {
						this._setDataObj(this.cursor());
						if (forceRefresh) this.event.fire({type: 'refreshData', target: this });
					}
				};
			},

			getField: function(name) {
				if (this.pvt.dataObj)
					return this.pvt.dataObj.get(name);
				else
					return undefined;
				
			},

			setField: function(name, value) {
				if (this.pvt.dataObj) {
					var vold = this.pvt.dataObj.get(name);
					var nameLow = name.charAt(0).toLowerCase() + name.slice(1);
					this.pvt.dataObj[nameLow](value);
					if (value!=vold) // если значение действительно изменено, то возбуждаем событие
						this.event.fire({
							type: 'modFld',
							target: this				
						});
				}
			},
			
            /**
             *  добавить новый объект в коллекцию
             * @param flds - поля объекта для инициализации
             */
			addObject: function(flds) {
				var db = this.getDB();
				var dataRoot = db.getRoot(this.root()).obj;
				var parent = {obj:dataRoot, colName: "DataElements"};

				var obj=  db.addObj(db.getObj(this.objtype()),parent,flds);
				
				this.event.fire({ // TODO другое событие сделать
							type: 'modFld',
							target: this				
						});
				return obj;
			},
			
			// были ли изменены данные датасета
			isDataSourceModified: function() {
				var rootObj = this.root();
				if (rootObj)  return (rootObj.isDataModified());
				else return true; // TODO можно оптимизировать - если хотим не перерисовывать пустой грид
			},

			// Properties

            root: function (value) {
			
				var oldVal = this._genericSetter("Root");
				var newVal = this._genericSetter("Root", value);			
                return newVal;
            },
			
            rootInstance: function (value) {
               var val = this._genericSetter("RootInstance", value);
			   return val;
            },

            cursor: function (value) {
				var oldVal = this._genericSetter("Cursor");
                var newVal=this._genericSetter("Cursor", value);
				if (newVal!=oldVal) {
					this._setDataObj(value);
					if ("onMoveCursor" in this) this.onMoveCursor(newVal);

					this.event.fire({
						type: 'moveCursor',
						target: this				
					});	
				}

				return newVal;
            },
			
			// установить "курсор" на внутренний объект dataobj
			_setDataObj: function(value) {
			    this.pvt.dataObj = this.root().getCol("DataElements").getObjById(value); // TODO поменять потом
			},

            active: function (value) {
                return this._genericSetter("Active", value);
            },

            master: function (value) {
                return this._genericSetter("Master", value);
            },

			objtype: function (value) {
                return this._genericSetter("ObjType", value);
            }

        });
        return Dataset;
    }
);