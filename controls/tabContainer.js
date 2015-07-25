if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var TabContainer = Container.extend({

            className: "TabContainer",
            classGuid: UCCELLO_CONFIG.classGuids.TabContainer,
            metaFields: [{fname:"ActiveTab",ftype:"int"}],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            activeTab: function(value) {
                return this._genericSetter("ActiveTab", value);
            }
        });
        return TabContainer;
    }
);