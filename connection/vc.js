if (typeof define !== 'function') {
	var define = require('amdefine')(module);
	var Class = require('class.extend');
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
			metaCols: [{cname: "Resources", ctype: "control"}],

			/**
			 * Инициализация объекта
			 * @constructs
			 * @param params {object}
			 */
			init: function(cm, params,cb) {
				this._super(cm, params, cb);
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
			on: function(cm, params,cb, renderRoot) {
				if (this.isOn()) {
					this.pvt.cm.initRender();
					cb(this.pvt.cm.getRootGuids("res"));
					return;
				}
				this.pvt.cdb = null;
				this.pvt.tranQueue = null; // очередь выполнения методов если в транзакции
				this.pvt.inTran = false; // признак транзакции

				if (params == undefined) return;

				var controller = cm.getController();
				this.pvt.proxyServer = params.proxyServer;
				this.pvt.constructHolder = params.constructHolder;
				this.pvt.renderRoot = renderRoot;
				this.pvt.formParams = {};
				this.pvt.memParams = [];
				this.pvt.socket = params.socket;

				var that = this;
				if (!cb) // если нет колбэка значит на сервере - но это надо поменять TODO
					//var createCompCallback = function (obj) {
					var createCompCallback = function (typeObj, parent, sobj) {

						// подписаться на событие завершения applyDelta в контроллере, чтобы переприсвоить параметры 
						controller.event.on({
							type: 'end2ApplyDeltas',
							subscriber: that,
							callback: that._setFormParams
						});

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

							if (!that.pvt.formParams[obj.get("Name")])  // добавить в список параметров
								that.pvt.formParams[obj.get("Name")] = [];
							that.pvt.formParams[obj.get("Name")].push(obj);

						}
						
						return obj;
						
					}
				else
					createCompCallback = function (typeObj, parent, sobj) {
						if (sobj.$sys.typeGuid == UCCELLO_CONFIG.classGuids.DataCompany) {
							if (!that.timeDataCompany)
								that.timeDataCompany = 0;
							var start = performance.now();
						}

						var comp =  that.createComponent.apply(that, [typeObj, parent, sobj]);

						if (sobj.$sys.typeGuid == UCCELLO_CONFIG.classGuids.DataCompany) {
							var end = performance.now();
							var time = end - start;
							that.timeDataCompany += time;
							console.log('timeOneDataCompany', time);
							console.log('timeAllDataCompany', that.timeDataCompany);
						}

						return comp;
						// that.createComponent.apply(that, [obj, that.pvt.cm]);
					}
				this.pvt.compCallback = createCompCallback;

				if (this.getModule().isMaster()) { // главная (master) TODO разобраться с KIND
					this.pvt.cdb = this.createDb(controller,{name: "VisualContextDB", kind: "master"});
					// подписываемся на добавление нового рута
					this.pvt.cdb.event.on( {
						type: "newRoot",
						subscriber: this,
						callback: this.onNewRoot
					});

					this.loadNewRoots(params.formGuids, { rtype: "res", compcb: createCompCallback },cb);
					this.dataBase(this.pvt.cdb.getGuid());
					this.contextGuid(this.getGuid());
					this.pvt.isOn = true;
					if (this.pvt.renderRoot) this.pvt.isVisible = true;
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
						var forms = params.formGuids;
						if (forms == null) forms = "all";
						else if (forms == "") forms = [];
						that.getContentDB().subscribeRoots(forms, cb2, createCompCallback);
					});
				}
				this.pvt.cdb.setDefaultCompCallback(createCompCallback);
			},

			/**
			 * Добавить ресурсы в контекст
			 * @params resGuids - массив гуидов ресурсов (явный)
			 * @callback cb
			 */
			addNewResRoots: function(resGuids, cb) {
				function cbtest(res) { console.log(res); cb(res); }
				if (!this.isOn()) return false;
				if (this.getModule().isMaster())
					this.loadNewRoots(resGuids, { rtype: "res", compcb: this.pvt.compCallback}, cb); //function (res) { console.log(res); cb(res); } );
				else this.getContentDB().subscribeRoots(resGuids, cbtest, this.pvt.compCallback);
				return true;
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
				if (!this.getModule().isMaster()) {
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
					var pn = obj.get("Name");
					for (var j=0; j<this.pvt.formParams[pn].length; j++) {
						var obj2 = this.pvt.formParams[pn][j];
						if (obj2.get("Kind")=="in") obj2.set("Value",obj.get("Value"));
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
				var cm = this.pvt.cm = new ControlMgr( { controller: dbc, dbparams: params },this,this.pvt.socket);
				cm.buildMetaInfo('content');
				/*var ctrls = UCCELLO_CONFIG.controls;
				for (var i in ctrls) {
					var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath :UCCELLO_CONFIG.controlsPath;
					var comp = require(path + ctrls[i].component);
					new comp(cm);
				}*/
				return cm;
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
					var override = true;

					function icb(r) {
						var res = that.getContentDB().addRoots(r.datas, params.compcb, params.subDbGuid, override);
						if (cb) cb({guids:res});
					}

					if (params.rtype == "res") {
						override = false;
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
					params.subDbGuid = this.getContentDB().getGuid();
					this.remoteCall('loadNewRoots', [rootGuids, params],cb);
				}
			},


			createComponent: function(typeObj, parent, sobj) {

				var params = {ini: sobj, parent: parent.obj, colName: parent.colName};
				return new (this.pvt.constructHolder.getComponent(typeObj.getGuid()).constr)(this.getContextCM(), params);
			},

			renderAll: function(pd) {
				var ga = this.pvt.cm.getRootGuids()
				for (var i=0; i<ga.length; i++) {
					var root = this.pvt.cm.get(ga[i]);
					this.pvt.cm.render(root, this.pvt.renderRoot(ga[i]), pd);
				}
				this.getContentDB().resetModifLog();
			},

			renderForms: function(roots, pd) {
				for (var i=0; i<roots.length; i++) {
					// TODO отсеять лишние руты, сделать проверку на данные
					var root = this.pvt.cm.get(roots[i]);
					this.pvt.cm.render(root, this.pvt.renderRoot(roots[i]), pd);
				}
				this.getContentDB().resetModifLog();
			},

			getContentDB: function() {
				return this.pvt.cdb;
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
					var found = false, title = result.target.get('Title');
					var col = this.getCol('Resources');
					for(var i= 0, len=col.count(); i<len; i++) {
						if (title == col.get(i).get('Title'))
							found = true;
					}
					var id = ++this.pvt.vcrCounter;
					if (found || !title) title += id;

					var vcResource = new Vcresource(this.getControlMgr(), {parent: this, colName: "Resources",  ini: { fields: { Id: id, Name: 'vcr'+id, Title:title, ResGuid:result.target.getGuid() } }});
					var db = this.getContentDB();
					db.getController().genDeltas(db.getGuid());
				}
			},

			getConstructorHolder: function() {
				return this.pvt.constructHolder;
			}

		});

		return VisualContext;
	});