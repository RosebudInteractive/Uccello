if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['../system/uobjectMgr', './viewset'],
	function(UObjectMgr, ViewSet) {
		var ControlMgr = UObjectMgr.extend({

            /**
             * @constructs
             * @param db {MemDataBase} - база данных
			 * @param rootGuid - гуид рутового элемента
			 * @param vc - контекст менеджера
             */
			init: function(db, rootGuid, vc, socket){
				this._super(db, rootGuid, vc);
				this.pvt = {};
				this.pvt.guid = db.getController().guid();
				this.pvt.compByLid = {};
				this.pvt.compByGuid = {};
				this.pvt.compByName = {};				
				this.pvt.subsInitFlag = false;
				this.pvt.dataInitFlag = false;
				this.pvt.db = db;
				this.pvt.rootGuid = rootGuid;
				this.pvt.vc = vc;
				
				if (socket)
					this.pvt.socket = socket;
				else
					if (vc)
						this.pvt.socket = vc.getSocket();
				this.pvt.viewSets = [this.createViewSet(UCCELLO_CONFIG.viewSet)];
                this.pvt.asd = true;
				if (rootGuid) {
					if (db.getObj(rootGuid)==undefined) {
						db.event.on( {
							type: "newRoot",
							subscriber: this,
							callback: this.onNewRoot
						});
					}
				}
                    
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
			
			subsInit: function() {
				var c = this.getRoot();

				for (var g in this.pvt.compByGuid)
					this.pvt.compByGuid[g].subsInit();
					
				this.pvt.subsInitFlag =true;
			},

			
			dataInit: function() {
				var c = this.getRoot();

				for (var g in this.pvt.compByGuid)
					this.pvt.compByGuid[g].dataInit();
					
				this.pvt.dataInitFlag =true;
			},

            /**
			 * Добавить компонент component в список менеджера контролов
             * @param component {AComponent} - добавляемый компонент
             */			
			add: function(component) {
				this.pvt.compByLid[component.getLid()] = component;
				this.pvt.compByGuid[component.getGuid()] = component;
				if (component.name())
					this.pvt.compByName[component.name()] = component;
			},


            /**
			 * Удалить компонент из менеджера контролов
             * @param guid
             */
			del: function(guid) {
				var c = this.get(guid);
				delete this.pvt.compByLid[c.getLid()];
				delete this.pvt.compByGuid[c.getGuid()];
				c.getParent()._delChild(c.getObj().getColName(),c.getObj());
			},

            /**
             * Переместить контрол
             * @param guid
             */
            move: function(guid, parentGuid) {
                console.log('заглушка перемещения контрола: '+guid+' в '+parentGuid)
            },

			// временно
			_getCompGuidList: function() {
				return this.pvt.compByGuid;
			},
			
            /**
			 * Вернуть базу данных, с которой связан менеджер контролов
             */					
			getDB: function() {
				return this.pvt.db;
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
			 * Вернуть корневой объект бд, с которым связан менеджер контролов
             */				
			getRoot: function() {
				if (this.pvt.rootGuid==undefined)
					return undefined;
				else
					return this.get(this.pvt.rootGuid); //this.getDB().getObj(this.pvt.rootGuid);
			},
			
			getGuid: function() {
				return this.pvt.guid;
			},

            /**
			 * Вернуть компонент по его гуид
             */	
			getByGuid: function(guid) {
				return this.pvt.compByGuid[guid];
			},

            /**
			 * то же самое, но лаконичнее
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
			 *  @param component - корневой элемент, с которого запускается рендеринг, если undef, то с корня
             */				
			render: function(component, options, pd) {
			
				if (!this.pvt.subsInitFlag) this.subsInit();  // если не выполнена постинициализация, то запустить
				if (!this.pvt.dataInitFlag) this.dataInit();
				
				if (pd) this.processDelta();
			
				var c = (component === undefined) ? this.getRoot()  : component;
				if (c.getRoot() != this.getRoot()) return;

                for(var i in this.pvt.viewSets)
                if (this.pvt.viewSets[i].enable())
                    this.pvt.viewSets[i].render(c, options);

				this.setToRendered(true);
			},
			
			setToRendered: function(val) {
				//this.getDB().resetModifLog();
				for (var g in this.pvt.compByGuid) { //TODO нужно это делать не для всех компонентов или рендерить всегда с рута
					//this.pvt.compByGuid[g].getObj().resetModifFldLog();	// обнуляем "измененные" поля в объектах 
					if ("_isRendered" in this.pvt.compByGuid[g])
						this.pvt.compByGuid[g]._isRendered(val);			// выставляем флаг рендеринга
				}			
			},

			onDeleteComponent: function(result) {
				delete this.pvt.compByGuid[result.target.getGuid()];
			},
			
			onNewRoot: function(result) {
				if (result.target.getGuid() == this.pvt.rootGuid) {
	                    this.getDB().getRoot(this.pvt.rootGuid).event.on({
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
				var db = this.getDB();
				var vc = this.getContext();
                if (args) nargs = [args];
				//  стартовать транзакцию
				if (vc) vc.tranStart();
                if (f) f.apply(context, nargs);
                if (this.autoSendDeltas())
                    db.getController().genDeltas(db.getGuid());
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
            }

		});
		return ControlMgr;
	}
);