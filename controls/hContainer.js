if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var HContainer = Container.extend({

            className: "HContainer",
            classGuid: UCCELLO_CONFIG.classGuids.HContainer,
            metaFields: [
                {fname:"SeparateChildren", ftype:"boolean"}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },
            separateChildren: function(value) {
                return this._genericSetter("SeparateChildren", value);
            }
        });
        return HContainer;
    }
);