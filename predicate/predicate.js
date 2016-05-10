if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./baseCondition', './condition', './predicateParam', './refParameter', './dsField', './dsAlias'],
    function (BaseCondition, Condition, PredicateParam, RefParameter, DsField, DsAlias) {

        var Predicate = BaseCondition.extend({

            className: "Predicate",
            classGuid: UCCELLO_CONFIG.classGuids.Predicate,
            metaCols: [
                { "cname": "Aliases", "ctype": "DsAlias" },
                { "cname": "Parameters", "ctype": "BaseParameter" },
                { "cname": "Conditions", "ctype": "BaseCondition" }
            ],
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

                    var aliasesCol = this.getCol("Aliases");
                    aliasesCol.on({
                        type: 'beforeAdd',
                        subscriber: this,
                        callback: this._onBeforeAddAlias
                    }).on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddAlias
                    }).on({
                        type: 'beforeDel',
                        subscriber: this,
                        callback: this._onBeforeDelAlias
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteAlias
                    });
                };
            },

            isDisjunctive: function (value) {
                return this._genericSetter("IsDisjunctive", value);
            },

            addConditionWithClear: function (condition, is_negative) {
                return this._addCondition(condition, is_negative, true);
            },

            isParameterHolder: function () {
                return true;
            },

            isAliasHolder: function () {
                return true;
            },

            addCondition: function (condition, is_negative) {
                return this._addCondition(condition, is_negative, false);
            },

            clearConditions: function () {
                this._clearCollection(this.getCol("Conditions"));
            },

            clearParams: function () {
                this._clearCollection(this.getCol("Parameters"));
            },

            clearAliases: function () {
                this._clearCollection(this.getCol("Aliases"));
            },

            newPredicateWithClear: function (is_disjunctive, is_negative) {
                return this._newPredicate(is_disjunctive, is_negative, true);
            },

            addPredicate: function (predicate) {
                var predicate_obj = (predicate instanceof Predicate) ?
                    this.getDB().serialize(predicate, true) : predicate;
                var src_predicate =
                    this.getDB().deserialize(
                        predicate_obj,
                        { obj: this, colName: "Conditions" },
                        this.getDB().getDefaultCompCallback()
                    );

                var self = this;

                function transferParamsAndAliases(predicate) {
                    var cond_col = predicate.getCol("Conditions");
                    for (var i = 0; i < cond_col.count() ; i++) {
                        var cond = cond_col.get(i);
                        if (cond instanceof Predicate)
                            transferParamsAndAliases(cond)
                        else {

                            function checkValues(val_col) {
                                for (var j = 0; j < val_col.count(); j++) {
                                    var value = val_col.get(j);
                                    if (value instanceof DsField) {
                                        var alias = value.aliasRef();
                                        if (alias) {
                                            var name = alias.name();
                                            var self_alias = self.getAlias(name);
                                            if (!self_alias) {
                                                self.addAlias(name);
                                                self_alias = self.getAlias(name);
                                                self_alias.value(alias.value());
                                            };
                                            value.aliasRef(self_alias);
                                        };
                                    }
                                    else
                                        if (value instanceof RefParameter) {
                                            var param = value.ref();
                                            var name = param.name();
                                            var self_param = self.getParameter(name);
                                            if (self_param) {
                                                if (self_param.valType() !== param.valType()) {
                                                    self.getCol("Conditions")._del(src_predicate);
                                                    throw new Error("Types of parameter \"" + name + "\" in this and predicate which is being added differ.");
                                                }
                                            }
                                            else {
                                                self.addParameter({
                                                    name: name,
                                                    ptype: param.valType().serialize()
                                                });
                                                self_param = self.getParameter(name);
                                                self_param.valValue(param.valValue());
                                            };
                                            value.ref(self_param);
                                        };
                                };
                            };

                            checkValues(cond.getCol("LeftValues"));
                            checkValues(cond.getCol("RightValues"));
                        };
                    };
                };

                transferParamsAndAliases(src_predicate);
                src_predicate.clearParams();
                src_predicate.clearAliases();

                return this;
            },

            newPredicate: function (is_disjunctive, is_negative) {
                return this._newPredicate(is_disjunctive, is_negative, false);
            },

            deleteAlias: function (name) {
                var alias_holder = this.getAliasHolder();
                var alias = alias_holder && alias_holder._aliasesByName[name] ?
                    alias_holder._aliasesByName[name].alias : null;
                if (alias)
                    this.getCol("Aliases")._del(alias);
            },

            addAlias: function (alias_name) {
                var alias_holder = this.getAliasHolder();

                if (!alias_holder)
                    throw new Error("Can't find alias holder.");

                if (!alias_name)
                    throw new Error("Alias name is undefined.");

                var alias = alias_holder && alias_holder._aliasesByName[alias_name] ?
                    alias_holder._aliasesByName[alias_name].alias : null;

                if (!alias) {
                    var ini_params = {
                        ini: {
                            fields: {
                                Name: alias_name
                            }
                        },
                        parent: alias_holder,
                        colName: "Aliases"
                    };
                    new DsAlias(this.getDB(), ini_params);
                };
                return this;
            },

            deleteParameter: function (name) {
                var param_holder = this.getParameterHolder();
                var parameter = param_holder && param_holder._paramsByName[name] ?
                    param_holder._paramsByName[name].parameter : null;
                if (parameter)
                    this.getCol("Parameters")._del(parameter);
            },

            addParameter: function (param) {
                var param_holder = this.getParameterHolder();

                if (!param_holder)
                    throw new Error("Can't find parameter holder.");

                if (!param.name)
                    throw new Error("Parameter name is undefined.");

                if (!param.ptype)
                    throw new Error("Parameter type (field \"ptype\") is undefined.");

                var parameter = param_holder._paramsByName[param.name] ?
                    param_holder._paramsByName[param.name].parameter : null;
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
                    parameter = new PredicateParam(this.getDB(), ini_params);
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

            getFieldList: function () {
                var result = [];
                var cond_col = predicate.getCol("Conditions");
                for (var i = 0; i < cond_col.count() ; i++) {
                    var cond = cond_col.get(i);
                    if (cond instanceof Predicate)
                        result = result.concat(this.getFieldList());
                    else {

                        function collectFields(val_col) {
                            for (var j = 0; j < val_col.count(); j++) {
                                var value = val_col.get(j);
                                if (value instanceof DsField)
                                    result.push(value);
                            };
                        };

                        collectFields(cond.getCol("LeftValues"));
                        collectFields(cond.getCol("RightValues"));
                    };
                };
                return result;
            },

            _clearCollection: function (collection) {
                var nelems = collection.count();
                for (var i = 0; i < nelems; i++)
                    collection._del(collection.get(0));
            },

            _newPredicate: function (is_disjunctive, is_negative, with_clear) {
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

                var left_exp = condition.leftExp || (typeof (condition.field) === "string" ? { field: condition.field } : null);
                var right_exp = condition.rightExp || condition.value;

                var IsNegative = is_negative ? true : false;

                if (!condition.op)
                    throw new Error("Operation is undefined.");

                if ((!left_exp) && (typeof (left_exp) !== "number"))
                    throw new Error("Left side expression is undefined.");

                if ((!right_exp) && (typeof (right_exp) !== "number"))
                    throw new Error("Right side expression is undefined.");

                var ini_params = {
                    ini: {
                        fields: {
                            IsNegative: IsNegative,
                            //FieldName: condition.field,
                        }
                    },
                    parent: this,
                    colName: "Conditions"
                };
                var cond = new Condition(this.getDB(), ini_params);

                try {

                    cond.op(condition.op);
                    cond.leftExp(left_exp);
                    cond.rightExp(right_exp);

                } catch (err) {

                    this.getCol("Conditions")._del(cond);
                    throw err;
                };

                return this;
            },

            _findParameter: function (predicate, parameter) {
                var result = false;
                var cond_col = predicate.getCol("Conditions");
                for (var i = 0; (!result) && (i < cond_col.count()) ; i++) {
                    var cond = cond_col.get(i);
                    if (cond instanceof Predicate)
                        result = result || this._findParameter(cond, parameter)
                    else {

                        function checkValues(val_col, curr_result) {
                            var res = curr_result;
                            for (var j = 0; (!res) && (j < val_col.count()) ; j++) {
                                var value = val_col.get(j);
                                if (value instanceof RefParameter)
                                    res = res || (value.ref() === parameter);
                            };
                            return res;
                        };

                        result = checkValues(cond.getCol("LeftValues"), result);
                        if (!result)
                            result = checkValues(cond.getCol("RightValues"), result);
                    };
                };
                return result;
            },

            _getOnChangeReadOnlyProp: function (obj, prop_name) {
                var self = this;
                var oldVal = obj._genericSetter(prop_name);

                return function (args) {
                    var newVal = obj._genericSetter(prop_name);
                    if (!obj.getFieldType(prop_name).isEqual(oldVal, newVal)) {
                        obj.set(prop_name, oldVal);
                        throw new Error("Property \"" + prop_name + "\" is READONLY.");
                    };
                };
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
                var handlers = [];
                var hdesc = {
                    type: 'mod%Name',
                    subscriber: this,
                    callback: this._getOnChangeReadOnlyProp(parameter, "Name")
                };
                parameter.event.on(hdesc);
                handlers.push(hdesc);
                this._paramsByName[name] = { parameter: parameter, handlers: handlers };
            },

            _onBeforeDelParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                if (this._findParameter(this, parameter))
                    throw new Error("Can't delete parameter \"" + name + "\". It's used in some condition.");
            },

            _onDeleteParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                if (this._paramsByName[name] && (this._paramsByName[name].parameter === parameter)) {
                    this._paramsByName[name].handlers.forEach(function (hdesc) {
                        parameter.event.off(hdesc);
                    });
                    delete this._paramsByName[name];
                };
            },

            _findAlias: function (predicate, alias) {
                var result = false;
                var cond_col = predicate.getCol("Conditions");
                for (var i = 0; (!result) && (i < cond_col.count()) ; i++) {
                    var cond = cond_col.get(i);
                    if (cond instanceof Predicate)
                        result = result || this._findAlias(cond, alias)
                    else {

                        function checkValues(val_col, curr_result) {
                            var res = curr_result;
                            for (var j = 0; (!res) && (j < val_col.count()) ; j++) {
                                var value = val_col.get(j);
                                if (value instanceof DsField)
                                    res = res || (value.aliasRef() === alias);
                            };
                            return res;
                        };

                        result = checkValues(cond.getCol("LeftValues"), result);
                        if (!result)
                            result = checkValues(cond.getCol("RightValues"), result);
                    };
                };
                return result;
            },

            _onBeforeAddAlias: function (args) {
                var alias = args.obj;
                var name = alias.get("Name");
                if (this._aliasesByName[name])
                    throw new Error("Alias \"" + name + "\" already exists.");
            },

            _onAddAlias: function (args) {
                var alias = args.obj;
                var name = alias.get("Name");
                var handlers = [];
                var hdesc = {
                    type: 'mod%Name',
                    subscriber: this,
                    callback: this._getOnChangeReadOnlyProp(alias, "Name")
                };
                alias.event.on(hdesc);
                handlers.push(hdesc);
                this._aliasesByName[name] = { alias: alias, handlers: handlers };
            },

            _onBeforeDelAlias: function (args) {
                var alias = args.obj;
                var name = alias.get("Name");
                if (this._findAlias(this, alias))
                    throw new Error("Can't delete alias \"" + name + "\". It's used in some condition.");
            },

            _onDeleteAlias: function (args) {
                var alias = args.obj;
                var name = alias.get("Name");
                if (this._aliasesByName[name] && (this._aliasesByName[name].alias === alias)) {
                    this._aliasesByName[name].handlers.forEach(function (hdesc) {
                        alias.event.off(hdesc);
                    });
                    delete this._aliasesByName[name];
                };
            },
        });

        return Predicate;
    }
);