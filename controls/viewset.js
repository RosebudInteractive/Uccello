if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [],
    function() {
        var ViewSet = UccelloClass.extend({

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param ini информация о нахождении классов рендеринга {path:'path/to/controls'}
             */
            init: function(cm, ini) {
                this.cm = cm;
                this.ini = ini;
                this._enable = true;
            },

            /**
             * Включает или выключает набор из рендеринга, если вызывается без параметров,
             * то просто возвращает текущее значение включенности
             * @param value
             */
            enable: function(value) {
                if (value !== undefined) {
                    this._enable = value;
                }
                return this._enable;
            },

            /**
             * Рендеринг начиная с компонента component и ниже.
             * Если без параметров, то рендеринг идет с корневого элемента.
             * @param component
             * @param options
             */
            render: function(component, options) {

                var that = this;

				if ("_isRendered" in component) {
					if (!component._isRendered()) {
						var viewsets = this.cm.getContext().getConstructorHolder().getComponent(component.classGuid).viewsets;
						if (viewsets && viewsets[this.ini.name]) {
							component.irender(viewsets[this.ini.name], options);
						}
					}
				}

				var col=component.getCol("Children");
                if (col == undefined) return;
                for (var i=0; i<col.count(); i++) {
                    this.render(col.get(i), options);
                }
            }

        });
        return ViewSet;
    }
);