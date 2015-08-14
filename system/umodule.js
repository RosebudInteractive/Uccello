if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./uobject'],
    function(UObject) {
        var UModule = UObject.extend({

            className: "UModule",
            classGuid: UCCELLO_CONFIG.classGuids.UModule,
            metaFields: [ {fname:"Id",ftype:"int"}, {fname:"Name",ftype:"string"}, {fname:"Mode",ftype:"string"}], // Srv, CltSrv, Clt, CltRep
            //metaCols: [{"cname": "Resources", "ctype": "UObject"}],

            /**
             * @constructs
             * @param cm {ControlMgr} - менеджер контролов, к которому привязан данный модуль ( ?? Модуль может быть сам контролМенеджером!)
             * @param params
			 * @param params.db - база данных, в которой живут данные модуля
			 * @callback cb - коллбэк, который вызывается после отработки конструктора (асинхронный в случае slave)
             */
            init: function(cm, params, cb){
                UccelloClass.super.apply(this, [cm, params]);
				if (!(cm && params)) return;
				
				// запомнить базу данных
				// TODO в будущем модуль должен сам создавать свою базу данных
				
				if (params && ("db" in params)) 
					this.pvt.mydb = params.db
				else
					if (cm != null)
						this.pvt.mydb = cm.getDB();
					else {
						this.pvt.mydb = null;
						return; // TODO exception
					}
				
				//if (cm.getRoot())
				//	this.pvt.rootGuid = cm.getRoot().getGuid(); // запомнить гуид корневого объекта бд, ассоциированного с модулем
				/*
				if ( ) { // TODO УСЛОВИЕ НА МАСТЕР
					
				}
				else { // SLAVE
					
				}
				*/
				
				
            },
			
            /**
             * Возвращает true если модуль в режиме MASTER и false если в режиме SLAVE
             */			
			isMaster: function() {
				// Пользуемся ассоциировнной БД, чтобы понять в каком режиме модуль
				// Можно, теоретически, запоминять состояние - когда будем создавать БД внутри модуля
				// то этим гарантируется когерентность состояния MASTER/SLAVE у модуля и у его базы
				return this.pvt.mydb.isMaster();
				
			},
			
			/*
			
			isModule: function() { // перекрывает аналогичную ф-ци в предке, которая возвращает false
				return true;
			},*/
			

			
			id: function(value) {
				return this._genericSetter("Id",value);
			},

			name: function(value) {
				return this._genericSetter("Name",value);
			},

            mode: function(value) {
                return this._genericSetter("Mode",value);
            }

        });
        return UModule;
    }
);