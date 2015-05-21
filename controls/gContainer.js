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
                {"cname": "Children", "ctype": "control"},
                {"cname": "Rows", "ctype": "control"},
                {"cname": "Columns", "ctype": "control"},
                {"cname": "Cells", "ctype": "control"}
            ],
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return GContainer;
    }
);