if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseCondition', './condition', './refParameter'],
    function (BaseCondition, Condition, RefParameter) {

        var Predicate = BaseCondition.extend({

            className: "Predicate",
            classGuid: UCCELLO_CONFIG.classGuids.Predicate,
            metaCols: [{ "cname": "Conditions", "ctype": "BaseCondition" }],
            metaFields: [{ fname: "IsDisjunctive", ftype: "boolean" }],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    var paramsCol = this.getCol("Parameters");
                    paramsCol.on({
                        type: 'beforeAdd',
                        subscriber: this,
                        callback: this._onBeforeAddParameter
                    }).on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddParameter
                    }).on({
                        type: 'beforeDel',
                        subscriber: this,
                        callback: this._onBeforeDelParameter
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteParameter
                    });
                };
            },

            isDisjunctive: function (value) {
                return this._genericSetter("IsDisjunctive", value);
            },

            addConditionWithClear: function (condition, is_negative) {
                return this._addCondition(condition, is_negative, true);
            },

            addCondition: function (condition, is_negative) {
                return this._addCondition(condition, is_negative, false);
            },

            clearConditions: function () {
                var conds = this.getCol("Conditions");
                var nconds = conds.count();
                for (var i = 0; i < nconds; i++)
                    conds._del(conds.get(0));
            },

            addPredicateWithClear: function (is_disjunctive, is_negative) {
                return this._addPredicate(is_disjunctive, is_negative, true);
            },

            addPredicate: function (is_disjunctive, is_negative) {
                return this._addPredicate(is_disjunctive, is_negative, false);
            },

            _addPredicate: function (is_disjunctive, is_negative, with_clear) {
                if (with_clear)
                    this.clearConditions();

                var IsDisjunctive = is_disjunctive ? true : false;
                var IsNegative = is_negative ? true : false;
                var ini_params = {
                    ini: {
                        fields: {
                            IsNegative: IsNegative,
                            IsDisjunctive: IsDisjunctive
                        }
                    },
                    parent: this,
                    colName: "Conditions"
                };
                return new Predicate(this.getDB(), ini_params);
            },

            _addCondition: function (condition, is_negative, with_clear) {
                if (with_clear)
                    this.clearConditions();

                var IsNegative = is_negative ? true : false;
                if (!condition.field)
                    throw new Error("Field name is undefined.");

                if (!condition.op)
                    throw new Error("Operation is undefined.");

                if (!condition.value)
                    throw new Error("Value is undefined.");

                var ini_params = {
                    ini: {
                        fields: {
                            IsNegative: IsNegative,
                            FieldName: condition.field,
                        }
                    },
                    parent: this,
                    colName: "Conditions"
                };
                var cond = new Condition(this.getDB(), ini_params);

                try {

                    cond.op(condition.op);
                    cond.value(condition.value);

                } catch (err) {

                    this.getCol("Conditions")._del(cond);
                    throw err;
                };

                return this;
            },

            _onBeforeAddParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                if (this._paramsByName[name])
                    throw new Error("Parameter \"" + name + "\" already exists.");
            },

            _onAddParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                this._paramsByName[name] = parameter;
            },

            _findParameter: function (predicate, parameter) {
                var result = false;
                var cond_col = predicate.getCol("Conditions");
                for (var i = 0; (!result) && (i < cond_col.count()) ; i++) {
                    var cond = cond_col.get(i);
                    if (cond instanceof Predicate)
                        result = result || this._findParameter(cond, parameter)
                    else {
                        var val_col = cond.getCol("Values");
                        for (var j = 0; (!result) && (j < val_col.count()) ; j++) {
                            var value = val_col.get(j);
                            if (value instanceof RefParameter)
                                result = result || (value.ref() === parameter);
                        };
                    };
                };
                return result;
            },


            _onBeforeDelParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                if (this._findParameter(this, parameter))
                    throw new Error("Can't delete parameter \"" + name + "\". It's in use in some condition.");
            },

            _onDeleteParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                delete this._paramsByName[name];
            },
        });

        return Predicate;
    }
);