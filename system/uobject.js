if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../memDB/memMetaObj', '../memDB/memObj', '../memDB/memMetaObjFields','../memDB/memMetaObjCols'],
    function(MemMetaObj, MemObj, MemMetaObjFields, MemMetaObjCols) {
        var UObject = MemObj.extend({

            className: "UObject",
            classGuid: UCCELLO_CONFIG.classGuids.UObject,
            metaFields: [],
            metaCols: [],

            /**
             * @constructs
             * @param cm {ControlMgr} - менеджер контролов, к которому привязан данный контрол
             * @param params
             */
            init: function(cm, params){

				if (!("pvt" in this)) this.pvt = {};
			
				this._buildMetaInfo(cm);
                if (params==undefined) return; // в этом режиме только создаем метаинфо			

				params.ini = params.ini ? params.ini : {};
				if (!("colName" in params))
					var col = "Children";
				else col = params.colName;
				// если рутовый то указываем db
				if (params.parent===undefined) {
					// корневой компонент
					//this.pvt.obj = new MemObj(cm.getDB().getObj(this.classGuid),{db: cm.getDB(), mode: "RW"}, params.ini);
					//var parent = {db: cm.getDB(), mode: "RW"};
					var parent = {db: cm, mode: "RW"};
				}
				else {
					// компонент с парентом
					//this.pvt.obj = new MemObj(cm.getDB().getObj(this.classGuid),{obj: params.parent.getObj(), "colName": col}, params.ini);
					parent = {obj: params.parent, "colName": col};
				}
                UccelloClass.super.apply(this, [cm.getObj(this.classGuid),parent,params.ini]);
                //this.pvt = {};
                this.pvt.controlMgr = cm;
                this.pvt.isProcessed = true; // признак обработки входящей дельты

            },
			/*
			uobjectInit: function(cm, params){
			
				if (!("pvt" in this)) this.pvt = {};
			
				this._buildMetaInfo(cm);
                if (params==undefined) return; // в этом режиме только создаем метаинфо			

				params.ini = params.ini ? params.ini : {};
				if (!("colName" in params))
					var col = "Children";
				else col = params.colName;
				// если рутовый то указываем db
				if (params.parent===undefined)
					var parent = {db: cm, mode: "RW"};
				else
					parent = {obj: params.parent, "colName": col};

				this.memobjInit(cm.getObj(this.classGuid),parent,params.ini);
                this.pvt.controlMgr = cm;
                this.pvt.isProcessed = true; // признак обработки входящей дельты
			},*/

            // no op function - имплементируется в наследниках для подписки
            // порядок вызова: 1) init (конструктор), 2) subsInit (подписка), 3) dataInit (дальнейшая инициализация, в основном данные)
            subsInit: function() {
            },

            // no op function - имплементируется по мере необходимости в наследниках
            dataInit: function() {
            },

            // no op function - имплементируется по мере необходимости в наследниках
            processDelta: function() {
            },

            /**
             * Cоздает метаинформацию своего класса в базе данных db
             * @param db
             */
            _buildMetaInfo: function(db){
                if (!db.getObj(this.classGuid)) {
                    var obj = Object.getPrototypeOf(this), gobj="";
                    if (obj.className != "UObject")
                        gobj = db.getObj(Object.getPrototypeOf(obj).classGuid).getGuid();
                    //var obj2 = Object.getPrototypeOf(obj);
                    // TODO parentClass передавать гуидом либо именем.
                    var c =  new MemMetaObj({db: db}, {fields: {typeName: this.className, parentClass: gobj},$sys: {guid: this.classGuid}});
                    for (var i=0; i<this.metaFields.length; i++)
                        new MemMetaObjFields({"obj": c}, {fields: this.metaFields[i]});
                    for (i=0; i<this.metaCols.length; i++)
                        new MemMetaObjCols({"obj": c}, {fields: this.metaCols[i]});
                    db._buildMetaTables();
                }
            },

            getClassGuid: function() {
                return this.classGuid;
            },

            getClassName: function() {
                return this.className;
            },

            /**
             * Возвращает компонент того же контролМенеджера по его гуиду
             */
			 // TODOR2 удалить - дублирует getObj
            getComp: function(guid) {
				//return this.getObj(guid)
                return this.pvt.controlMgr.get(guid);
            },

            /**
             * Возвращает объект-модуль текущего объекта или undefined если модуля нет 
             */			
			getModule: function() {
				var obj = this.getRoot();
				if (obj.isModule())
					return obj;
				else
					return undefined;
			},

			 /*
            getParent: function() {
                if (this.getObj().getParent() == null)
                    return null
                else
                    return this.pvt.controlMgr.getByGuid(this.getObj().getParent().getGuid());
            },*/
			
			countChild: function(colName) {
				if (colName == undefined) colName = "Children";
				//var col = this.getObj().getCol(colName);
				var col = this.getCol(colName);
				if (col == undefined) return undefined;
				else return col.count();
			},
			
			getChild: function(i,colName) {
				if (colName == undefined) colName = "Children";
				//var col = this.getObj().getCol(colName);
				var col = this.getCol(colName);
				if (col == undefined) return undefined;
				else return this.getControlMgr().get(col.get(i).getGuid());				
			},


            getControlMgr: function() {
                return this.pvt.controlMgr;
            },

            _delChild: function(colName, obj) {
                //this.getObj().getCol(colName)._del(obj);
				this.getCol(colName)._del(obj);
            },

            // метаинформация (properties)
			// TODOR2 убрать двойственность
            countProps: function() {
				return this.countFields();
            },
			// TODOR2 убрать двойственность
            getPropName: function(i) {
                if (i>=0 && i<this.countFields())
					return this.getFieldName(i);
            },
			// TODOR2 убрать двойственность
            getPropType: function(i) {
                if (i>=0 && i<this.countFields())
					return this.getFieldType(i);
            },
			
			isModule: function() { 
				if (this.getParent())
					return false;
				else 
					return true;
			},
			
            /**
             * Возвращает true если модуль в режиме MASTER и false если в режиме SLAVE
             */			
			isMaster: function() {
				return this.getControlMgr().isMaster();
				//return this.isMaster();
				
			},
			
            /**
             * Удаленный вызов метода
			 * @param func - имя удаленной функции
             * @param aparams - массив параметров удаленной функции
			 * @callback cb - коллбэк
             */			
			remoteCall: function(func, aparams, cb) {
				if (this.getModule().isMaster()) {
					// TODO кинуть исключение
					return;
				}
				var socket = this.getControlMgr().getSocket();
				//var pg = this.getObj().getDB().getProxyMaster().guid;
				var pg = this.getControlMgr().getProxyMaster().guid;
				//var pg = this.getProxyMaster().guid;
							
				var myargs = { masterGuid: pg,  objGuid: this.getGuid(), aparams:aparams, func:func };
				var args={action:"remoteCall2",type:"method",args: myargs};
				socket.send(args,cb);
			},


            /**
             * Выставления признака isProcess для ProcessDelta
			 * @param value - true | false установить призна isProcessed
             */			
			
            _isProcessed: function(value) {
                if (value === undefined)
                    return this.pvt.isProcessed;
                if (value)
                    this.pvt.isProcessed = true;
                else
                    this.pvt.isProcessed = false;
                return this.pvt.isProcessed;
            },

            /**
             * сеттер-геттер свойств по умолчанию (дженерик) - используется если нет дополнительной логики в свойствах
			 * @params kind "MASTER" - только на мастере
             */

            _genericSetter: function(fldName,fldVal, kind) {
                //console.log(fldName, fldVal, this.getObj())
                if (fldVal!==undefined) {
                    //var val=this.getObj().get(fldName);
					////var val=this.get(fldName);
                   ////if (val!=fldVal) {
						if (this.isMaster() || !(kind=="MASTER"))
						    this.set(fldName, fldVal, true);
							//this.pvt.obj.set(fldName,fldVal);
						else if (DEBUG) console.log("ERROR SET PROP"); // TODO заменить на exception
                    ////}
                }
				return this.get(fldName);
                //return this.pvt.obj.get(fldName);
            }

        });
        return UObject;
    }
);