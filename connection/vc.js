if (typeof define !== 'function') {
	var define = require('amdefine')(module);
	var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль контекста
 * @module VisualContext2
 */
define(
	['../controls/aComponent', '../controls/aControl', '../controls/controlMgr', '../system/uobject', './vcresource'],
	function(AComponent, AControl, ControlMgr, UObject, Vcresource) {

		var VisualContext = AComponent.extend(/** @lends module:VisualContext.VisualContext.prototype */{

			className: "VisualContext",
			classGuid: UCCELLO_CONFIG.classGuids.VisualContext,
			metaFields: [
				{fname: "DataBase", ftype: "string"}, // runtime - гуид БД данных на сервере
				{fname: "Kind", ftype: "string"}, // , fdefault: "master" enum (master,slave
				{fname: "ContextGuid", ftype: "string"} // GUID контекста - можно будет удалить
			],
			metaCols: [{cname: "Resources", ctype: "UObject"}],

			/**
			 * Инициализация объекта
			 * @constructs
			 * @param params {object}
			 */
			init: function(cm, params,cb) {
				UccelloClass.super.apply(this, [cm, params, cb]);
				this.pvt.isOn = false;
				//this.pvt.isVisible = false;
				this.pvt.vcrCounter = 0;
			},

			/**
			 * Активировать контекст
			 * @param params {object}
			 * @callback cb
			 * @renderRoot - содержит колбэк для рендеринга
			 */
			on: function(cm, params,cb, renderRoot, onServer) {
				var p = this.pvt;
				if (this.isOn()) {
					var guids = this.pvt.cm.getRootGuids("res")
					p.cm.initRender(guids);
					if (!onServer) this.renderAll();
					cb(guids);
					return;
				}

				if (params == undefined) return;

				var controller = cm.getController();
				p.proxyServer = params.proxyServer;
				p.proxyWfe = params.proxyWfe;
				p.constructHolder = params.constructHolder;
				p.renderRoot = renderRoot;
				p.formParams = {};
				p.memParams = [];
				p.socket = params.socket;
				p.cmsys = cm;
				p.onServer = onServer;

				var that = this;
				if (onServer) {
					// подписаться на событие завершения applyDelta в контроллере, чтобы переприсвоить параметры 
					controller.event.on({
						type: 'end2ApplyDeltas',
						subscriber: that,
						callback: that._setFormParams
					});

					var createCompCallback = function (typeObj, parent, sobj) {
						var obj =  that.createComponent.apply(that, [typeObj, parent, sobj]);
						if (obj.getTypeGuid() == UCCELLO_CONFIG.classGuids.FormParam) { // Form Param
							obj.event.on({
								type: "mod", // TODO не забыть про отписку
								subscriber: that,
								callback: that._onModifParam
							});
							if (!p.formParams[obj.name()])  // добавить в список параметров
								p.formParams[obj.name()] = [];
							p.formParams[obj.name()].push(obj);
						}
						return obj;
					}
				}
				else
					createCompCallback = function (typeObj, parent, sobj) { return that.createComponent.apply(that, [typeObj, parent, sobj]); }
				
				if (this.isMaster()) { 
					p.cm = this.createDb(controller,{name: "VisualContextDB", kind: "master"});
					// подписываемся на добавление нового рута
					p.cm.event.on( {
						type: "newRoot",
						subscriber: this,
						callback: this.onNewRoot
					});
					p.cm.setDefaultCompCallback(createCompCallback);
									
					function cb3(res) {
						that.dataBase(p.cm.getGuid());
						that.contextGuid(that.getGuid());
						p.isOn = true;	
						if (!onServer) that.allDataInit();
						p.cm.tranCommit();
						if (cb) cb(res);
					};					
					function gr() {
						p.cm.tranStart();
						p.cm.getRoots(params.formGuids, { rtype: "res"  }, cb3);
					};
					if (onServer) gr();
					else p.cm.userEventHandler(p.cm,gr, []); //cm2.userEventHandler(cm2,cm2.getRoots, [params.formGuids, { rtype: "res"  },cb3]);
				}
				else { // подписка (slave)			
					guid = this.dataBase();
					function cb2(res) {
						if (!onServer) that.allDataInit();
						p.isOn = true;
						cb(res);
					}

					var dbp = {name:"Slave"+guid, proxyMaster : { connect: params.socket, guid: guid}};
					
					p.cm = new ControlMgr( { controller: controller, dbparams: dbp}, that,p.socket, function(){
						p.cm.setDefaultCompCallback(createCompCallback);
						var forms = params.formGuids;
						if (forms == null) forms = "all";
						else if (forms == "") forms = [];
						//var cm2 = that.getContextCM();
						p.cm.userEventHandler(p.cm,p.cm.getRoots, [forms, { rtype: "res"  },cb2]);
					},this.pvt.proxyServer);

				}
				if (!onServer) { // подписываемся только на клиенте
					this.pvt.cm.event.on({
						type: 'commit',
						subscriber: this, // processDelta вызываем только если транзакция "внешняя" (+ на клиенте, на сервере не подписаны)
						callback: function(args) {  if (args.external) p.cm.processDelta(); that.renderAll(); }
					});
				}
				
			},

			// выключить контекст
			// TODO пока работает только для SLAVE
			off: function(cb) {
				var that = this;
				function cb2() {
					that.pvt.isOn = false;
					if ((cb !== undefined) && (typeof cb == "function")) cb();
				}
				this._dispose(cb2);
			},

			/**
			 * отписать контекст от мастера
			 * @callback cb - коллбэк для вызова после отработки отписки
			 */
			_dispose: function(cb) {
				if (!this.isMaster()) {
					var controller = this.getControlMgr().getController();
					controller.delDataBase(this.getContextCM().getGuid(), cb);
				}
				else cb();
			},

			/**
			 * Возвращает true если контекст активен
			 */
			isOn: function() {
				return this.pvt.isOn;
			},
			
			isOnServer: function() {
				return this.pvt.onServer;
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
					var pn = obj.name();
					for (var j=0; j<this.pvt.formParams[pn].length; j++) {
						var obj2 = this.pvt.formParams[pn][j];
						if (obj2.kind()=="in") obj2.value(obj.value());
					}
				}
				this.pvt.memParams = [];
				this.getContextCM().getController().genDeltas(this.getContextCM().getGuid());
			},

			/**
			 * Создать базу данных - ВРЕМЕННАЯ ЗАГЛУШКА!
			 * @param dbc
			 * @param params
			 * @returns {object}
			 */
			createDb: function(dbc, params){
				var cm = this.pvt.cm = new ControlMgr( { controller: dbc, dbparams: params },this,this.pvt.socket,undefined, this.pvt.proxyServer);
				cm.buildMetaInfo('content');
				return cm;
			},

			isWorkFlowMethod: function (action, args) {
			    return false;
			    //return this.pvt.proxyWfe !== undefined;
			},

			execWorkFlowMethod: function (action, local_context, local_method, args) {
			    if (! this.isWorkFlowMethod(action, args))
			        local_method.apply(local_context, args);
			    else
			        this._invokeWorkFlowMethod(action, args);
			},

			_invokeWorkFlowMethod: function (action, args) {
			    if (this.pvt.proxyWfe) {
			        var self = this;
			        this.pvt.proxyWfe.startProcessInstanceAndWait("8349600e-3d0e-4d4e-90c8-93d42c443ab3", "Request1", 100000, function (result) {
			            console.log("Start Process [" + result.processID + "] result: " + result.result);
			            if (result.result === "OK") {
			                var responceObj = {
			                    processID: result.requestInfo.processID,
			                    requestID: result.requestInfo.requestID,
			                    tokenID: result.requestInfo.tokenID,
			                    response: {}
			                };
			                var fargs = args[0];
			                var keys = Object.keys(fargs);
			                keys.forEach(function (el) {
			                    responceObj.response[el] = fargs[el];
			                });
			                self.pvt.proxyWfe.submitResponseAndWait(responceObj, "Request2", 1000000, function (result) {
			                    console.log("Submit Response: " + result.result);

			                    if (result.result === "OK") {
			                        if (typeof args[args.length - 1] === "function")
			                            args[args.length - 1]();
			                        var responceObj = {
			                            processID: result.requestInfo.processID,
			                            requestID: result.requestInfo.requestID,
			                            tokenID: result.requestInfo.tokenID,
			                            response: { result: true }
			                        };
			                        self.pvt.proxyWfe.submitResponse(responceObj, function (result) {
			                            console.log("Submit Response 2: " + result.result);
			                        });
			                    };
			                });
			            }
			        });
			    };
			},

			loadNewRoots: function(rootGuids,params, cb) {
				this.getContextCM().getRoots(rootGuids,params, cb);
			},

			createComponent: function(typeObj, parent, sobj) {

				var params = {ini: sobj, parent: parent.obj, colName: parent.colName};
				return new (this.pvt.constructHolder.getComponent(typeObj.getGuid()).constr)(this.getContextCM(), params);
			},
			
			allDataInit: function() {
				var roots = this.pvt.cm.getRootGuids("res");
				for (var i=0; i<roots.length; i++) {
					var root = this.pvt.cm.get(roots[i]);
					this.pvt.cm.allDataInit(root);
				}				
			},

			renderAll: function() {
				
				var ga = this.pvt.cm.getRootGuids("res");
				this.renderForms(ga);
			},

			renderForms: function(roots) {
			    //if (DEBUG) console.log("%c RENDER FORMS " + pd, 'color: green');
				for (var i=0; i<roots.length; i++) {
					var root = this.pvt.cm.get(roots[i]);
					if (this.pvt.renderRoot)
						var renderItem = this.pvt.renderRoot(roots[i]);
					else renderItem = null;
					if (root)
						this.pvt.cm.render(root,renderItem);
				}
				this.getContextCM().resetModifLog();
			},

			getSysCM: function() {
				return this.pvt.cmsys;
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

			contextGuid: function (value) {
				return this._genericSetter("ContextGuid", value, "MASTER");
			},

			onNewRoot: function(result){

				if (result.target.getObjType().getGuid() == UCCELLO_CONFIG.classGuids.Form) {
					// ищем по Title и добавляем id если найден для уникальности
					var found = false, title = result.target.title();
					var col = this.getCol('Resources');
					for(var i= 0, len=col.count(); i<len; i++) {
						if (title == col.get(i).title())
							found = true;
					}
					var id = ++this.pvt.vcrCounter;
					if (found || !title) title += id;

					var vcResource = new Vcresource(this.getControlMgr(), {parent: this, colName: "Resources",  ini: { fields: { Id: id, Name: 'vcr'+id, Title:title, ResGuid:result.target.getGuid() } }});
					var db = this.getContextCM();
					db.getController().genDeltas(db.getGuid());
					var dbSys = this.getSysCM();
					dbSys.getController().genDeltas(dbSys.getGuid());
				}
			},

			getConstructorHolder: function() {
				return this.pvt.constructHolder;
			}

		});

		return VisualContext;
	});