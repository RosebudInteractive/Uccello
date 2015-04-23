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
            metaCols: [
                {"cname": "Children", "ctype": "control"},
                {"cname": "Rows", "ctype": "control"},
                {"cname": "Columns", "ctype": "control"},
                {"cname": "Cells", "ctype": "control"}
            ],
            metaFields: [],

            init: function(cm,params){
                this._super(cm,params);
            }
        });
        return GContainer;
    }
);