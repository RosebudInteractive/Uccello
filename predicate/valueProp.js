if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [],
    function () {

        var ValueProp = UccelloClass.extend({

            init: function (is_ref) {
                this._isRef = is_ref ? true : false;
            },

            name: function (value) {
                var obj = this._isRef ? this.ref() : this;
                if (value && (!obj))
                    throw new Error("Referenced object is undefined");
                return obj ? obj._genericSetter("Name", value) : undefined;
            },

            value: function (value) {
                var obj = this._isRef ? this.ref() : this;
                if (value && (!obj))
                    throw new Error("Referenced object is undefined");
                return obj ? obj._genericSetter("Value", value) : undefined;
            },

            valType: function (type) {
                var obj = this._isRef ? this.ref() : this;
                if (type) {
                    if (!obj)
                        throw new Error("Referenced object is undefined");
                    obj._genericSetter("Value", { type: type });
                };
                return obj ? obj._genericSetter("Value").type() : undefined;
            },

            valValue: function (value) {
                var obj = this._isRef ? this.ref() : this;
                if (value) {
                    if (!obj)
                        throw new Error("Referenced object is undefined");
                    var svalue = obj.getSerialized("Value");
                    obj._genericSetter("Value", { type: svalue.type, value: value });
                };
                return obj ? obj._genericSetter("Value").value() : undefined;;
            }
        });

        return ValueProp;
    }
);