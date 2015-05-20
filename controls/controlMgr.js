if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['../memDB/memDataBase', './viewset'],
	function(MemDataBase, ViewSet) {
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
				
				this._super(dbinit.controller, dbinit.dbparams, cb);

				this.pvt.compByLid = {};
				this.pvt.compByGuid = {};
				this.pvt.compByName = {};				
				this.pvt.subsInitFlag = {};
				this.pvt.dataInitFlag = {};
				this.pvt.rootGuids = {};
				this.pvt.vc = vc;
				
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
                    
/*                } else { // MemObj
                    this.pvt.root = dbOrRoot;
					// подписаться на удаление объектов
                    dbOrRoot.getDB().getRoot(dbOrRoot.getRoot().getGuid()).event.on({
                        type: "delObj",
                        subscriber: this,
                        callback: this.onDeleteComponent
                    });
                }*/
			},

           /**
			 * Инициализация подписки - делается 1 раз при загрузке нового ресурса
             * @param component {AComponent} - корневой элемент
             */				
			subsInit: function(component) {

				//for (var g in this.pvt.compByGuid)
				//	this.pvt.compByGuid[g].subsInit();
				component.subsInit();
				//var col=component.getCol("Children");
				for (j = 0 ; j < component.countCol() ; j++) {
					var col = component.getCol(j);
					for (var i=0; i<col.count(); i++) {
						//var co=col.get(i); //this.cm.get(col.get(i).getGuid());
						this.subsInit(col.get(i));
					}					
				}
				//this.pvt.subsInitFlag[component.getGuid()] = true;
			},

           /**
			 * Инициализация данны - делается 1 раз при загрузке нового ресурса
             * @param component {AComponent} - корневой элемент
             */				
			dataInit: function(component) {

				//for (var g in this.pvt.compByGuid)
				//	this.pvt.compByGuid[g].dataInit();
				component.dataInit();
				for (j = 0 ; j < component.countCol() ; j++) {
					var col = component.getCol(j);
					for (var i=0; i<col.count(); i++) {
						//var co=col.get(i); //this.cm.get(col.get(i).getGuid());
						this.dataInit(col.get(i));
					}	
				}
				//this.pvt.dataInitFlag[component.getGuid()] = true;
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
					//c.getParent()._delChild(c.getObj().getColName(),c.getObj());
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
			
				console.log(component.getGuid()+"  "+component.pvt.fields[7])
			
				if (!this.pvt.subsInitFlag[component.getGuid()]) {
					this.subsInit(component);  // если не выполнена постинициализация, то запустить
					this.pvt.subsInitFlag[component.getGuid()] = true;
				}
				if (!this.pvt.dataInitFlag[component.getGuid()]) {
					this.dataInit(component);
					this.pvt.dataInitFlag[component.getGuid()] = true;
				}
				
				if (pd) this.processDelta();
			
				//var c = (component === undefined) ? this.getRoot()  : component;

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
				//this.getDB().resetModifLog();
				/*for (var g in this.pvt.compByGuid) { //TODO нужно это делать не для всех компонентов или рендерить всегда с рута
					//this.pvt.compByGuid[g].getObj().resetModifFldLog();	// обнуляем "измененные" поля в объектах 
					var rg = this.pvt.compByGuid[g].getRoot().getGuid();
					if (("_isRendered" in this.pvt.compByGuid[g]) && ((component && component.getGuid() == rg) || (component === undefined)))
						this.pvt.compByGuid[g]._isRendered(val);			// выставляем флаг рендеринга
				}*/			
			//},
			
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
				// REFACT213
				/*
				if (result.target.getGuid() == this.pvt.rootGuid) {
	                    this.getDB().getRoot(this.pvt.rootGuid).event.on({
							type: "delObj",
							subscriber: this,
							callback: this.onDeleteComponent
                    });				
					
				}*/
				if (this.pvt.rootGuids[result.target.getGuid()] ) {
	                    //this.getDB().getRoot(result.target.getGuid()).event.on({
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
             * Функция-оболочка в которой завернуты системные действия. Должна вызываться компонентами
			 * в ответ на действия пользователя, содержательные методы передаются в функцию f
             * @param context Контекст в котором запускается прикладная функция
             * @param f {function} функция
             * @param args {object} Аргументы функции
             */
            userEventHandler: function(context, f, args) {
                var nargs = [];
				//var db = this.getDB();
				var vc = this.getContext();
                if (args) nargs = [args];
				//  стартовать транзакцию
				if (vc) vc.tranStart();
                if (f) f.apply(context, nargs);
                if (this.autoSendDeltas())
					this.getController().genDeltas(this.getGuid());
                    //db.getController().genDeltas(db.getGuid());
                //this.render(undefined); // TODO - на сервере это не вызывать
				if (vc) vc.renderAll();
				//  закрыть транзакцию
				if (vc) vc.tranCommit();
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

			buildMetaInfo: function(type, side, done){
				var ctrls = UCCELLO_CONFIG.controls;

				if (!side || side == 'server') {
					for (var i in ctrls) {
						if ((!ctrls[i].metaType && type=='content') || (ctrls[i].metaType && ctrls[i].metaType.indexOf(type)!=-1)) {
							var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath :UCCELLO_CONFIG.controlsPath;
							var comp = require(path + ctrls[i].component);
							new comp(this);
						}
					}
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