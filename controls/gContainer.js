if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var GContainer = Container.extend({

            className: "GContainer",
            classGuid: UCCELLO_CONFIG.classGuids.GContainer,
            metaCols: [
                {"cname": "Rows", "ctype": "UObject"},
                {"cname": "Columns", "ctype": "UObject"},
                {"cname": "Cells", "ctype": "UObject"}
            ],
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return GContainer;
    }
);