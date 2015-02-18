if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./aComponent', '../system/event'],
    function(AComponent,Event) {
        var Dataset = AComponent.extend({

            className: "Dataset",
            classGuid: "3f3341c7-2f06-8d9d-4099-1075c158aeee",
            metaFields: [
                {fname: "Root", ftype: "string"},
                {fname: "Cursor", ftype: "string"},
                {fname: "Active", ftype: "boolean"},
                {fname: "Master", ftype: "string"},
				{fname: "OnMoveCursor", ftype: "event"}
            ],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                this._super(cm,params);
                this.pvt.params = params;
				this.pvt.dataObj = null;
				this.pvt.dataVer = 0; // версия данных (локально)		
				
				this.event = new Event();
				
				// 
				if (this.getObj()) {
					if (this.getObj().get("OnMoveCursor")) {
						this.onMoveCursor = new Function("newVal",this.getObj().get("OnMoveCursor"));
					}
				}				

            },
			
			subsInit: function() {
				var master = this.master(); // подписаться на обновление данных мастер датасета
				// DEBUG
				//master = undefined;
				//END DEBUG
				if (master && this.active()) {
					this.getControlMgr().get(master).event.on({
						type: 'refreshData',
						subscriber: this,
						callback: function(){ this._dataInit(true); } // false вернуть
					});
					this.getControlMgr().get(master).event.on({
						type: 'moveCursor',
						subscriber: this,
						callback: function(){ this._dataInit(false); } // false вернуть
					});
				}
			},
			
			dataInit: function() {
				if (this.active()) this._dataInit(true);
			},
			
			processDelta: function() {
				
				var obj = this.getObj();
				if (obj.isFldModified("Cursor")) {
					console.log("processDelta "+this.id());
					this._setDataObj(this.cursor());
				}
				
				var r=this.getDB().getObj(this.root());
				if (r) {
					if (r.isDataModified()) {
						// данные поменялись
						this.pvt.dataVer++;
					}
				}
				
				this._isProcessed(true);
	
			},
			
			_dataInit: function(onlyMaster) {
				
				if (!this.active()) return;
				function icb() {				
					function refrcb() {
						this.pvt.dataVer++;
						this._initCursor();
						this.event.fire({
							type: 'refreshData',
							target: this				
						});

					}
					that.getControlMgr().userEventHandler(that, refrcb );
				}
			
				
				var rg = this.root();
				var master = this.master();
				// DEBUG
				//master = undefined;
				//END DEBUG
				if (rg) {
					var dataRoot = this.getControlMgr().getDB().getRoot(rg);
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
			},	

			_initCursor: function() {
				//console.log("initCursor "+this.getGuid());
				var rg = this.root();
				if (rg) {
					var dataRoot = this.getControlMgr().getDB().getObj(rg);
					if (dataRoot) {
						var col = dataRoot.getCol("DataElements");
						if (col.count()>0) this.cursor(col.get(0).get("Id")); 
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
					r = this.pvt.dataObj.set(name, value);
					this.event.fire({
						type: 'modFld',
						target: this				
					});						
					return r;
				}
				else
					return undefined;
			},
			
			getDataVer: function() {
				return this.pvt.dataVer;
			},
			
			// были ли изменены данные датасета
			isDataModified: function() {
				var r = this.root();
				if (r) {
					var rootObj = this.getDB().getObj(r);
					if (rootObj)
						return rootObj.isDataModified();
					else
						return true;
				}
				else return true; // TODO можно оптимизировать - если хотим не перерисовывать пустой грид
			},

			// Properties

            root: function (value) {
			
				var oldVal = this._genericSetter("Root");
				var newVal = this._genericSetter("Root", value);
				
				if (newVal!=oldVal) {
					console.log("refreshData in root() "+this.id());
					this.event.fire({
						type: 'refreshData',
						target: this				
						});	
				}
			
                return newVal;
            },

            cursor: function (value) {
				//console.log("Cursor "+this.getGuid()+"  set to "+value);
				var oldVal = this._genericSetter("Cursor");
                var newVal=this._genericSetter("Cursor", value);
				if (newVal!=oldVal) {
					this._setDataObj(value);
					//
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
				/*if (value == undefined) {
					console.log("SET CURSOR TO UNDEF");
				}*/
				//console.log("SET CuRSOR "+value);
				this.pvt.dataObj =  this.getControlMgr().getDB().getObj(this.root()).getCol("DataElements").getObjById(value); // TODO поменять потом
			},

            active: function (value) {
                return this._genericSetter("Active", value);
            },

            master: function (value) {
                return this._genericSetter("Master", value);
            }

        });
        return Dataset;
    }
);