if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseParameter', './valueProp'],
    function (BaseParameter, ValueProp) {

        var PredicateParam = BaseParameter.extend([new ValueProp(false)], {

            className: "PredicateParam",
            classGuid: UCCELLO_CONFIG.classGuids.PredicateParam,
            metaCols: [],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "Value", ftype: "typedvalue" }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });

        return PredicateParam;
    }
);