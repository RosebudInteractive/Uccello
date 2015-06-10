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
			getRootGuids: function() {
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
					this.dataInit(component);
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


			// "транзакции" для буферизации вызовов методов
			_tranStart: function() {
				if (this.pvt.inTran) return;
				this.pvt.inTran = true;
				this.pvt.tranQueue = [];
			},

			_tranCommit: function() {
				if (this.pvt.inTran) {
					for (var i=0; i<this.pvt.tranQueue.length; i++) {
						var mc = this.pvt.tranQueue[i];
						mc.method.apply(mc.context,mc.args);
					}
					this.pvt.tranQueue = null;
					this.pvt.inTran = false;
				}
			},

			_inTran:function() {
				return this.pvt.inTran;
			},

			_execMethod: function(context, method,args) {
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
             */
            userEventHandler: function(context, f, args) {

                var nargs = [];
                if (args) nargs = [args];
				//  стартовать транзакцию
				this._tranStart();
                if (f) f.apply(context, nargs);
                if (this.autoSendDeltas())
					this.getController().genDeltas(this.getGuid());

				var vc = this.getContext();
				if (vc) vc.renderAll();
				//  закрыть транзакцию
				this._tranCommit();
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