if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['lodash', '../../../predicate/predicate'],
    function (_, Predicate) {

        var TICK_CHAR = '`';

        var QueryGen = UccelloClass.extend({

            queryTypes: {
                START_TRAN: 1,
                COMMIT_TRAN: 2,
                ROLLBACK_TRAN: 3,
                INSERT: 4,
                SELECT: 5,
                UPDATE: 6
            },

            init: function (engine, options) {
                this._engine = engine;
                this._provider = engine.getProvider();
                this._options = options || {};
                this.Meta = engine.Meta;
            },

            getNativeLib: function () {
                if (!this._nativeLib)
                    this._nativeLib = this.getProvider().connectionMgr().getNativeLib();
                return this._nativeLib;
            },

            showForeignKeysQuery: function (src_name, dst_name) {
                throw new Error("\"showForeignKeys\" wasn't implemented in descendant.");
            },

            dropForeignKeyQuery: function (table_name, fk_name) {
                throw new Error("\"dropForeignKeyQuery\" wasn't implemented in descendant.");
            },

            dropTableQuery: function (model) {
                throw new Error("\"dropTableQuery\" wasn't implemented in descendant.");
            },

            createTableQuery: function (model) {
                throw new Error("\"createTableQuery\" wasn't implemented in descendant.");
            },

            getProvider: function () {
                if (!this._provider)
                    this._provider = this._engine.getProvider();
                return this._provider;
            },

            getEngine: function () {
                return this._engine;
            },

            createLinkQuery: function (ref) {
                var query = "ALTER TABLE <%= table %> ADD CONSTRAINT <%= name %> FOREIGN KEY (<%= field %>) REFERENCES " +
                    "<%= parent %> (<%= key %>) ON DELETE <%= parent_action %> ON UPDATE RESTRICT";
                var ref_action = ref.type.refAction();
                var parent_action = "NO ACTION";

                switch (ref_action) {
                    case "parentRestrict":
                        parent_action = "RESTRICT";
                        break;

                    case "parentCascade":
                        parent_action = "CASCADE";
                        break;

                    case "parentSetNull":
                        parent_action = "SET NULL";
                        break;

                    default:
                        throw new Error("Unknown ref-action: \"" + ref_action + "\".");
                };

                if (!ref.dst.getPrimaryKey())
                    throw new Error("Referenced table \"" + ref.dst.name() + "\" has no PRIMARY KEY.");

                return {
                    sqlCmd: _.template(query)({
                        table: this.escapeId(ref.src.name()),
                        name: this.escapeId("FK_" + ref.src.name() + "_" + ref.field),
                        field: this.escapeId(ref.field),
                        parent: this.escapeId(ref.dst.name()),
                        key: this.escapeId(ref.dst.getPrimaryKey().name()),
                        parent_action: parent_action
                    }).trim() + ";",
                    params: []
                };
            },

            selectQuery: function (model, predicate) {
                var query = "SELECT <%= fields%> FROM <%= table %>";
                var attrs = [];
                var params = [];
                var self = this;
                _.forEach(model.fields(), function (field) {
                    attrs.push(self.escapeId(field.name()));
                });
                var values = { table: this.escapeId(model.name()), fields: attrs.join(", ") };
                var result = _.template(query)(values).trim();
                if (predicate) {
                    var cond_sql = this._predicateToSql(model, predicate, params);
                    if (cond_sql.length > 0)
                        result += " WHERE " + cond_sql;
                };
                return { sqlCmd: result + ";", params: params, type: this.queryTypes.SELECT, meta: model };
            },

            updateQuery: function (model, vals, predicate, options) {
                var query = "UPDATE <%= table %> SET <%= fields%><%= output %>";
                var attrs = [];
                var self = this;
                var params = [];
                var escVals = this._escapeValues(model, vals, params);
                _.forEach(escVals, function (value, key) {
                    attrs.push(value.id + " = " + value.val);
                });
                var values = {
                    table: this.escapeId(model.name()),
                    output: options && options.output ? options.output : "",
                    fields: attrs.join(", ")
                };
                var result = _.template(query)(values).trim();
                if (predicate) {
                    var cond_sql = this._predicateToSql(model, predicate, params);
                    if (cond_sql.length > 0)
                        result += " WHERE " + cond_sql;
                };
                return { sqlCmd: result + ";", params: params, type: this.queryTypes.UPDATE, meta: model };
            },

            insertQuery: function (model, vals, options) {
                var query = "<%= before %>INSERT INTO <%= table %> (<%= fields%>)<%= output %> VALUES (<%= values%>)<%= after %>";
                var params = [];
                var escVals = this._escapeValues(model, vals, params);
                var attrs = [];
                var values = [];
                var self = this;
                _.forEach(model.fields(), function (field) {
                    var idValPair = escVals[field.name()];
                    if (idValPair) {
                        attrs.push(idValPair.id);
                        values.push(idValPair.val);
                    }
                });
                var data = {
                    before: options && options.before ? options.before : "",
                    output: options && options.output ? options.output : "",
                    after: options && options.after ? options.after : "",
                    table: this.escapeId(model.name()),
                    fields: attrs.join(", "),
                    values: values.join(", ")
                };
                return { sqlCmd: _.template(query)(data).trim() + ";", params: params, type: this.queryTypes.INSERT, meta: model };
            },

            commitTransactionQuery: function () {
                return { sqlCmd: "COMMIT;", params: [] };
            },

            rollbackTransactionQuery: function () {
                return { sqlCmd: "ROLLBACK;", params: [] };
            },

            startTransactionQuery: function () {
                return { sqlCmd: "START TRANSACTION;", params: [] };
            },

            setIsolationLevelQuery: function (isolationLevel) {
                return { sqlCmd: "SET SESSION TRANSACTION ISOLATION LEVEL " + isolationLevel + ";", params: [] };
            },

            setAutocommitQuery: function (autocommit) {
                return { sqlCmd: "SET autocommit = " + (!!autocommit ? 1 : 0) + ";", params: [] };
            },

            escapeId: function (s) {
                return this._addTicks(s);
            },

            escapeValue: function (s, type, params) {
                throw new Error("\"escapeValue\" wasn't implemented in descendant.");
            },

            _predicateToSql: function predicateToString(model, predicate, params) {
                var result = "";
                var cond_arr = [];

                var conds = predicate.getCol("Conditions");

                for (var i = 0; i < conds.count() ; i++) {
                    var cond = conds.get(i);
                    var res = "";
                    if (cond instanceof Predicate)
                        res = this._predicateToSql(model, cond, params);
                    else {

                        var field = model.getField(cond.fieldName());
                        if (!field)
                            throw new Error("Predicate error: Unknown field \"" + cond.fieldName() + "\" in model \"" + model.name() + "\".");

                        var res_vals = "";
                        var vals = cond.getCol("Values");
                        var val_arr = [];

                        for (var j = 0; j < vals.count() ; j++) {
                            var value = vals.get(j).valValue();
                            if (value !== undefined)
                                val_arr.push(this._escapeValue(field, value, params));
                        }
                        if (val_arr.length > 0) {
                            var arg_num = cond.allowedArgNumber();
                            var is_between = cond.op() === "between";
                            var sep = is_between ? " and " : ", ";
                            if (cond.isNegative())
                                res += "(NOT ";
                            res += "(";
                            res += this.escapeId(cond.fieldName()) + " " + cond.op() + " ";
                            var num = arg_num.max === 0 ? val_arr.length : (arg_num.max > val_arr.length ? val_arr.length : arg_num.max);
                            if (arg_num.min > num)
                                throw new Error("Invalid number of arguments: " + num + " for operation \"" + cond.op() + "\".");
                            if ((num > 1) && (!is_between))
                                res += "(";
                            for (j = 0; j < num ; j++) {
                                if (j > 0)
                                    res += sep;
                                res += val_arr[j];
                            };
                            if ((num > 1) && (!is_between))
                                res += ")";
                            res += ")";
                            if (cond.isNegative())
                                res += ")";
                        }
                        else
                            throw new Error("There are no arguments for operation \"" + cond.op() + "\".");
                    };
                    if (res.length > 0)
                        cond_arr.push(res);
                };

                if (cond_arr.length > 0) {
                    if (predicate.isNegative())
                        result += "(NOT ";
                    if (cond_arr.length > 1)
                        result += "(";
                    var op = predicate.isDisjunctive() ? " OR " : " AND ";
                    for (i = 0; i < cond_arr.length; i++) {
                        if (i > 0)
                            result += op;
                        result += cond_arr[i];
                    };
                    if (cond_arr.length > 1)
                        result += ")";
                    if (predicate.isNegative())
                        result += ")";
                };
                return result;
            },

            _escapeValue: function (field, val, params) {
                var value = field.fieldType().isComplex() ? field.fieldType().setValue(val, field.name(), null, true) : val;
                return this.escapeValue(value, field.fieldType(), params);
            },

            _escapeValues: function (model, vals, params) {
                var result = _.cloneDeep(vals);
                var self = this;
                _.forEach(vals, function (val, key) {
                    var field = model.getField(key);
                    if (field) {
                        var value = field.fieldType().isComplex() ? field.fieldType().setValue(val, key, null, true) : val;
                        result[key] = {
                            id: self.escapeId(key),
                            val: self.escapeValue(value, field.fieldType(), params),
                        };
                    };
                });
                return result;
            },

            _addTicks: function (s, tickChar) {
                tickChar = tickChar || this.getProvider().supports.TICK_CHAR;
                return tickChar + this._removeTicks(s, tickChar) + tickChar;
            },

            _removeTicks: function (s, tickChar) {
                tickChar = tickChar || this.getProvider().supports.TICK_CHAR;
                return s.replace(new RegExp(tickChar, 'g'), '');
            },

        });

        return QueryGen;
    }
);