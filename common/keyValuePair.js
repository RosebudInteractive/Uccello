if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {

        var KeyValuePair = UObject.extend({

            className: "KeyValuePair",
            classGuid: UCCELLO_CONFIG.classGuids.KeyValuePair,
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

        return KeyValuePair;
    }
);