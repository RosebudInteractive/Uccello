if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
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
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            }
        });
        return Container;
    }
);