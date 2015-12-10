if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../system/uobject'],
    function(UObject) {
        var AComponent = UObject.extend({
		
			className: "AComponent",
			classGuid: UCCELLO_CONFIG.classGuids.AComponent,
			metaFields: [ {fname:"Id",ftype:"int"}, {fname:"Name",ftype:"string"} ], // TODO? гуиды для полей?
			metaCols: [],

            /**
             * @constructs
             * @param cm {ControlMgr} - менеджер контролов, к которому привязан данный контрол
			 * @param params
             */
            init: function(cm, params){
				UccelloClass.super.apply(this, [cm, params]);
				this.pvt.isRendered = false;
				this.pvt.isSubsInit = false;
				this.pvt.isDataInit = false;

				if (params===undefined) return; // в этом режиме только создаем метаинфо
				this.event.on({ // подписка на изменение объекта свойств, чтобы сбрасывать флаг рендеринга (TODO коллекции тоже)
						type: "mod", // TODO не забыть про отписку
						subscriber: this,
						callback: this._onDirtyRender
				});
				
				if (this.getCol("Children"))   // перенести в контейнер?
				  this.getCol("Children").on({
					type: "add",
					subscriber: this,
					callback: this._onDirtyRender
					});
				
				cm.add(this); // данные регистрируются в ControlMgr если они компоненты!

            },

			_onDirtyRender: function(result) {
				this.pvt.isRendered = false;
			},
			
			_isRendered: function(value) {
				if (value === undefined)
					return this.pvt.isRendered;

				if (value)
				  this.pvt.isRendered = true;
				else
				  this.pvt.isRendered = false;
				return this.pvt.isRendered;
			},
			
			isDataInit: function(value) {
				 if (value!==undefined) {
					if (value) 
						this.pvt.isDataInit = true;
					else 
						this.pvt.isDataInit = false;
				 }
				 return this.pvt.isDataInit;
			},
			
			isSubsInit: function(value) {
				 if (value!==undefined) {
					if (value) 
						this.pvt.isSubsInit = true;
					else 
						this.pvt.isSubsInit = false;
				 }
				 return this.pvt.isSubsInit;
			},
			
			// no op - сброс состояния рендеринга, вызывается если активный в памяти контекст хочет заново отрисовать себя
			// имплементируется по мере необходимости в наследниках
			initRender: function() {
			},

			id: function(value) {
				return this._genericSetter("Id",value);
			},

			name: function(value) {
				return this._genericSetter("Name",value);
			}

        });
        return AComponent;
    }
);