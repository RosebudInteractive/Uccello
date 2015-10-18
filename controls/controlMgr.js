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
			init: function(dbinit, vc, socket, cb, proxySrv){

				UccelloClass.super.apply(this, [dbinit.controller, dbinit.dbparams, cb]);

				this.pvt.compByLid = {};
				this.pvt.compByGuid = {};
				this.pvt.compByName = {};				
				this.pvt.subsInitFlag = {};
				this.pvt.dataInitFlag = {};
				this.pvt.rootGuids = {};
				this.pvt.vc = vc;
				this.pvt.proxySrv = proxySrv;
				this.pvt.incDeltaFlag = 0;
				this._isNode = typeof exports !== 'undefined' && this.exports !== exports;

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
					console.log('заглушка перемещения контрола: '+guid+' в '+parentGuid);
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
			getRootGuidsComp: function() {
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
			    //return this.pvt.compByGuid[guid];
			    return this.pvt.objs[guid];
			},

            /**
			 * вернуть по имени
             */				
			getByName: function(name) {
				return this.pvt.compByName[name];
			},
			
			
			processDelta: function() { 
				if (this.incDeltaFlag() != 1) // если не было входящих дельт, то не делаем обработку
					return;
				// TODO оптимизировать: пробегать только те контролы, в которых имплементирован processDelta
				for (var g in this.pvt.compByGuid) {
					var c = this.pvt.compByGuid[g];
					if (!c._isProcessed()) c.processDelta(); 
				}
				// сбросить признак isProcessed
				for (g in this.pvt.compByGuid) this.pvt.compByGuid[g]._isProcessed(false);
				this.incDeltaFlag(2);
			},
			
			allDataInit: function(component) {
				var cg = component.getGuid();
				if (!this.pvt.subsInitFlag[cg]) {
					this.subsInit(component);  // если не выполнена постинициализация, то запустить
					this.pvt.subsInitFlag[cg] = true;
				}
				if (!this.pvt.dataInitFlag[cg]) {
					this.tranStart();
					this.dataInit(component);
					this.tranCommit();
					this.pvt.dataInitFlag[cg] = true;
				}
				
				this.processDelta();						
			},

            /**
			 * Рендеринг компонентов интерфейса
			 *  @param component - корневой (обязательно) элемент, с которого запускается рендеринг
             */				
			render: function(component, renderItem) {

				if (renderItem) {
					for(var i in this.pvt.viewSets)
						if (this.pvt.viewSets[i].enable())
							this.pvt.viewSets[i].render(component, renderItem);
				}

				this.setToRendered(component,true);
				this.pvt._initRender = false;
			},
			
			getInitRender: function() {
				return this.pvt._initRender;
			},
			
			setToRendered: function(component, val) {
				if (component === undefined) return;
			
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
				this.resetModifLog('pd');
				
				// TODO обход рекурс
				for (var g in this.pvt.compByGuid) { 
					if ("initRender" in this.pvt.compByGuid[g])
						this.pvt.compByGuid[g].initRender();			// выставляем флаг рендеринга
				}		
				this.pvt._initRender = true;
			
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

			
			// REFACTORING 10 -------------------------------------------------------------------------------------------------------
            /**
             * Функция-оболочка в которой выполняются системные действия. Должна вызываться компонентами
			 * в ответ на действия пользователя, содержательные методы передаются в функцию f
             * @param context Контекст в котором запускается прикладная функция
             * @param f {function} функция
             * @param args {object} Аргументы функции
			 * @param nots {boolean) true - не стартовать транзакцию дб
             */
            userEventHandler: function(context, f, args) {
				function doBefore() {	
					if (that.incDeltaFlag()<2 && vc) vc.allDataInit();
				}		
				function doAfter() {
					if (!that.inTran() && vc) vc.renderAll();
				}
				
				if (this.inTran()) {
					console.log("%c ALREADY IN TRANSACTION! "+this.getCurTranGuid(),"color: red");
					//return;
				}	
				var vc = this.getContext(), nargs = [], that = this;
				if (args)
				  if (Array.isArray(args))
				    nargs = args;
				  else
                    nargs = [args];
				
				this.tranStart();
				if (f) f.apply(context, nargs);		
				this.resetModifLog('pd');					
				this.getController().genDeltas(this.getGuid(),undefined, function(res,cb) { that.sendDataBaseDelta(res,cb); });	
				this.syncInTran(doBefore,doAfter);
				this.tranCommit();
				console.log("END OF USERVENTHANDLER");
            },

			remoteCallPlus: function(objGuid, func, aparams, cb) {
				this.rc(objGuid, func, aparams, cb);
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
							var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath : UCCELLO_CONFIG.controlsPath;
							scripts.push(path + ctrls[i].component);
						}
					}
					// загружаем скрипты и выполняем колбэк
					require(scripts, function(){
						for(var i=0; i<scripts.length; i++)
							new (arguments[i])(that);
						if (done) done();
					});
				}
			},
			

		    // добавляем новый набор данных - мастер-слейв варианты
			// params.rtype = "res" | "data"
			// params.compcb - только в случае ресурсов (может использоваться дефолтный)
			// params.expr - выражение для данных
			getRoots: function(rootGuids,params, cb) {
				//var db = this.getContentDB();				
				var that = this;
				if (this.isMaster()) {

					var icb = function(r) {

						var objArr = r ? r.datas : null;

						function localCallback() {
							var res = that.addRoots(objArr, params, rg, rgsubs);							
							if (cb) cb({ guids: res });
						};

						if (cb) {
							// TODO 10 ИСПРАВИТЬ ДЛЯ КК
							//that._execMethod(that,that.addRemoteComps,[objArr, localCallback]);
							that.addRemoteComps(objArr, localCallback);
						}
						else {
							that.addLocalComps(objArr);
							localCallback();
						};
					};
					// Проверять, есть ли уже объект с таким гуидом и хэшем !!! (expression)
					// если есть - то просто возвращать его, а не загружать заново. Если нет, тогда грузить.
					var rg = []; // эти загрузить
					var rgsubs = []; // а на эти просто подписать
					rootGuids = this.getRootGuids(rootGuids);
					
					// Всегда добавляем новые - проверка существования не имеет смысла, мы говорим о гуидах прототипов
					for (var i=0; i<rootGuids.length; i++) {
						if (rootGuids[i].length > 36) { // instance Guid
							var cr = this.getRoot(rootGuids[i]); 
							if (cr && (params.expr &&  params.expr!=cr.hash)) 
									rg.push(rootGuids[i]);
							else rgsubs.push(rootGuids[i]);
						}
						else rg.push(rootGuids[i]); // если resourceGuid			
					}
				
					if (rg.length>0) {
						if (params.rtype == "res") {
							// TODO 10 ИСПРАВИТЬ ДЛЯ КК
							// this._execMethod(this.pvt.proxySrv,this.pvt.proxySrv.loadResources, [rg,icb]);
							this.pvt.proxySrv.loadResources(rg, icb);
							return;
						}
						if (params.rtype == "data") {
							// TODO 10 ИСПРАВИТЬ ДЛЯ КК
							//this._execMethod(this.pvt.proxySrv,this.pvt.proxySrv.queryDatas, [rg, params.expr, icb]);
							this.pvt.proxySrv.queryDatas(rg, params.expr, icb);
							return;
						}
					}
					else icb();

				}
				else { // slave
					// вызываем загрузку нового рута у мастера
					params.subDbGuid = this.getGuid();
					this.remoteCallPlus(undefined,'getRoots', [rootGuids, params],cb);
				}
			},
			
			incDeltaFlag: function(flag) { // 0 = init, 1 = delta, 2 = no delta
				if (flag === undefined) return this.pvt.incDeltaFlag;
				this.pvt.incDeltaFlag = flag;
				return this.pvt.incDeltaFlag;
			}
			/*
			remoteCallTranStart: function(dbTran) {
				if (this.inRemoteCallTran()) return;
				this.pvt._memFuncTran = true;
				this.pvt._memFunc = [];
				this.pvt._memFuncDone = [];
				if (dbTran)
					this.tranStart();
			},

			remoteCallTranCommit: function() {
				if (!this.inRemoteCallTran()) return;				
				
				if (this.pvt._memFunc.length>0) 
					this.remoteCallNow(); //else if (this.getCurTranCounter()==1) {
				var memGuid = this.getCurTranGuid();
				this.tranCommit();
				this.pvt._memFunc = [];
				this.pvt._memFuncDone = [];
				this.pvt._memFuncTran = false;
				
				if (memGuid && !this.inTran()) {
					delete this.pvt.execTr[memGuid]; // почистить очередь транзакции
					this.pvt.execQ.splice(0,1);
					this.pvt.memTranIdx++;			
				}		
			},
			
			inRemoteCallTran: function() {
				return this.pvt._memFuncTran;
			},
			
			remoteCallNow: function() {	
				if (!this.pvt._memFunc) return; 				
				var endTran = (this.pvt._memFunc[0].func === "endTran");
				var that = this;
				
				function icb(result) {				
					var vc = that.getContext();
					if (vc) vc.XXXallDataInit();
					function i2cb() {
						for (var i=0; i<result.cbres.length; i++) 
							if (cbs[i]) cbs[i](result.cbres[i]);
					}
					// TODO 10 первый параметр под вопросом - контекст может быть чем-то другим
					if (!endTran)
						that.userEventHandler(that,i2cb,undefined, true);
					else i2cb();
				}

				var socket = this.getSocket();
				var pg = this.getProxyMaster().guid;
				var cbs = this.pvt._memFuncDone;
							
				var data={action:"remoteCall3",type:"method",args: { masterGuid: pg, rc: this.pvt._memFunc } };
				if (this.getCurTranGuid()) {
					data.trGuid = this.getCurTranGuid();		
					data.srcDbGuid = this.getGuid();
						
				}
				if (this.inTran() && !endTran) // Если не в транзакции, то инкрементировать счетчик не нужно
					this.tranStart();
				socket.send(data,icb); 
				if (this.pvt.name!="System")
					console.log("SEND DATA ",data);
			},
*/

		});
		return ControlMgr;
	}
);