if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var CContainer = Container.extend({

            className: "CContainer",
            classGuid: UCCELLO_CONFIG.classGuids.CContainer,
            metaCols: [{"cname": "Children", "ctype": "control"}],
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return CContainer;
    }
);