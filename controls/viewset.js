if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [],
    function() {
        var ViewSet = Class.extend({

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
                if (!component)
                    component = this.cm.getRoot();

				if (!component._isRendered()) {
                    var viewsets = this.cm.getContext().getComponent(component.className).viewsets;
                    if (viewsets && viewsets[this.ini.name]) {
						//console.log("Render component "+component.className+" "+component.id());
                        component.irender(viewsets[this.ini.name], options);
					}
                }

                var col=component.pvt.obj.getCol("Children");
                if (col == undefined) return;
                for (var i=0; i<col.count(); i++) {
                    var co=this.cm.get(col.get(i).getGuid());
                    this.render(co, options);
                }
            }

        });
        return ViewSet;
    }
);