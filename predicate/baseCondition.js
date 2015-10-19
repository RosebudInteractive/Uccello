if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {

        var BaseCondition = UObject.extend({

            className: "BaseCondition",
            classGuid: UCCELLO_CONFIG.classGuids.BaseCondition,
            metaCols: [{ "cname": "Parameters", "ctype": "BaseParameter" }],
            metaFields: [{ fname: "IsNegative", ftype: "boolean" }],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            isNegative: function (value) {
                return this._genericSetter("IsNegative", value);
            }
        });

        return BaseCondition;
    }
);