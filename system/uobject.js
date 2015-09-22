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
                if (params===undefined) return; // в этом режиме только создаем метаинфо

				params.ini = params.ini ? params.ini : {};
				if (!("colName" in params))
					var col = "Children";
				else col = params.colName;
				// если рутовый то указываем db
				if (params.parent===undefined)  // корневой объект
					var parent = {db: cm, mode: "RW"};
				else // объект с парентом 
					parent = {obj: params.parent, "colName": col};

                UccelloClass.super.apply(this, [cm.getObj(this.classGuid),parent,params.ini]);

                this.pvt.controlMgr = cm;
                this.pvt.isProcessed = false; // признак обработки входящей дельты

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
             * Creates class meta-info (including all parents) in memDB
             *
             * @param {Object} db memDB
             * @private
             */
            _buildMetaInfo: function (db) {
                var parents = [];
                var obj = Object.getPrototypeOf(this);
                while ((obj !== null) && obj.hasOwnProperty("className")
                                    && obj.hasOwnProperty("classGuid")) {
                    parents.unshift(obj);
                    obj = Object.getPrototypeOf(obj);
                };

                if ((parents.length == 0) || parents[0].className != "UObject")
                    throw Error("Incorrect inheritance chain in the class \"" + this.className + "\".");

                var is_base = true;
                while (parents.length > 0) {
                    this._buildClassMetaInfo(db, parents.shift(), is_base);
                    is_base = false;
                };
            },

            /**
             * Creates only [class_info] class meta-info in memDB
             *
             * @param {Object}  db memDB
             * @param {Object}  class_info class definition
             * @param {Boolean} is_base indicates if [class_info] is base class
             * @private
             */
            _buildClassMetaInfo: function (db, class_info, is_base) {
                if (!db.getObj(class_info.classGuid)) {
                    var gobj = "";
                    if (!is_base)
                        gobj = db.getObj(Object.getPrototypeOf(class_info).classGuid).getGuid();
                    //var obj2 = Object.getPrototypeOf(obj);
                    // TODO parentClass передавать гуидом либо именем.
                    var c = new MemMetaObj({ db: db }, { fields: { typeName: class_info.className, parentClass: gobj }, $sys: { guid: class_info.classGuid } });

                    if (class_info.hasOwnProperty("metaFields"))
                        for (var i = 0; i < class_info.metaFields.length; i++)
                            new MemMetaObjFields({ "obj": c }, { fields: class_info.metaFields[i] });

                    if (class_info.hasOwnProperty("metaCols"))
                        for (i = 0; i < class_info.metaCols.length; i++)
                            new MemMetaObjCols({ "obj": c }, { fields: class_info.metaCols[i] });

                    db._buildMetaTables();
                }
            },

            getClassGuid: function () {
                return this.classGuid;
            },

            getClassName: function() {
                return this.className;
            },

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
			
            /**
             * Возвращает true если модуль в режиме MASTER и false если в режиме SLAVE
             */			
			isMaster: function() {
				return this.getControlMgr().isMaster();
				
			},
			
            /**
             * Удаленный вызов метода на сервере
			 * @param func - имя удаленной функции
             * @param aparams - массив параметров удаленной функции
			 * @callback cb - коллбэк
             */		
			 remoteCall: function(func, aparams, cb) {
				this.getControlMgr().remoteCallPlus(this.getGuid(),func,aparams,cb);
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