if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['uobject'],
    function(UObject) {
        var UModule = UObject.extend({

            className: "UModule",
            classGuid: UCCELLO_CONFIG.classGuids.UModule,
            metaFields: [{fname:"Mode",ftype:"string"}], // Srv, CltSrv, Clt, CltRep
            metaCols: [{"cname": "Resources", "ctype": "control"}],

            /**
             * @constructs
             * @param cm {ControlMgr} - менеджер контролов, к которому привязан данный модуль ( ?? Модуль может быть сам контролМенеджером!)
             * @param params
			 * @param params.db - база данных, в которой живут данные модуля
			 * @callback cb - коллбэк, который вызывается после отработки конструктора (асинхронный в случае slave)
             */
            init: function(cm, params, cb){
                this._super(cm,params);
				
				// запомнить базу данных
				if ("db" in params) 
					this.pvt.db = params.db
				else
					if (cm != null)
						this.pvt.db = cm.getDB();
					else {
						this.pvt.db = null;
						return; // TODO exception
					}
				
				
				if ( ) { // TODO УСЛОВИЕ НА МАСТЕР
					
				}
				else { // SLAVE
					
				}
				
				
            },

            mode: function(value) {
                return this._genericSetter("Mode",value);
            }

        });
        return UModule;
    }
);