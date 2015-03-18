if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль контекста
 * @module VisualContext2
 */
define(
    ['./visualContextinfo'],
    function(VisualContextInfo) {

        var Interfvc = {
            className: "Interfvc",
            classGuid: "ed318f95-fc97-be3f-d54c-1ad707f0996c",

            loadNewRoots: "function"
            //loadRoot: "function"
        }
					 
        var VisualContext2 = VisualContextInfo.extend(/** @lends module:VisualContext2.VisualContext2.prototype */{

            className: "VisualContext2",
            classGuid: UCCELLO_CONFIG.classGuids.VisualContext2,
            metaFields: [],

             /**
             * Инициализация объекта
             * @constructs
             * @param params {object} 
             */
            init: function(cm, params,cb) {
                this._super(cm, params, cb);
            },
			
			// включить контекст
			on: function(cm, params,cb) {
				this.pvt.cmgs = {};
				this.pvt.db = null;
				this.pvt.tranQueue = null; // очередь выполнения методов если в транзакции
				this.pvt.inTran = false; // признак транзакции

                if (params == undefined) return;
				
				this.pvt.typeGuids = params.typeGuids;
				var controller = cm.getDB().getController();
				this.pvt.rpc = params.rpc;
				this.pvt.proxyServer = params.proxyServer;
				this.pvt.components = params.components;
				this.pvt.config = params.config;
				this.pvt.renderRoot = params.renderRoot;
				this.pvt.formParams = {};
				this.pvt.memParams = [];

				var that = this;	
				var createCompCallback = null;
				if (cb)
					createCompCallback = function (obj) {
						var rootGuid = obj.getRoot().getGuid();
						if (!(that.pvt.cmgs[rootGuid]))
							that.pvt.cmgs[rootGuid] = new ControlMgr(that.getDB(),rootGuid,that);
						that.createComponent.apply(that, [obj, that.pvt.cmgs[rootGuid]]);						
						 
					}
				else // пока что считаем, что если нет финального колбэка - мы на сервере
					createCompCallback = function (obj) { 
						if (obj.getTypeGuid() == UCCELLO_CONFIG.classGuids.FormParam) { // Form Param
							obj.event.on({ 
								type: "mod", // TODO не забыть про отписку
								subscriber: that,
								callback: that._onModifParam
							});
							
							if (!that.pvt.formParams[obj.get("Name")])  // добавить в список параметров
								that.pvt.formParams[obj.get("Name")] = [];
							that.pvt.formParams[obj.get("Name")].push(obj);
						
						}
						// подписаться на событие завершения applyDelta в контроллере, чтобы переприсвоить параметры 
						controller.event.on({
							type: 'end2ApplyDeltas',
							subscriber: that,
							callback: that._setFormParams
						});					
					}
					
				if (false) { // главная (master) TODO разобраться с KIND
					this.pvt.vcproxy = params.rpc._publ(this, Interfvc);
					var params2 = {name: "VisualContextDB", kind: "master", cbfinal:cb};
					if (createCompCallback)
						params2.compcb = createCompCallback;
					this.pvt.db = this.createDb(controller,params2);
					this.loadNewRoots(params.formGuids, { rtype: "res", compcb: params2.compcb},params2.cbfinal);
					this.dataBase(this.pvt.db.getGuid());
				}
				else { // подписка (slave)
				
					this.pvt.vcproxy = params.rpc._publProxy(params.vc, params.socket,Interfvc);
					var guid = this.masterGuid();

					this.pvt.db = controller.newDataBase({name:"Slave"+guid, proxyMaster : { connect: params.socket, guid: guid}}, function(){
                            // подписываемся либо на все руты либо выборочно formGuids
							var forms = params.formGuids;
							if (forms == null) forms = "all";
							else if (forms == "") forms = [];
                            that.getDB().subscribeRoots(forms, cb, createCompCallback);
							that.dataBase(that.getDB().getGuid());
						});
				}
				this.pvt.db.setDefaultCompCallback(createCompCallback);

				this.contextGuid(this.getGuid());			
			},
			
			// выключить контекст
			off: function() {
			
			},

            dataBase: function (value) {
                return this._genericSetter("DataBase", value);
            },
			
			kind: function (value) {
                return this._genericSetter("Kind", value);
            },
			
			masterGuid: function (value) {
                return this._genericSetter("MasterGuid", value);
            },

			contextGuid: function (value) {
                return this._genericSetter("ContextGuid", value);
            }
        });

        return VisualContext2;
    });