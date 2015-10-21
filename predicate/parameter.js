if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseParameter', './valueProp'],
    function (BaseParameter, ValueProp) {

        var Parameter = BaseParameter.extend([new ValueProp(false)], {

            className: "Parameter",
            classGuid: UCCELLO_CONFIG.classGuids.Parameter,
            metaCols: [],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "Value", ftype: "typedvalue" }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });

        return Parameter;
    }
);