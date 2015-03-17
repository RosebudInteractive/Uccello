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
            }

        });
        return Container;
    }
);