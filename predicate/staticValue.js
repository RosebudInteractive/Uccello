if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseValue'],
    function (BaseValue) {

        var StaticValue = BaseValue.extend({

            className: "StaticValue",
            classGuid: UCCELLO_CONFIG.classGuids.StaticValue,
            metaCols: [],
            metaFields: [{ fname: "Value", ftype: "typedvalue" }],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            value: function (value) {
                return this._genericSetter("Value", value);
            }
        });

        return StaticValue;
    }
);