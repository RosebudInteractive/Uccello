if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var FContainer = Container.extend({

            className: "FContainer",
            classGuid: UCCELLO_CONFIG.classGuids.FContainer,
            metaFields: [
                {fname:"HasGrid",ftype:"boolean"},
                {fname:"ColumnsCount",ftype:"int"},
                {fname:"MinColWidth",ftype:"int"},
                {fname:"MaxColWidth",ftype:"boolean"},
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
            minColWidth: function(value) {
                return this._genericSetter("MinColWidth", value);
            },
            maxColWidth: function(value) {
                return this._genericSetter("MaxColWidth", value);
            }
        });
        return FContainer;
    }
);