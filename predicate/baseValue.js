if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {

        var BaseValue = UObject.extend({

            className: "BaseValue",
            classGuid: UCCELLO_CONFIG.classGuids.BaseValue,
            metaCols: [],
            metaFields: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });

        return BaseValue;
    }
);