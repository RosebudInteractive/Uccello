if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {

        var DsAlias = UObject.extend({

            className: "DsAlias",
            classGuid: UCCELLO_CONFIG.classGuids.DsAlias,
            metaCols: [],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "Value", ftype: "string" }
            ],

            name: function (value) {
                return this._genericSetter("Name", value);
            },

            value: function (value) {
                return this._genericSetter("Value", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });

        return DsAlias;
    }
);