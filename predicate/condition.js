if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseCondition'],
    function (BaseCondition) {

        var Condition = BaseCondition.extend({

            className: "Condition",
            classGuid: UCCELLO_CONFIG.classGuids.Condition,
            metaCols: [{ "cname": "Values", "ctype": "BaseValue" }],
            metaFields: [
                { fname: "FieldName", ftype: "string" },
                { fname: "Op", ftype: "string" }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            fieldName: function (value) {
                return this._genericSetter("FieldName", value);
            },

            op: function (value) {
                return this._genericSetter("Op", value);
            }
        });

        return Condition;
    }
);