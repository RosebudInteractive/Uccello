if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var VContainer = Container.extend({

            className: "VContainer",
            classGuid: UCCELLO_CONFIG.classGuids.VContainer,
            metaCols: [{"cname": "Children", "ctype": "control"}],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            }
        });
        return VContainer;
    }
);