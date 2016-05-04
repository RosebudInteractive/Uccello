if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './predicateParam'],
    function (UObject, PredicateParam) {

        var BaseCondition = UObject.extend({

            className: "BaseCondition",
            classGuid: UCCELLO_CONFIG.classGuids.BaseCondition,
            metaFields: [{ fname: "IsNegative", ftype: "boolean" }],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this._paramsByName = {};
                    this._aliasesByName = {};
                };
            },

            isNegative: function (value) {
                return this._genericSetter("IsNegative", value);
            },

            isParameterHolder: function () {
                return false;
            },

            isAliasHolder: function () {
                return false;
            },

            getParameterHolder: function () {
                var result = ((typeof (this.isParameterHolder) === "function") && this.isParameterHolder()) ? this : null;
                var parent = this;
                while (parent = parent.getParent())
                    result = ((typeof (parent.isParameterHolder) === "function") && parent.isParameterHolder()) ? parent : result;
                return result;
            },

            getAliasHolder: function () {
                var result = this.isAliasHolder() ? this : null;
                var parent = this;
                while (parent = parent.getParent())
                    result = parent.isAliasHolder() ? parent : result;
                return result;
            },

            getParameter: function (name) {
                var param_holder = this.getParameterHolder();
                return param_holder && param_holder._paramsByName[name] ?
                    param_holder._paramsByName[name].parameter : null;
            },

            getParams: function () {
                var result = {};
                var param_holder = this.getParameterHolder();
                if (param_holder) {
                    var keys = Object.keys(param_holder._paramsByName);
                    for (var i = 0; i < keys.length; i++) {
                        result[keys[i]] = param_holder._paramsByName[keys[i]].parameter;
                    };
                }
                return result;
            },

            getAlias: function (name) {
                var alias_holder = this.getAliasHolder();
                return alias_holder && alias_holder._aliasesByName[name] ?
                    alias_holder._aliasesByName[name].alias : null;
            },

            getAliases: function () {
                var result = {};
                var alias_holder = this.getAliasHolder();
                if (alias_holder) {
                    var keys = Object.keys(alias_holder._aliasesByName);
                    for (var i = 0; i < keys.length; i++) {
                        result[keys[i]] = alias_holder._aliasesByName[keys[i]].alias;
                    };
                }
                return result;
            }
        });

        return BaseCondition;
    }
);