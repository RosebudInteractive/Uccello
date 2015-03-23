if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
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
				this._super(cm,params);
				this.pvt.isRendered = false;

				if (params==undefined) return; // в этом режиме только создаем метаинфо
				this.pvt.obj.event.on({ // подписка на изменение объекта свойств, чтобы сбрасывать флаг рендеринга (TODO коллекции тоже)
						type: "mod", // TODO не забыть про отписку
						subscriber: this,
						callback: this._onDirtyRender
				});
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