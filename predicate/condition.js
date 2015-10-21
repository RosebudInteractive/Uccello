if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseCondition', './refParameter', './staticValue'],
    function (BaseCondition, RefParameter, StaticValue) {

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
            },

            value: function (value) {
                var val_col = this.getCol("Values");
                var i;
                if (value) {
                    for (i = 0; i < val_col.count() ; i++)
                        val_col._del(val_col.get(0));

                    var values = [];
                    if (Array.isArray(value))
                        values = value
                    else
                        values.push(value);

                    for (i = 0; i < values.length; i++) {
                        if (values[i].param) {
                            var predicate = this.getParent();
                            var param = predicate.getParameter(values[i].param);
                            if (param) {
                                var ref_param = new RefParameter(this.getDB(), { parent: this, colName: "Values" });
                                ref_param.ref(param);
                            } else
                                throw new Error("Parameter \"" + values[i].param+"\" doesn't exist.");
                        } else {
                            var val = {};
                            if (values[i].type && values[i].value)
                                val = values[i]
                            else {
                                val.value = values[i];
                                if (typeof (val.value) === "string")
                                    val.type = "string"
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
                            var new_val = new StaticValue(this.getDB(), { parent: this, colName: "Values" });
                            new_val.value(val);
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