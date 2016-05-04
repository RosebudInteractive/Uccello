if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseParameter', './valueProp'],
    function (BaseParameter, ValueProp) {

        var RefParameter = BaseParameter.extend([new ValueProp(true)], {

            className: "RefParameter",
            classGuid: UCCELLO_CONFIG.classGuids.RefParameter,
            metaCols: [],
            metaFields: [
                {
                    fname: "Ref",
                    ftype: {
                        type: "ref",
                        res_elem_type: UCCELLO_CONFIG.classGuids.PredicateParam
                    }
                }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            ref: function (value) {
                return this._genericSetter("Ref", value);
            }
        });

        return RefParameter;
    }
);