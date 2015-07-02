if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['../memDB/memDataBase', './viewset', '../system/utils'],
	function(MemDataBase, ViewSet, Utils) {
		var ControlMgr = MemDataBase.extend({

            /**
             * @constructs
             * @param dbinit {MemDataBase} - база данных
			 * @param dbinit.controller
			 * @param dbinit.dbparams
			 * @param 
			 * @param vc - контекст менеджера
             */
			init: function(dbinit, vc, socket, cb){

				UccelloClass.super.apply(this, [dbinit.controller, dbinit.dbparams, cb]);

				this.pvt.compByLid = {};
				this.pvt.compByGuid = {};
				this.pvt.compByName = {};				
				this.pvt.subsInitFlag = {};
				this.pvt.dataInitFlag = {};
				this.pvt.rootGuids = {};
				this.pvt.vc = vc;
				this._isNode = typeof exports !== 'undefined' && this.exports !== exports;

				this.pvt.tranQueue = null; // очередь выполнения методов если в транзакции
				this.pvt.inTran = false; // признак транзакции
				
				this.pvt.execQ = [];
				this.pvt.execTr = {};
				this.pvt.memTranIdx = 0;

				if (socket)
					this.pvt.socket = socket;
				else
					if (vc)
						this.pvt.socket = vc.getSocket();
				this.pvt.viewSets = [this.createViewSet(UCCELLO_CONFIG.viewSet)];
                this.pvt.asd = true;

				this.event.on( {

					type: "newRoot",
					subscriber: this,
					callback: this.onNewRoot
				});
                    
			},

           /**
			 * Инициализация подписки - делается 1 раз при загрузке нового ресурса
             * @param component {AComponent} - корневой элемент
             */				
			subsInit: function(component) {
				component.subsInit();
				for (var j=0, countCol=component.countCol(); j<countCol ; j++) {
					var col = component.getCol(j);
					for (var i=0, cnt=col.count(); i<cnt; i++)
						this.subsInit(col.get(i));
				}
			},

           /**
			 * Инициализация данных - делается 1 раз при загрузке нового ресурса
             * @param component {AComponent} - корневой элемент
             */				
			dataInit: function(component) {
				component.dataInit();
				for (var j = 0, countCol=component.countCol() ; j < countCol ; j++) {
					var col = component.getCol(j);
					for (var i=0, cnt=col.count(); i<cnt; i++) 
						this.dataInit(col.get(i));
				}
			},

            /**
			 * Добавить компонент component в список менеджера контролов
             * @param component {AComponent} - добавляемый компонент
             */			
			add: function(component) {
				this.pvt.compByLid[component.getLid()] = component;
				this.pvt.compByGuid[component.getGuid()] = component;
				if (("name" in component) && component.name())
					this.pvt.compByName[component.name()] = component;
				if (!component.getParent()) {// корневой элемент
					this.pvt.rootGuids[component.getGuid()] = component;
				}
			},


            /**
			 * Удалить компонент из менеджера контролов
             * @param guid
             */
			del: function(guid) {
				var c = this.get(guid);
				delete this.pvt.compByLid[c.getLid()];
				delete this.pvt.compByGuid[c.getGuid()];
				if (c.getParent())
					c.getParent()._delChild(c.getColName(),c);
				else
					delete this.pvt.rootGuids[c.getGuid()];
			},
			
			delRootObjects: function(rootGuid) {
				
			},
			

            /**
             * Переместить контрол
             * @param guid
             */
            move: function(guid, parentGuid) {
				if (DEBUG)
					console.log('заглушка перемещения контрола: '+guid+' в '+parentGuid)
            },

			// временно
			_getCompGuidList: function() {
				return this.pvt.compByGuid;
			},
			

            /**
			 * Вернуть контекст, в котором создан менеджер контролов
             */					
			getContext: function() {
				return this.pvt.vc;
			},

			getSocket: function() {
				return this.pvt.socket;
			},
			
            /**
			 * Вернуть массив рутовых гуидов
             */		
			getRootGuidsTmp: function() {
				var guids = [];
				for (var g in this.pvt.rootGuids)
					guids.push(g);
				return guids;	
			},
			
			getGuid: function() {
				return this.pvt.guid;
			},

            /**
			 * Вернуть компонент по его гуид
             */			
			get: function(guid) {
				return this.pvt.compByGuid[guid];
			},

            /**
			 * вернуть по имени
             */				
			getByName: function(name) {
				return this.pvt.compByName[name];
			},
			
			
			processDelta: function() { // ВРЕМЕННЫЙ ВАРИАНТ
				// TODO оптимизировать: пробегать только те контролы, в которых имплементирован processDelta
				for (var g in this.pvt.compByGuid) {
					var c = this.pvt.compByGuid[g];
					if (!c._isProcessed()) c.processDelta(); 
				}
				// сбросить признак isProcessed
				for (var g in this.pvt.compByGuid) this.pvt.compByGuid[g]._isProcessed(false);
			},

            /**
			 * Рендеринг компонентов интерфейса
			 *  @param component - корневой (обязательно) элемент, с которого запускается рендеринг
             */				
			render: function(component, options, pd) {
			
				if (!this.pvt.subsInitFlag[component.getGuid()]) {
					this.subsInit(component);  // если не выполнена постинициализация, то запустить
					this.pvt.subsInitFlag[component.getGuid()] = true;
				}
				if (!this.pvt.dataInitFlag[component.getGuid()]) {
					this._tranStart(true);
					this.dataInit(component);
					this._tranCommit();
					this.pvt.dataInitFlag[component.getGuid()] = true;
				}
				
				if (pd) this.processDelta();
			
                for(var i in this.pvt.viewSets)
					if (this.pvt.viewSets[i].enable())
						this.pvt.viewSets[i].render(component, options);

				this.setToRendered(component,true);
			},
			
			setToRendered: function(component, val) {
				if (component == undefined) return;
			
				if ("_isRendered" in component) component._isRendered(val);
				var col=component.getCol("Children");
                if (col == undefined) return;
                for (var i=0; i<col.count(); i++) 
					this.setToRendered(col.get(i),val);

            },

			
			// переинициализация рендера
			initRender: function(rootGuids) {
				
				for (var i=0; i<rootGuids.length; i++)
					this.setToRendered(this.get(rootGuids[i]), false);
				
				// TODO обход рекурс
				for (var g in this.pvt.compByGuid) { 
					if ("initRender" in this.pvt.compByGuid[g])
						this.pvt.compByGuid[g].initRender();			// выставляем флаг рендеринга
				}					
			
			},

			onDeleteComponent: function(result) {
				delete this.pvt.compByGuid[result.target.getGuid()];
			},
			
			onNewRoot: function(result) {
				if (this.pvt.rootGuids[result.target.getGuid()] ) {
						this.getRoot(result.target.getGuid()).event.on({
							type: "delObj",
							subscriber: this,
							callback: this.onDeleteComponent
                    });	
				}
				
			},

            createViewSet: function(ini) {
                return new ViewSet(this, ini);
            },

            /**
             * Стартовать транзакцию контрол-менеджера - используется для буферизации удаленных вызовов
             * @param dbTran - true|false - нужно ли открывать транзакцию БД
             */
			_tranStart: function(dbTran) {
				if (this.pvt.inTran) return;
				this.pvt.inTran = true;
				this.pvt.tranQueue = [];
				if (dbTran)
					this.tranStart();
			},

			_tranCommit: function() {
				if (this.pvt.inTran) {
					for (var i=0; i<this.pvt.tranQueue.length; i++) {
						var mc = this.pvt.tranQueue[i];
						this.tranStart(); // увеличиваем счетчик db-транзакции перед вызовом серверного метода
						mc.method.apply(mc.context,mc.args);
						
						var ifcallback = mc.args[mc.args.length-1];
						if (!(typeof ifcallback === 'function')) // последний параметр - колбэк (наверное есть лучший способ это проверить)
						  this.tranCommit(); // если колбэка нет, то сразу закрываем транзакцию 				
					}
					this.pvt.tranQueue = null;
					this.pvt.inTran = false;
					if (this.pvt.tranCounter == 1)
						this.getContext().remoteCall("endTran");
					var memGuid = this.getCurTranGuid();
					this.tranCommit();
					if (memGuid && !this.inTran()) {
						delete this.pvt.execTr[memGuid]; // почистить транзакцию
						this.pvt.execQ.splice(0,1);
						this.pvt.memTranIdx++;			
					}		
				}
			},

			_inTran:function() {
				return this.pvt.inTran;
			},

			_execMethod: function(context, method,args) {
			
				var ucallback = args[args.length-1];
				if (typeof ucallback === 'function') {
					var that=this;

					args[args.length-1] = function(res) {
						that.userEventHandler(context,ucallback,res, true);
					}
				}

				if (this._inTran())
					this.pvt.tranQueue.push({context:context, method:method, args: args});
				else method.apply(context,args);
			},
			
            /**
             * Функция-оболочка в которой завернуты системные действия. Должна вызываться компонентами
			 * в ответ на действия пользователя, содержательные методы передаются в функцию f
             * @param context Контекст в котором запускается прикладная функция
             * @param f {function} функция
             * @param args {object} Аргументы функции
			 * @param nots {boolean) true - не стартовать транзакцию дб
             */
            userEventHandler: function(context, f, args, nots) {

                var nargs = [];
				var that = this;
				if (args)
				  if (Array.isArray(args))
				    nargs = args
				  else
                    nargs = [args];
				this._tranStart(!nots);
				if (f) f.apply(context, nargs);			
				this.getController().genDeltas(this.getGuid(),undefined,null, function(res,cb) { that.getContext().sendDataBaseDelta(res,cb); });
				this._tranCommit();				
				if (!this.inTran()) {
					var vc = this.getContext(); // ? рендерить можно и без завершения транзакции, подумать (если править, то и в колбэке выше!)
					if (vc) vc.renderAll(true); // true? если мы на клиенте, то наверное да..
				}
            },
			
			
			// временный вариант ф-ции для рассылки оповещений подписантам, используется для рассылки признака конца транзакции
			subsRemoteCall: function(func, aparams, excludeGuid) {		
				var subs = this.getSubscribers();	
				var trGuid = this.getCurTranGuid();
				for(var guid in subs) {
					var csub = subs[guid];
					if (excludeGuid!=guid) // для всех ДБ кроме исключенной (та, которая инициировала вызов)
						csub.connect.send({action:func, trGuid: trGuid, dbGuid:guid }); //TODO TRANS2 сделать вызов любого метода
				}
			},
			
			
			_checkRootVer: function(rootv) {
				console.log("CHECK ROOT VERSIONS");
				for (var guid in rootv) console.log(guid, rootv[guid],this.getObj(guid).getRootVersion("valid"));
				for (var guid in rootv) 
					if (rootv[guid] != this.getObj(guid).getRootVersion("valid")) return false;
				return true;
			},
			
            /**
             * Ответ на вызов удаленного метода. Ставит вызовы в очередь по транзакциям
             * @param uobj {object}
             * @param args [array] 
             * @param srcDbGuid - гуид БД-источника
			 * @param trGuid - гуид транзакции (может быть null)
			 * @param rootv {object} - версии рутов
			 * @callback done - колбэк
             */
			remoteCallExec: function(uobj, args, srcDbGuid, trGuid, rootv, done) {
				var db = this;
				var trans = this.pvt.execTr;
				var queue = this.pvt.execQ;
				var auto = false;				
				// пропускаем "конец" транзакции если клиент был сам ее инициатором
				if (trGuid && (db.getCurTranGuid() == trGuid) && !(db.isExternalTran()) && (args.func=="endTran")) return;
				if (!trGuid) {	// "автоматическая" транзакция, создается если нет гуида транзакции
					trGuid = Utils.guid();
					auto=true;
				}
				if (!(trGuid in trans)) { // создать новую транзакцию и поставить в очередь
					var qElem = {};
					qElem.tr = trGuid;
					qElem.q = [];
					qElem.a = auto;
					queue.push(qElem);
					trans[trGuid] = this.pvt.memTranIdx+queue.length-1; // "индекс" для быстрого доступа в очередь
				}
				var tqueue = queue[trans[trGuid]-this.pvt.memTranIdx].q;

				function done2(res,endTran) { // коллбэк-обертка для завершения транзакции
					
					var memTranGuid = db.getCurTranGuid();
					tq = queue[trans[memTranGuid]-db.pvt.memTranIdx];		
					db.getController().genDeltas(db.getGuid()); // сгенерировать дельты и разослать подписчикам
					var commit = tq.a || endTran; // конец транзакции - либо автоматическая либо признак конца
					if (commit) { 
						db.subsRemoteCall("endTran",undefined, srcDbGuid); // разослать маркер конца транзакции всем подписчикам кроме srcDbGuid
						if (db.isExternalTran()) // закрываем только "внешние" транзакции (созданные внутри remoteCallExec)
							db.tranCommit(); 	
						db.event.fire({
							type: 'endTransaction',
							target: this
						});
						
						if (done) done(res);
						
						delete trans[memTranGuid];
						queue.splice(0,1);
						db.pvt.memTranIdx++;
						db.pvt.execFst = false;
						
						if (queue.length>0) { // Если есть другие транзакции в очереди, то перейти к их выполнению
							this._checkRootVer(rootv);
							db.tranStart(queue[0].tr);
							db.pvt.execFst = true;
							var f=queue[0].q[0];
							f(); 
						}										
					}			
					else {
						if (done) done(res); // сейчас срабатывает только на сервере, чтобы вернуть ответ на клиент
						
						tq.q.splice(0,1);				
						if (tq.q.length>0) 
							tq.q[0]();
						else 
							db.pvt.execFst = false;
					}
					//console.log("RCEXEC DONE ",args.func,args,trGuid,auto,commit, queue);
				}
				var aparams = args.aparams || [];
				aparams.push(done2); // добавить колбэк последним параметром

				function exec1() {
					if (args.func == "endTran")  // если получили маркер конца транзакции, то коммит
						done2(null,true);		
					else
						uobj[args.func].apply(uobj,aparams); // выполняем соответствующий метод uobj.func(aparams)		
				}	
				// ставим в очередь
				tqueue.push(function() { exec1(); });
				//console.log("RCEXEC PUSH TO QUEUE ",args.func,args,trGuid,auto, queue);
							
				if (!db.getCurTranGuid()) {
					this._checkRootVer(rootv);
					db.tranStart(trGuid); // Если не в транзакции, то заходим в нее
				}

				if (trGuid == db.getCurTranGuid()) { // Если мемДБ в той же транзакции, что и метод, можем попробовать его выполнить, но только		
					if (!this.pvt.execFst) { 		// если первый вызов не исполняется в данный момент
						this.pvt.execFst = true;
						tqueue[0](); // выполнить первый в очереди метод
					}				
				}
			},

            /**
             * Параметр автоотсылки дельт
             * @param value {boolean}
             * @returns {boolean}
             */
            autoSendDeltas: function(value) {
                if (value !== undefined)
                    this.pvt.asd = value;
                return this.pvt.asd;
            },

			buildMetaInfo: function(type, done){
				var ctrls = UCCELLO_CONFIG.controls;

				//if (!side || side == 'server') {
				if (this._isNode) {
				    for (var i in ctrls) {
				        if ((!ctrls[i].metaType && type == 'content') || (ctrls[i].metaType && ctrls[i].metaType.indexOf(type) != -1)) {
				            var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath : UCCELLO_CONFIG.controlsPath;
				            var comp = require(path + ctrls[i].component);
				            new comp(this);
				        }
				    };
				    if (done)
				        done();
				} else {
					var that = this;
					var scripts = [];
					// собираем все нужные скрипты в кучу
					for (var i = 0; i < ctrls.length; i++) {
						if ((!ctrls[i].metaType && type=='content') || (ctrls[i].metaType && ctrls[i].metaType.indexOf(type)!=-1)) {
							var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath : UCCELLO_CONFIG.controlsPath
							scripts.push(path + ctrls[i].component);
						}
					}
					// загружаем скрипты и выполняем колбэк
					require(scripts, function(){
						for(var i=0; i<scripts.length; i++)
							new (arguments[i])(that);
						done();
					});
				}
			}

		});
		return ControlMgr;
	}
);