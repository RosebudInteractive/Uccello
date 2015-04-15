if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['../memDB/memMetaObj', '../memDB/memObj', '../memDB/memMetaObjFields','../memDB/memMetaObjCols'],
    function(MemMetaObj, MemObj, MemMetaObjFields, MemMetaObjCols) {
        var UObject = Class.extend({

            className: "UObject",
            classGuid: "3b02ef32-83b7-e470-ec5c-f6605e46e9dc",
            metaFields: [],
            metaCols: [],

            /**
             * @constructs
             * @param cm {ControlMgr} - менеджер контролов, к которому привязан данный контрол
             * @param params
             */
            init: function(cm, params){
                this.pvt = {};
                this.pvt.controlMgr = cm;
                this.pvt.isProcessed = true; // признак обработки входящей дельты
                this._buildMetaInfo(cm.getDB());

                if (params==undefined) return; // в этом режиме только создаем метаинфо
                if (params.objGuid!==undefined) {
                    this.pvt.obj = cm.getDB().getObj(params.objGuid);
                    //cm.add(this);
                }
                else {
                    //  создать новый объект
                    if (!("colName" in params))
                        var col = "Children";
                    else col = params.colName;

                    params.ini = params.ini ? params.ini : {};

                    // если рутовый то указываем db
                    if (params.parent===undefined) {
                        // корневой компонент
                        this.pvt.obj = new MemObj(cm.getDB().getObj(this.classGuid),{db: cm.getDB(), mode: "RW"}, params.ini);
                        this.pvt.parent = null;
                    }
                    else {
                        // компонент с парентом
                        this.pvt.obj = new MemObj(cm.getDB().getObj(this.classGuid),{obj: params.parent.getObj(), "colName": col}, params.ini);
                        this.pvt.parent = params.parent;
                    }

                }
                cm.add(this);
            },

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

            /**
             * Возвращает локальный идентификатор
             */
            getLid: function() {
                return this.pvt.obj.getLid();

            },

            getGuid: function() {
                return this.pvt.obj.getGuid();
            },

            getClassGuid: function() {
                return this.classGuid;
            },

            getClassName: function() {
                return this.className;
            },

            getObj: function() {
                return this.pvt.obj;
            },

            getDB: function() {
                return this.pvt.obj.getDB();
            },

            /**
             * Возвращает компонент того же контролМенеджера по его гуиду
             */
			 
            getComp: function(guid) {
                return this.pvt.controlMgr.get(guid);
            },

            /**
             * Возвращает корневой компонент для данного
             */
            getRoot: function() {
                return this.pvt.controlMgr.get(this.pvt.obj.getRoot().getGuid());
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


            /**
             * Возвращает родительский элемент или нулл
             */
            getParent: function() {
                if (this.getObj().getParent() == null)
                    return null
                else
                    return this.pvt.controlMgr.getByGuid(this.getObj().getParent().getGuid());
            },
			
			countChild: function(colName) {
				if (colName == undefined) colName = "Children";
				var col = this.getObj().getCol(colName);
				if (col == undefined) return undefined;
				else return col.count();
			},
			
			getChild: function(i,colName) {
				if (colName == undefined) colName = "Children";
				var col = this.getObj().getCol(colName);
				if (col == undefined) return undefined;
				else return this.getControlMgr().get(col.get(i).getGuid());				
			},
			/*addControl = function(guid, ini, cm) {
                if (!cm) cm = myApp.controlMgr;
                if (!ini) ini = {fields: {"Id": 99, "Name": "Name99", "Left":"300", "Top":"150"}};

                var rootCont = null;
                var gl = cm._getCompGuidList();
                for (var f in gl)
                    if (gl[f].getClassName() == "Container") { rootCont=gl[f]; break; }

                var control = new typeGuids[guid](cm, {parent: rootCont, colName: "Children", ini:ini }, {parent:'#result'});
                myApp.controller.genDeltas(cm.getDB().getGuid());
                renderControls(cm);
            }*/
			/*addChild: function(typeGuid, ini, colName) {
				if (colName == undefined) colName = "Children";
				var col = this.getObj().getCol(colName);
				if (col == undefined) return undefined;
				col._add(
			},*/

            getControlMgr: function() {
                return this.pvt.controlMgr;
            },

            _delChild: function(colName, obj) {
                this.getObj().getCol(colName)._del(obj);
            },

            // метаинформация (properties)

            countProps: function() {
                return this.pvt.obj.countFields();
            },

            getPropName: function(i) {
                if (i>=0 && i<this.pvt.obj.countFields())
                    return this.pvt.obj.getFieldName(i);
            },

            getPropType: function(i) {
                if (i>=0 && i<this.pvt.obj.countFields())
                    return this.pvt.obj.getFieldType(i);
            },
			
			isModule: function() { 
				if (this.pvt.parent)
					return false;
				else 
					return true;
				//return false;
			},
			
            /**
             * Возвращает true если модуль в режиме MASTER и false если в режиме SLAVE
             */			
			isMaster: function() {
				// Пользуемся ассоциировнной БД, чтобы понять в каком режиме модуль
				// Можно, теоретически, запоминять состояние - когда будем создавать БД внутри модуля
				// то этим гарантируется когерентность состояния MASTER/SLAVE у модуля и у его базы
				return this.getObj().getDB().isMaster();
				
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
				var pg = this.getObj().getDB().getProxyMaster().guid;
							
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
                    var val=this.getObj().get(fldName);
                   if (val!=fldVal) {
						if (this.isMaster() || !(kind=="MASTER"))
							this.pvt.obj.set(fldName,fldVal);
						else if (DEBUG) console.log("ERROR SET PROP"); // TODO заменить на exception
                    }
                }

                return this.pvt.obj.get(fldName);
            }

        });
        return UObject;
    }
);