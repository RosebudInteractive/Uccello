if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseCondition', './refParameter', './staticValue', './dsField'],
    function (BaseCondition, RefParameter, StaticValue, DsField) {

        var allowedArgs = {
            "=": { min: 1, max: 1 },
            ">": { min: 1, max: 1 },
            "<": { min: 1, max: 1 },
            ">=": { min: 1, max: 1 },
            "<=": { min: 1, max: 1 },
            "like": { min: 1, max: 1 },
            "between": { min: 2, max: 2 },
            "in": { min: 1, max: 0 }
        };

        var Condition = BaseCondition.extend({

            className: "Condition",
            classGuid: UCCELLO_CONFIG.classGuids.Condition,
            metaCols: [
                { "cname": "LeftValues", "ctype": "BaseValue" },
                { "cname": "RightValues", "ctype": "BaseValue" }
            ],
            metaFields: [
                {
                    fname: "Op", ftype: {
                        type: "enum",
                        values: [
                            "=",
                            ">",
                            "<",
                            ">=",
                            "<=",
                            "like",
                            "between",
                            "in"
                        ]
                    }
                }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            allowedArgNumber: function () {
                return allowedArgs[this.op()];
            },

            op: function (value) {
                return this._genericSetter("Op", value);
            },

            leftExp: function (value) {
                if (Array.isArray(value))
                    throw new Error("Left side expression can't be an array.");
                var val_col = this.getCol("LeftValues");
                return this._value(value, val_col);
            },

            rightExp: function (value) {
                return this.value(value);
            },

            value: function (value) {
                var val_col = this.getCol("RightValues");
                return this._value(value, val_col);
            },

            _value: function (value, val_col) {
                var i;
                if (value || (typeof (value) === "number")) {
                    for (i = 0; i < val_col.count() ; i++)
                        val_col._del(val_col.get(0));

                    var values = [];
                    if (Array.isArray(value))
                        values = value
                    else
                        values.push(value);

                    for (i = 0; i < values.length; i++) {
                        if (values[i].param) {
                            var param = this.getParameter(values[i].param);
                            if (param) {
                                var ref_param = new RefParameter(this.getDB(), { parent: this, colName: val_col.getName() });
                                ref_param.ref(param);
                            } else
                                throw new Error("Parameter \"" + values[i].param + "\" doesn't exist.");
                        } else {
                            if (values[i].field) {
                                var ref_alias = null;
                                if (values[i].alias) {
                                    ref_alias = this.getAlias(values[i].alias);
                                    if(!ref_alias)
                                        throw new Error("Alias \"" + values[i].alias + "\" doesn't exist.");
                                };
                                var ds_field = new DsField(this.getDB(), {
                                    parent: this,
                                    ini: {
                                        fields: {
                                            Name: values[i].field
                                        }
                                    },
                                    colName: val_col.getName()
                                });
                                ds_field.aliasRef(ref_alias);
                            } else {
                                var val = {};
                                if (values[i].type && values[i].value)
                                    val = values[i]
                                else {
                                    val.value = values[i];
                                    if (typeof (val.value) === "string")
                                        val.type = { type: "string", length: val.value.length };
                                    else
                                        if (typeof (val.value) === "number") {
                                            if (((val.value | 0) - val.value) === 0)
                                                val.type = "int";
                                            else
                                                val.type = "float";
                                        }
                                        else
                                            throw new Error("Unknown type of value: " + JSON.stringify(val.value));
                                };
                                var new_val = new StaticValue(this.getDB(), { parent: this, colName: val_col.getName() });
                                new_val.value(val);
                            };
                        };
                    };
                };
                var result = [];
                for (i = 0; i < val_col.count() ; i++)
                    result.push(val_col.get(i).valValue());
                switch (result.length) {

                    case 0:
                        result = undefined;
                        break;

                    case 1:
                        result = result[0];
                        break;
                };
                return result;
            },
        });

        return Condition;
    }
);