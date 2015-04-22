if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var Container = AControl.extend({

            className: "Container",
            classGuid: UCCELLO_CONFIG.classGuids.Container,
            metaCols: [ {"cname": "Children", "ctype": "control"} ],
            metaFields: [],

            init: function(cm, params) {
                this._super(cm, params);
                this.params = params;
            },

            /**
             * Проверяет создан или нет div для отрисовки содержимого переданного ей в параметре дочернего элемента, если не создан, то создает его.
             * @param control
             * @returns {HTMLElement}
             */
            getRenderArea: function(control) {
                var div = $('#с'+control.getLid());
                if (div.length == 0) {
                    div = $('<div class="control-wrapper"></div>').attr('id', 'c'+control.getLid());
                    $('#'+this.getLid()).append(div);
                }
                return div;
            }

        });
        return Container;
    }
);