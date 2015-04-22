if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var GContainer = Container.extend({

            className: "GContainer",
            classGuid: UCCELLO_CONFIG.classGuids.GContainer,
            metaCols: [{"cname": "Children", "ctype": "control"}],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            },

            getRenderArea: function(control) {
                var div = this._super(control);
                // если не указаны единицы то считаем пикселями
                var left=control.left(), top=control.top(), width=control.width(), height=control.height();
                if ($.isNumeric(left)) left += 'px';
                if ($.isNumeric(top)) top += 'px';
                if ($.isNumeric(width)) width += 'px';
                else if (!width) width = '100%';
                if ($.isNumeric(height)) height += 'px';
                else if (!height) height = '100%';

                // установка размеров и положения дива
                div.css({top:top, left:left, width:width, height:height});
                return div;
            }
        });
        return GContainer;
    }
);