if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var HContainer = Container.extend({

            className: "HContainer",
            classGuid: UCCELLO_CONFIG.classGuids.HContainer,
            metaCols: [{"cname": "Children", "ctype": "control"}],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            },

            getRenderArea: function(control) {
                var div = this._super(control);
                var width=control.width(), height=control.height();
                if ($.isNumeric(width)) width += 'px';
                else if (!width) width = '100%';
                if ($.isNumeric(height)) height += 'px';
                else if (!height) height = '100%';
                div.css({width:width, height:height});
                return div;
            }
        });
        return HContainer;
    }
);