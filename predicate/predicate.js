if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseCondition'],
    function (BaseCondition) {

        var Predicate = BaseCondition.extend({

            className: "Predicate",
            classGuid: UCCELLO_CONFIG.classGuids.Predicate,
            metaCols: [{ "cname": "Conditions", "ctype": "BaseCondition" }],
            metaFields: [{ fname: "IsDisjunctive", ftype: "boolean" }],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            isDisjunctive: function (value) {
                return this._genericSetter("IsDisjunctive", value);
            }
        });

        return Predicate;
    }
);