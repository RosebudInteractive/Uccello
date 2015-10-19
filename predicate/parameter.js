if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseParameter'],
    function (BaseParameter) {

        var Parameter = BaseParameter.extend({

            className: "Parameter",
            classGuid: UCCELLO_CONFIG.classGuids.Parameter,
            metaCols: [],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "Value", ftype: "typedvalue" }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            name: function (value) {
                return this._genericSetter("Name", value);
            },

            value: function (value) {
                return this._genericSetter("Value", value);
            }
        });

        return Parameter;
    }
);