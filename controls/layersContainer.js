if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var LayersContainer = Container.extend({

            className: "LayersContainer",
            classGuid: UCCELLO_CONFIG.classGuids.LayersContainer,
            metaFields: [
                {fname:"TabNumber", ftype:"int"}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            /**
             * Properties
             * @param value
             * @returns {*}
             */

            tabNumber: function(value) {
                return this._genericSetter("TabNumber", value);
            }
        });
        return LayersContainer;
    }
);
