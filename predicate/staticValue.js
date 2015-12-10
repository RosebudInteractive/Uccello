if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseValue', './valueProp'],
    function (BaseValue, ValueProp) {

        var StaticValue = BaseValue.extend([new ValueProp(false)], {

            className: "StaticValue",
            classGuid: UCCELLO_CONFIG.classGuids.StaticValue,
            metaCols: [],
            metaFields: [{ fname: "Value", ftype: "typedvalue" }],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });

        return StaticValue;
    }
);