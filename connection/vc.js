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
				this.pvt.isVisible = false;
				this.pvt.vcrCounter = 0;
			},

			/**
			 * Активировать контекст
			 * @param params {object}
			 * @callback cb
			 * @renderRoot - содержит колбэк для рендеринга
			 */
			on: function(cm, params,cb, renderRoot, onServer) {
				if (this.isOn()) {
					var guids = this.pvt.cm.getRootGuids("res")
					this.pvt.cm.initRender(guids);
					if (!onServer) this.renderAll();
					cb(guids);
					return;
				}
				this.pvt.cdb = null;


				if (params == undefined) return;

				var controller = cm.getController();
				this.pvt.proxyServer = params.proxyServer;
				this.pvt.proxyWfe = params.proxyWfe;
				this.pvt.constructHolder = params.constructHolder;
				this.pvt.renderRoot = renderRoot;
				this.pvt.formParams = {};
				this.pvt.memParams = [];
				this.pvt.socket = params.socket;
				this.pvt.cmsys = cm;

				var that = this;
				if (onServer) {// если нет колбэка значит на сервере - но это надо поменять TODO
					//var createCompCallback = function (obj) {
					// подписаться на событие завершения applyDelta в контроллере, чтобы переприсвоить параметры 
					controller.event.on({
						type: 'end2ApplyDeltas',
						subscriber: that,
						callback: that._setFormParams
					});

					var createCompCallback = function (typeObj, parent, sobj) {


						//var timeStart = perfomance.now();
						var obj =  that.createComponent.apply(that, [typeObj, parent, sobj]);
						//var timeEnd = perfomance.now() - timeStart;
						//logger.info('createComponent;'+timeEnd);

						// TODOR2 переделать в соответствии с новыми реалиями
						if (obj.getTypeGuid() == UCCELLO_CONFIG.classGuids.FormParam) { // Form Param
							obj.event.on({
								type: "mod", // TODO не забыть про отписку
								subscriber: that,
								callback: that._onModifParam
							});

							if (!that.pvt.formParams[obj.name()])  // добавить в список параметров
								that.pvt.formParams[obj.name()] = [];
							that.pvt.formParams[obj.name()].push(obj);

						}
						
						return obj;
					}
						
				}
				else
					createCompCallback = function (typeObj, parent, sobj) {
						if (sobj.$sys.typeGuid == UCCELLO_CONFIG.classGuids.DataCompany) {
							if (!that.timeDataCompany)
								that.timeDataCompany = 0;
							if (DEBUG)
								var start = performance.now();
						}

						var comp =  that.createComponent.apply(that, [typeObj, parent, sobj]);

						if (false) {
							if (sobj.$sys.typeGuid == UCCELLO_CONFIG.classGuids.DataCompany) {
								var end = performance.now();
								var time = end - start;
								that.timeDataCompany += time;
								console.log('timeOneDataCompany', time);
								console.log('timeAllDataCompany', that.timeDataCompany);
							}
						}

						return comp;
					}
				
				if (this.isMaster()) { // главная (master) TODO разобраться с KIND
					this.pvt.cm = this.pvt.cdb = this.createDb(controller,{name: "VisualContextDB", kind: "master"});
					// подписываемся на добавление нового рута
					this.pvt.cdb.event.on( {
						type: "newRoot",
						subscriber: this,
						callback: this.onNewRoot
					});
					this.pvt.cdb.setDefaultCompCallback(createCompCallback);
					
					
					function cb3(res) {
						that.dataBase(that.pvt.cdb.getGuid());
						that.contextGuid(that.getGuid());
						that.pvt.isOn = true;
						if (that.pvt.renderRoot) that.pvt.isVisible = true;	
						if (cb) cb(res);
					}

					if (onServer)
						this.getContextCM().getRoots(params.formGuids, { rtype: "res" },cb3);
					else {
						var cm2 = that.getContextCM();
						cm2.userEventHandler(cm2,cm2.getRoots, [params.formGuids, { rtype: "res"  },cb3]);
					}
					    			

				}
				else { // подписка (slave)			
					guid = this.dataBase();
					function cb2(res) {
						that.pvt.isOn = true;
						if (that.pvt.renderRoot) that.pvt.isVisible = true;
						cb(res);
					}

					var dbp = {name:"Slave"+guid, proxyMaster : { connect: params.socket, guid: guid}};
					
					this.pvt.cdb = this.pvt.cm = new ControlMgr( { controller: controller, dbparams: dbp}, that,that.pvt.socket, function(){
						that.pvt.cdb.setDefaultCompCallback(createCompCallback);
						var forms = params.formGuids;
						if (forms == null) forms = "all";
						else if (forms == "") forms = [];
						// that.getContentDB().subscribeRoots(forms, cb2, createCompCallback);
						var cm2 = that.getContextCM();
						cm2.userEventHandler(cm2,cm2.getRoots, [forms, { rtype: "res"  },cb2]);
					},this.pvt.proxyServer);

				}
				// TODO!!! TEMPO
				if (!onServer /*cb*/) { // подписываемся только на клиенте
					this.pvt.cm.event.on({
						type: 'endTransaction',
						subscriber: this,
						callback: function(args) { that.allDataInit(); that.renderAll(); }
					});
				}
				
			},

			// выключить контекст
			// TODO пока работает только для SLAVE
			off: function(cb) {
				var that = this;
				function cb2() {
					that.pvt.isOn = false;
					that.pvt.isVisible = false;
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
					controller.delDataBase(this.getContentDB().getGuid(), cb);
				}
				else cb();
			},

			/**
			 * Возвращает true если контекст активен
			 */
			isOn: function() {
				return this.pvt.isOn;
			},

			/**
			 * Возвращает true если контекст активен и рендерится в DOM
			 */
			isVisible: function() {
				return this.pvt.isVisible;
			},

			// меняет "видимость" у активного контекста, если он включен, если выключен ничего не делает
			setVisible: function(renderRoot) {
				if (!this.isOn()) return false;
				this.pvt.renderRoot = renderRoot;
				if (renderRoot === undefined) this.pvt.isVisible = true;
				else this.pvt.isVisible = false;
				return true;
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
				this.getContextCM().getController().genDeltas(this.getContentDB().getGuid());
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
				this.getContentDB().resetModifLog();
			},

			getContentDB: function() {
				return this.pvt.cdb;
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
					var db = this.getContentDB();
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