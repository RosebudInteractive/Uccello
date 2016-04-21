if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseValue'],
    function (BaseValue) {

        var DsField = BaseValue.extend({

            className: "DsField",
            classGuid: UCCELLO_CONFIG.classGuids.DsField,
            metaCols: [],
            metaFields: [
                { fname: "Name", ftype: "string" },
                {
                    fname: "AliasRef",
                    ftype: {
                        type: "ref",
                        res_elem_type: UCCELLO_CONFIG.classGuids.DsAlias
                    }
                }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            name: function (value) {
                return this._genericSetter("Name", value);
            },

            aliasRef: function (value) {
                return this._genericSetter("AliasRef", value);
            },

            value: function () {
                var result = { field: this.name() };
                if (this.aliasRef()) {
                    result.aliasName = this.aliasRef().name();
                    if(this.aliasRef().value())
                        result.alias = this.aliasRef().value();
                };
                return result;
            },

            valType: function () {
            },

            valValue: function () {
                return this.value();
            }
        });

        return DsField;
    }
);