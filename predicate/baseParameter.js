if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseValue'],
    function (BaseValue) {

        var BaseParameter = BaseValue.extend({

            className: "BaseParameter",
            classGuid: UCCELLO_CONFIG.classGuids.BaseParameter,
            metaCols: [],
            metaFields: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });

        return BaseParameter;
    }
);