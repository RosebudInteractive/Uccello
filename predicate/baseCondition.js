if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './parameter'],
    function (UObject, Parameter) {

        var BaseCondition = UObject.extend({

            className: "BaseCondition",
            classGuid: UCCELLO_CONFIG.classGuids.BaseCondition,
            metaCols: [{ "cname": "Parameters", "ctype": "BaseParameter" }],
            metaFields: [{ fname: "IsNegative", ftype: "boolean" }],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this._paramsByName = {};
                };
            },

            isNegative: function (value) {
                return this._genericSetter("IsNegative", value);
            },

            deleteParameter: function (name) {
                var parameter = this._paramsByName[name];
                if (parameter)
                    this.getCol("Parameters")._del(parameter);
            },

            addParameter: function (param) {
                var param_holder = this.getParent() ? this.getParent : this;

                if (!param.name)
                    throw new Error("Parameter name is undefined.");

                if (!param.ptype)
                    throw new Error("Parameter type (field \"ptype\") is undefined.");

                var parameter = param_holder._paramsByName[param.name];
                var is_new = false;
                if (!parameter) {
                    is_new = true;
                    var ini_params = {
                        ini: {
                            fields: {
                                Name: param.name
                            }
                        },
                        parent: param_holder,
                        colName: "Parameters"
                    };
                    parameter = new Parameter(this.getDB(), ini_params);
                };

                var pvalue = { type: param.ptype };
                if (param.value)
                    pvalue.value = param.value;

                try {

                    parameter.value(pvalue);

                } catch (err) {

                    if (is_new)
                        param_holder.getCol("Parameters")._del(parameter);
                    throw err;
                };

                return this;
            },

            getParameter: function (name) {
                var param_holder = this.getParent() ? this.getParent : this;
                return param_holder._paramsByName[name];
            },
        });

        return BaseCondition;
    }
);