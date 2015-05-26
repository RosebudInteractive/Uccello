if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var FContainer = Container.extend({

            className: "FContainer",
            classGuid: UCCELLO_CONFIG.classGuids.FContainer,
            metaCols: [{"cname": "Children", "ctype": "control"}],
            metaFields: [
                {fname:"HasGrid", ftype:"boolean"},
                {fname:"ColumnsCount", ftype:"int"},
                {fname:"MaxColWidth", ftype:"int"},
                {fname:"MinColWidth", ftype:"int"}
            ],

            init: function(cm,params){
                this._super(cm,params);
            },
            hasGrid: function(value) {
                return this._genericSetter("HasGrid", value);
            },
            columnsCount: function(value) {
                return this._genericSetter("ColumnsCount", value);
            },
            maxColWidth: function(value) {
                return this._genericSetter("MaxColWidth", value);
            },
            minColWidth: function(value) {
                return this._genericSetter("MinColWidth", value);
            }
        });


        return FContainer;
    }
);