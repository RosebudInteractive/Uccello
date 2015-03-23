if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль контекста
 * @module VisualContext2
 */
define(
    ['../controls/aComponent', '../controls/aControl', '../controls/controlMgr', '../system/uobject',],
    function(AComponent, AControl, ControlMgr, UObject) {

        var Interfvc = {
            className: "Interfvc",
            classGuid: "2a164568-4e44-4c50-bfe8-faae7f8f2e69",

            loadNewRoots: "function"
            //loadRoot: "function"
        }
					 
        var VisualContext2 = AComponent.extend(/** @lends module:VisualContext2.VisualContext2.prototype */{

            className: "VisualContext2",
            classGuid: UCCELLO_CONFIG.classGuids.VisualContext2,
			metaFields: [
				{fname: "DataBase", ftype: "string"}, // runtime - гуид БД данных на сервере
				{fname: "Kind", ftype: "string"}, // , fdefault: "master" enum (master,slave
				{fname: "MasterGuid", ftype: "string"}, // УБРАТЬ? GUID MASTER DATABASE данных контекста (на севере) - READONLY для SLAVE
				{fname: "ContextGuid", ftype: "string"} // GUID контекста - можно будет удалить
			],
			metaCols: [],

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
				if ("db" in this.pvt) {
					this.pvt.cm.setToRendered(false);
					cb(this.pvt.db.getRootGuids("res"));
					return;
				}
				this.pvt.db = null;
				this.pvt.tranQueue = null; // очередь выполнения методов если в транзакции
				this.pvt.inTran = false; // признак транзакции
				
                if (params == undefined) return;
				
				this.pvt.typeGuids = params.typeGuids;
				var controller = cm.getDB().getController();
				//this.pvt.rpc = params.rpc;
				this.pvt.proxyServer = params.proxyServer;
				this.pvt.components = params.components;
				this.pvt.renderRoot = params.renderRoot;
				this.pvt.formParams = {};
				this.pvt.memParams = [];
				
				this.pvt.socket = params.socket;
				

				var that = this;	
				var createCompCallback = null;
				if (!cb) // если нет колбэка значит на сервере - но это надо поменять TODO
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
				else
					createCompCallback = function (obj) {
						//var rootGuid = obj.getRoot().getGuid();
						that.createComponent.apply(that, [obj, that.pvt.cm]);													 
					}				
					
				if (this.getModule().isMaster()) { // главная (master) TODO разобраться с KIND				
					//this.pvt.vcproxy = params.rpc._publ(this, Interfvc);
					var params2 = {name: "VisualContextDB", kind: "master", cbfinal:cb};
					if (createCompCallback)
						params2.compcb = createCompCallback;
					this.pvt.db = this.createDb(controller,params2);
					this.pvt.cm = new ControlMgr(this.getDB(),null,this,this.pvt.socket);
					this.loadNewRoots(params.formGuids, { rtype: "res", compcb: params2.compcb},params2.cbfinal);
					this.dataBase(this.pvt.db.getGuid());
					this.contextGuid(this.getGuid());
				}
				else { // подписка (slave)			
					//this.pvt.vcproxy = params.rpc._publProxy(params.vc, params.socket,Interfvc);
					//var guid = this.masterGuid();
					guid = this.dataBase();

					this.pvt.db = controller.newDataBase({name:"Slave"+guid, proxyMaster : { connect: params.socket, guid: guid}}, function(){
                            // подписываемся либо на все руты либо выборочно formGuids
							that.pvt.cm = new ControlMgr(that.getDB(),null,that,that.pvt.socket);
							var forms = params.formGuids;
							if (forms == null) forms = "all";
							else if (forms == "") forms = [];
                            that.getDB().subscribeRoots(forms, cb, createCompCallback);
						});
				}
				this.pvt.db.setDefaultCompCallback(createCompCallback);	
			},
			
			// выключить контекст
			off: function() {
			
			},

           /**
             * Обработчик изменения параметра
             */
			_onModifParam: function(ev) {
				this.pvt.memParams.push(ev.target);
			},

			// отрабатывает только на сервере
			_setFormParams: function(ev) {
				for (var i=0; i<this.pvt.memParams.length; i++) {
					var obj = this.pvt.memParams[i];
					var pn = obj.get("Name");
					for (var j=0; j<this.pvt.formParams[pn].length; j++) {
						var obj2 = this.pvt.formParams[pn][j];
						if (obj2.get("Kind")=="in") obj2.set("Value",obj.get("Value"));
					}
				}
				this.pvt.memParams = [];
				this.getDB().getController().genDeltas(this.getDB().getGuid());
			},

			/**
			 * Создать базу данных - ВРЕМЕННАЯ ЗАГЛУШКА!
			 * @param dbc
			 * @param options
			 * @returns {object}
			 */
			createDb: function(dbc, options){
				var db = dbc.newDataBase(options);

				// meta
				var cm = new ControlMgr(db, null /*roots[0]*/);
                new UObject(cm);
				new AComponent(cm); new AControl(cm);

				// другие компоненты
				var ctrls = UCCELLO_CONFIG.controls;
				for (var i in ctrls) {
					var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath :UCCELLO_CONFIG.controlsPath;
					var comp = require(path + ctrls[i].component);
					new comp(cm);
				}

				return db;
			},
	
			
			// "транзакции" для буферизации вызовов методов
			tranStart: function() {
				if (this.pvt.inTran) return;
				this.pvt.inTran = true;
				this.pvt.tranQueue = [];
			},
			
			tranCommit: function() {
				if (this.pvt.inTran) {
					for (var i=0; i<this.pvt.tranQueue.length; i++) {
						var mc = this.pvt.tranQueue[i];
						mc.method.apply(mc.context,mc.args);
					}
					this.pvt.tranQueue = null;
					this.pvt.inTran = false;
				}
			},
			
			inTran:function() {
				return this.pvt.inTran;
			},
			
			//
			execMethod: function(context, method,args) {
				if (this.inTran()) 
					this.pvt.tranQueue.push({context:context, method:method, args: args});
				else method.apply(context,args);
			},
			
			// добавляем новый набор данных - мастер-слейв варианты
			// params.rtype = "res" | "data"
			// params.compcb - только в случае ресурсов (может использоваться дефолтный)
			// params.expr - выражение для данных
			loadNewRoots: function(rootGuids,params, cb) {
				var that = this;
				if (this.getModule().isMaster()) {
				
					function icb(r) {
							
							var res = that.getDB().addRoots(r.datas, params.compcb, params.subDbGuid);
							if (cb) cb({guids:rootGuids});
					}
								
					if (params.rtype == "res") {
						this.pvt.proxyServer.loadResources(rootGuids, icb);	
						return "XXX";
					}
					if (params.rtype == "data") {
						this.pvt.proxyServer.queryDatas(rootGuids, params.expr, icb);
						return "XXX";
					}
				}
				else { // slave
					// вызываем загрузку нового рута у мастера
					this.remoteCall('loadNewRoots', [rootGuids, params],cb);
				}
			},
			
			
            createComponent: function(obj, cm) {
                var g = obj.getTypeGuid();
				var className = cm.getDB().getObj(g).get("typeName");
                var params = {objGuid: obj.getGuid()};

                // DbNavigator выбор базы
                if (g == "38aec981-30ae-ec1d-8f8f-5004958b4cfa") {
                    params.dbSelector = [{'guid':this.getDB().getGuid(), 'name':'Пользовательская БД'}, {'guid':uccelloClt.getSysDB().getGuid(), 'name':'Системная БД'}];
                }

				new (this.getComponent(className).module)(cm, params);
            },
			
			getComponent: function(className){
				return this.pvt.components[className];
			},
			
			renderAll: function(pd) {
				var ga = this.pvt.cm.getRootGuids()
				for (var i=0; i<ga.length; i++)
					this.pvt.cm.render(this.pvt.cm.get(ga[i]), this.pvt.renderRoot(ga[i]), pd);
				this.getDB().resetModifLog();
			},
			
			renderForms: function(roots, pd) {
				for (var i=0; i<roots.length; i++)
						this.pvt.cm.render(this.pvt.cm.get(roots[i]), this.pvt.renderRoot(roots[i]),pd);
				this.getDB().resetModifLog();
			},

            /**
             * отписать контекст от мастера
             * @callback cb - коллбэк для вызова после отработки отписки
             */			
			dispose: function(cb) {			
				if (!this.getModule().isMaster()) { //this.kind()=="slave") {
					var controller = this.getControlMgr().getDB().getController();
					controller.delDataBase(this.pvt.db.getGuid(), cb);
				}
				else cb();
			},			

			getDB: function() {
				return this.pvt.db;
			},

			getContentDB: function() {
				return this.pvt.db;
			},
			
			getContextCM: function() {
				return this.pvt.cm;
			},
			
			getSocket: function() {
				return this.pvt.socket;
			},

			dataBase: function (value) {
				return this._genericSetter("DataBase", value);
			},

			kind: function (value) {
				return this._genericSetter("Kind", value);
			},

			masterGuid: function (value) {
				return this._genericSetter("MasterGuid", value, "MASTER");
			},

			contextGuid: function (value) {
				return this._genericSetter("ContextGuid", value, "MASTER");
			}
			
        });

        return VisualContext2;
    });