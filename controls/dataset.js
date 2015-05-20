if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./aComponent', '../system/event'],
    function(AComponent,Event) {
        var Dataset = AComponent.extend({

            className: "Dataset",
            classGuid: UCCELLO_CONFIG.classGuids.Dataset,
            metaFields: [
                {fname: "Root", ftype: "string"},
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
                this._super(cm,params);
				if (!params) return;
                this.pvt.params = params;
				this.pvt.dataObj = null;
				this.pvt.dataVer = 0; // версия данных (локально)		

				if (this.get("OnMoveCursor"))
					this.onMoveCursor = new Function("newVal", this.get("OnMoveCursor"));

            },
			
			subsInit: function() {
				var master = this.master(); // подписаться на обновление данных мастер датасета

				if (master && this.active()) {
					//this.getControlMgr().get(master).event.on({
				    master.event.on({
				        type: 'refreshData',
						subscriber: this,
						callback: function(){ this._dataInit(false); } 
					});
					//this.getControlMgr().get(master).event.on({
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

				if (this.isFldModified("Cursor")) 
					this._setDataObj(this.cursor());
								
				var r=this.getDB().getObj(this.root());
				if (r) {
					if (r.isDataModified()) {
						// данные поменялись
						this.pvt.dataVer++;
					}
				}
				
				// TODO RFDS изменение root или rootInstance !
				
				this._isProcessed(true);
	
			},
			
			_dataInit: function(onlyMaster) {
				
				if (!this.active()) return;
				function icb(res) {		
					function refrcb() {
						this.pvt.dataVer++;
						this.rootInstance(res.guids[0]);
						console.log("ROOT INSTANCE SET TO ");
						console.log(res);
						console.log(this.rootInstance());
						this._initCursor();
						this.event.fire({
							type: 'refreshData',
							target: this				
						});

					}
					
					that.getControlMgr().userEventHandler(that, refrcb );
				}
			
				//debugger;
				// TODO RFDS
				// rootGuid
				var rg = this.root();
				var rgi = this.rootInstance();
				var master = this.master();
				// RFDS NEW
				if (rg) {
					var dataRoot = this.getControlMgr().getRoot(rg);
					if (!dataRoot || !onlyMaster) {
						if (onlyMaster && master) return; // если НЕ мастер, а детейл, то пропустить
						var that = this;
						var params = {rtype:"data"};
						if (master) { // если детейл, то экспрешн
							//params.expr = this.getControlMgr().get(master).getField("Id");
							params.expr = master.getField("Id");
                        }
						if (rgi)
						  var rgp = rgi;
						else rgp = rg;
						this.getControlMgr().getContext().loadNewRoots([rgp],params, icb);

					}
					else this._initCursor();
				}
				/*
				if (rg) {
					var dataRoot = this.getControlMgr().getRoot(rg);
					if (!dataRoot || !onlyMaster) {
						if (onlyMaster && master) return; // если НЕ мастер, а детейл, то пропустить
						var that = this;
						var params = {rtype:"data"};
						if (master) { // если детейл, то экспрешн
							params.expr = this.getControlMgr().get(master).getField("Id");
						}
						this.getControlMgr().getContext().loadNewRoots([rg],params, icb);

					}
					else this._initCursor();
				}
				*/
			},	

			_initCursor: function() {
			    //var rg = this.root();
			    var rg = this.rootInstance();
				if (rg) {
					var dataRoot = this.getDB().getObj(rg);
					if (dataRoot) {
						var col = dataRoot.getCol("DataElements");
						if (!dataRoot.getCol("DataElements").getObjById(this.cursor())) {
							if (col.count()>0) this.cursor(col.get(0).id()); // установить курсор в новую позицию (наверх)
						}
						else this._setDataObj(this.cursor()); // 
					}
				}
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
				//return 
				var obj=  db.addObj(db.getObj(this.objtype()),parent,flds);
				
				this.event.fire({ // TODO другое событие сделать
							type: 'modFld',
							target: this				
						});
				return obj;
			},
			
			getDataVer: function() {
				return this.pvt.dataVer;
			},
			
			// были ли изменены данные датасета
			isDataModified: function() {
				var r = this.root();
				if (r) {
					var rootObj = this.getDB().getObj(r);
					//var rootObj = this.getComp(r);
					if (rootObj)
						return rootObj.isDataModified();
					else
						return true;
				}
				else return true; // TODO можно оптимизировать - если хотим не перерисовывать пустой грид
			},

			initRender: function() {
				this.pvt.dataVer = 0;
			},

			// Properties

            root: function (value) {
			
				var oldVal = this._genericSetter("Root");
				var newVal = this._genericSetter("Root", value);
				
				if (newVal!=oldVal) {
					//console.log("refreshData in root() "+this.id());
					this.event.fire({
						type: 'refreshData',
						target: this				
						});	
				}
			
                return newVal;
            },
			
            rootInstance: function (value) {
               var val = this._genericSetter("RootInstance", value);
			   console.log("SET ROOT INSTANCE "+this.name()+" "+val);
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
				//this.pvt.dataObj =  this.getDB().getObj(this.root()).getCol("DataElements").getObjById(value); // TODO поменять потом
			    this.pvt.dataObj = this.getDB().getObj(this.rootInstance()).getCol("DataElements").getObjById(value); // TODO поменять потом
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