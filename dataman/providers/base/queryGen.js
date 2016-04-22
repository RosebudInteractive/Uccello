if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['fs', 'lodash', '../../../system/utils', '../../../predicate/predicate', '../../../predicate/dsField'],
    function (Fs, _, Utils, Predicate, DsField) {

        var TICK_CHAR = '`';
        var ALIAS_PREFIX = "t";
        var EXTRA_PREFIX = "#";

        var QueryGen = UccelloClass.extend({

            queryTypes: {
                START_TRAN: 1,
                COMMIT_TRAN: 2,
                ROLLBACK_TRAN: 3,
                INSERT: 4,
                SELECT: 5,
                UPDATE: 6,
                DELETE: 7,
                RAW: 8,
                ROWID: 9
            },

            init: function (engine, options) {
                this._engine = engine;
                this._provider = engine.getProvider();
                this._options = options || {};
                this.Meta = engine.Meta;
                this._iniScriptPath = "";
            },

            getNativeLib: function () {
                if (!this._nativeLib)
                    this._nativeLib = this.getProvider().connectionMgr().getNativeLib();
                return this._nativeLib;
            },

            getDbInitialScript: function () {
                var result = null;
                var stat = Fs.statSync(this._iniScriptPath);
                if (stat.isFile()) {
                    var script = Fs.readFileSync(this._iniScriptPath, { encoding: "utf8" });
                    var cmds = script.split("\nGO");
                    result = [];
                    _.forEach(cmds, function (cmd) {
                        if (cmd.trim().length > 0) {
                            result.push({
                                sqlCmd: cmd,
                                params: [],
                                type: this.queryTypes.RAW
                            });
                        };
                    }, this);
                    if (result.length === 0)
                        result = null;
                };
                return result;
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

            getNextRowIdQuery: function (model) {
                throw new Error("\"getNextRowIdQuery\" wasn't implemented in descendant.");
            },

            setTableRowIdQuery: function (model) {
                throw new Error("\"setTableRowIdQuery\" wasn't implemented in descendant.");
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

            _setSqlAliases: function (request, predicate_aliases) {
                function set_sql_aliases(request, cnt) {
                    var alias = predicate_aliases[request.alias];
                    if (!((cnt === 0) && _.isArray(request.childs) && (request.childs.length === 0))) {
                        request.sqlAlias = ALIAS_PREFIX + (++cnt);
                        if (alias)
                            alias.value(request.sqlAlias);
                        _.forEach(request.childs, function (ch_query) {
                            cnt = set_sql_aliases(ch_query, cnt);
                        });
                    }
                    else {
                        var descendants = request.model.getDescendants();
                        if ((descendants.length > 0) || alias) {
                            request.sqlAlias = ALIAS_PREFIX + (++cnt);
                            if (alias)
                                alias.value(request.sqlAlias);
                        }
                    };
                    return cnt;
                };
                return set_sql_aliases(request, 0);
            },

            _escapeField: function (field_name, table_alias, is_fld_only, field_alias) {
                var field = this.escapeId(field_name);
                if (table_alias)
                    field = this.escapeId(table_alias) + "." + field +
                        (is_fld_only ? "" : (" AS " + (field_alias ? this.escapeId(field_alias) : this.escapeId(table_alias + "_" + field_name))));
                return field;
            },

            _escapeTable: function (model, table_alias, childs_info) {
                var table = (typeof (model) === "string") ? this.escapeId(model) : this.getModelSubQuery(model, childs_info);
                if (!table)
                    table = this.escapeId(model.name());
                if (table_alias)
                    table += " AS " + this.escapeId(table_alias);
                return table;
            },

            getModelSubQuery: function (model, childs_info) {
                var res = null;
                var childLevel = model.getChildLevel();
                var descendants = model.getDescendants();
                if ((childLevel > 0) || (descendants.length > 0)) {
                    var query = "(SELECT <%= fields%> FROM <%= tables%>)";
                    var attrs = [];
                    var tables = [];

                    var ancestors = model.getAncestors().concat();
                    ancestors.push(model);
                    var classFields = model.getClassFields();
                    var self = this;

                    _.forEach(classFields, function (classField) {
                        attrs.push(self._escapeField(classField.field.name(), ALIAS_PREFIX + classField.level, true));
                    });

                    var prev_model = null;
                    var table;
                    _.forEach(ancestors, function (cmodel, idx) {
                        table = self._escapeTable(cmodel.name(), ALIAS_PREFIX + idx);
                        if (idx > 0) {
                            table = "JOIN " + table + " ON" + self._escapeField(cmodel.getPrimaryKey().name(), ALIAS_PREFIX + idx, true) + " = " +
                                        self._escapeField(prev_model.getPrimaryKey().name(), ALIAS_PREFIX + (idx - 1), true);
                        };
                        tables.push(table);
                        prev_model = cmodel;
                    });

                    if (descendants.length > 0) {
                        var extra_count = 0;
                        var curr_idx = ancestors.length;
                        var pk_model = self._escapeField(model.getPrimaryKey().name(), ALIAS_PREFIX + (curr_idx - 1), true);

                        childs_info.baseFields = {};
                        _.forEach(classFields, function (classField) {
                            childs_info.baseFields[classField.field.name()] = true;
                        });
                        childs_info.typeFieldName = model.getClassTypeIdField().name();
                        var typedef = childs_info[model.getActualTypeId()] = {};
                        typedef.model = model;
                        typedef.isBase = true;
                        typedef.extraFields = [];

                        childs_info.extraFields = [];

                        function walk_descendants(curr_model, extra_fields) {
                            var curr_dsc = curr_model.getDescendants();
                            _.forEach(curr_dsc, function (cmodel) {
                                typedef = childs_info[cmodel.getActualTypeId()] = {};
                                typedef.model = cmodel;
                                typedef.extraFields = extra_fields.concat();
                                table = self._escapeTable(cmodel.name(), ALIAS_PREFIX + curr_idx);
                                table = "LEFT JOIN " + table + " ON " + self._escapeField(cmodel.getPrimaryKey().name(), ALIAS_PREFIX + curr_idx, true) + " = " +
                                            pk_model;
                                tables.push(table);
                                var own_fields = cmodel.getOwnFields();
                                _.forEach(own_fields, function (field) {
                                    var alias = EXTRA_PREFIX + (++extra_count);
                                    var fname = field.name();
                                    typedef.extraFields.push({ alias: alias, fname: fname });
                                    attrs.push(self._escapeField(fname, ALIAS_PREFIX + curr_idx, false, alias));
                                    childs_info.extraFields.push(alias);
                                });
                                curr_idx++;
                                walk_descendants(cmodel, typedef.extraFields);
                            });
                        };

                        walk_descendants(model, []);
                    };

                    var values = { tables: tables.join(" "), fields: attrs.join(", ") };
                    res = _.template(query)(values).trim();
                };
                return res;
            },

            selectQuery: function (request, predicate) {

                var query = "SELECT <%= fields%>\nFROM <%= tables%>";
                var attrs = [];
                var tables = [];
                var params = [];
                var self = this;

                function req_walk(request, proc) {
                    if (typeof (proc) !== "function")
                        throw new Error("req_walk:\"proc\" argument is not a function.");

                    function _req_walk(request, parent) {
                        proc(request, parent);
                        if (_.isArray(request.childs) && (request.childs.length > 0)) {
                            _.forEach(request.childs, function (ch_query) {
                                _req_walk(ch_query, request);
                            });
                        };
                    };
                    _req_walk(request, null);
                };

                var aliases = predicate ? predicate.getAliases() : {};
                this._setSqlAliases(request, aliases);

                req_walk(request, function (req, parent) {

                    if (req.isStub)
                        return;

                    var childs_info = {};
                    var tbl_expr = self._escapeTable(req.model, req.sqlAlias, childs_info);

                    _.forEach(req.model.getClassFields(), function (class_field) {
                        attrs.push(self._escapeField(class_field.field.name(), req.sqlAlias));
                    });

                    if (childs_info.typeFieldName) {
                        req.childs_info = childs_info;
                        _.forEach(childs_info.extraFields, function (extra_field) {
                            attrs.push(self._escapeField(extra_field, req.sqlAlias));
                        });
                        delete childs_info.extraFields;
                    };

                    var tbl = null;
                    if (parent) {
                        var parent_name = parent.model.name()
                        var parents = parent.model.getParentNames();
                        var tbl_name = req.model.name()
                        var refs = req.model.outgoingClassLinks();
                        if (refs) {
                            var keys = Object.keys(refs);
                            for (var i = 0; i < keys.length; i++) {
                                if (refs[keys[i]].dst && (parents[refs[keys[i]].dstName]) &&
                                    ((!req.parentField)||(req.parentField === keys[i]))) {
                                    if (!req.parentField)
                                        req.parentField = keys[i];
                                    tbl = "LEFT JOIN " + tbl_expr +
                                        " ON " + self._escapeField(keys[i], req.sqlAlias, true) + " = " +
                                        self._escapeField(parent.model.getClassPrimaryKey().name(), parent.sqlAlias, true);
                                    break;
                                }
                            };
                        };
                        if (!tbl)
                            throw new Error("\"" + tbl_name + "\" has no parent \"" + parent_name + "\".");
                    }
                    else
                        tbl = tbl_expr;
                    tables.push(tbl);
                });

                var values = { tables: tables.join("\n  "), fields: attrs.join(", ") };
                var result = _.template(query)(values).trim();
                if (predicate) {
                    var cond_sql = this._predicateToSql(request.model, predicate, params, request.sqlAlias, true);
                    if (cond_sql.length > 0)
                        result += "\nWHERE " + cond_sql;
                };
                return { sqlCmd: result + ";", params: params, type: this.queryTypes.SELECT, meta: request };
            },

            updateQuery: function (model, vals, predicate, options) {
                // Предикаты пока не поддерживаем (из-за наследования)
                //
                var query = "UPDATE <%= table %> SET <%= fields%><%= output %>";

                var curr_vals = _.cloneDeep(vals || {});

                var ancestors = model.getAncestors().concat();
                ancestors.push(model);
                var base_model = ancestors[0];

                var tp_field = base_model.getTypeIdField();
                if (tp_field) {
                    var tp_fname = tp_field.name();
                    var val = curr_vals[tp_fname];
                    if ((typeof (val) != "undefined") && (val != model.getActualTypeId()))
                        throw new Error("Invalid \"" + model.name() + "\" object type: " +
                            val + ". Correct one is " + model.getActualTypeId() + ".");
                };

                var batch = [];
                var row_version = Utils.guid();

                var self = this;
                _.forEach(ancestors, function (curr_model, idx) {
                    var attrs = [];
                    var params = [];

                    var rw = curr_model.getRowVersionField();
                    if (rw && options.rowVersion)
                        curr_vals[rw.name()] = row_version;

                    var escVals = self._escapeValues(curr_model, curr_vals, params);
                    _.forEach(escVals, function (value, key) {
                        attrs.push(value.id + " = " + value.val);
                    });
                    var values = {
                        table: self.escapeId(curr_model.name()),
                        output: options && options.output ? options.output : "",
                        fields: attrs.join(", ")
                    };
                    var result = _.template(query)(values).trim();
                    if (options.key) {

                        var curr_predicate = self._engine.newPredicate();
                        curr_predicate.addCondition({ field: curr_model.getPrimaryKey().name(), op: "=", value: options.key });
                        if (options.rowVersion && rw)
                            curr_predicate.addCondition({ field: rw.name(), op: "=", value: options.rowVersion });

                        var cond_sql = self._predicateToSql(curr_model, curr_predicate, params);
                        if (cond_sql.length > 0)
                            result += " WHERE " + cond_sql;
                        self._engine.releasePredicate(curr_predicate);
                    }
                    else
                        throw new Error("Update operation without PRIMARY KEY value isn't allowed.");
                    batch.push({ sqlCmd: result + ";", params: params, type: self.queryTypes.UPDATE, meta: curr_model, rowVersion: row_version });
                });
                return batch;
            },

            deleteQuery: function (model, predicate, options) {
                // Предикаты пока не поддерживаем (из-за наследования)
                //
                var query = "DELETE FROM <%= table %>";
                var attrs = [];
                var self = this;
                var params = [];

                var base_model = model.getBaseModel();
                var values = { table: this.escapeId(base_model.name()) };
                var result = _.template(query)(values).trim();

                if (options.key) {

                    var curr_predicate = self._engine.newPredicate();
                    curr_predicate.addCondition({ field: base_model.getPrimaryKey().name(), op: "=", value: options.key });
                    var rw = base_model.getRowVersionField();
                    if (options.rowVersion && rw)
                        curr_predicate.addCondition({ field: rw.name(), op: "=", value: options.rowVersion });

                    var cond_sql = self._predicateToSql(base_model, curr_predicate, params);
                    if (cond_sql.length > 0)
                        result += " WHERE " + cond_sql;
                    self._engine.releasePredicate(curr_predicate);
                }
                else
                    throw new Error("Delete operation without PRIMARY KEY value isn't allowed.");

                return { sqlCmd: result + ";", params: params, type: this.queryTypes.DELETE, meta: base_model };
            },

            insertQuery: function (model, vals, options) {
                var query = "<%= before %>INSERT INTO <%= table %> (<%= fields%>)<%= output %> VALUES (<%= values%>)<%= after %>";
                var params = [];

                var ancestors = model.getAncestors().concat();
                ancestors.push(model);
                var base_model = ancestors[0];

                var curr_vals = _.cloneDeep(vals || {});
                var row_version = Utils.guid();
                var rw = base_model.getRowVersionField();
                if (rw)
                    curr_vals[rw.name()] = row_version;

                var insertId;
                var pk = base_model.getPrimaryKey();
                if (pk && curr_vals[pk.name()]) {
                    insertId = curr_vals[pk.name()];
                };

                var tp_val;
                var tp_field = base_model.getTypeIdField();
                if (tp_field) {
                    var tp_fname = tp_field.name();
                    var val = tp_val = curr_vals[tp_fname];
                    if (!val)
                        curr_vals[tp_fname] = tp_val = model.getActualTypeId()
                    else
                        if (val != model.getActualTypeId())
                            throw new Error("Invalid \"" + model.name() + "\" object type: " +
                                val + ". Correct one is " + model.getActualTypeId() + ".");
                };

                var batch = [];
                var self = this;
                _.forEach(ancestors, function (curr_model, idx) {

                    pk = curr_model.getPrimaryKey();
                    if (pk && insertId)
                        curr_vals[pk.name()] = insertId;
                    rw = curr_model.getRowVersionField();
                    if (rw && row_version)
                        curr_vals[rw.name()] = row_version;

                    var escVals = self._escapeValues(curr_model, curr_vals, params);
                    var attrs = [];
                    var values = [];

                    _.forEach(escVals, function (val, key) {
                        attrs.push(val.id);
                        values.push(val.val);
                    });

                    var data = {
                        before: options && options.before ? options.before : "",
                        output: options && options.output ? options.output : "",
                        after: options && options.after ? options.after : "",
                        table: self.escapeId(curr_model.name()),
                        fields: attrs.join(", "),
                        values: values.join(", ")
                    };

                    batch.push({
                        sqlCmd: _.template(query)(data).trim() + ";",
                        params: params, type: self.queryTypes.INSERT,
                        meta: curr_model,
                        rowVersion: row_version,
                        insertId: insertId
                    });
                });
                return batch;
            },

            execSql: function (sql) {
                var curr_dialect = this.getProvider().providerId;
                var cmd = (sql && sql.dialect && sql.dialect[curr_dialect]) ? sql.dialect[curr_dialect] : (sql.cmd ? sql.cmd : null);
                if (!cmd)
                    throw new Error("Empty SQL command !");
                var result;
                if (_.isArray(cmd)) {
                    result = [];
                    _.forEach(cmd, function (item) {
                        result.push({ sqlCmd: item + ";", params: [], type: this.queryTypes.RAW });
                    }, this);
                }
                else
                    result = { sqlCmd: cmd + ";", params: [], type: this.queryTypes.RAW };
                return result;
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

            _predicateToSql: function predicateToString(model, predicate, params, table_alias, use_class_fields) {
                var result = "";
                var cond_arr = [];
                var self = this;

                function convertArg(arg) {
                    var result;
                    if (arg instanceof DsField) {
                        var val = arg.valValue();
                        var alias = val.alias ? val.alias : table_alias;
                        if (val.aliasName && (!val.alias))
                            throw new Error("Predicate error: Alias \"" + val.aliasName + "\" value is undefined! Field: \"" + val.field + "\".");

                        result = self._escapeField(val.field, alias, true);
                    }
                    else {
                        var value = arg.valValue();
                        var valType = arg.valType();
                        if (value !== undefined)
                            result = self._escapeValue(valType, value, params);
                    };
                    return result;
                }

                var conds = predicate.getCol("Conditions");

                for (var i = 0; i < conds.count() ; i++) {
                    var cond = conds.get(i);
                    var res = "";
                    if (cond instanceof Predicate)
                        res = this._predicateToSql(model, cond, params, table_alias);
                    else {

                        var left_side = (cond.getCol("LeftValues").count() === 1) ? convertArg(cond.getCol("LeftValues").get(0)) : null;

                        //var field = use_class_fields ? model.getClassField(cond.fieldName()) : model.getField(cond.fieldName());
                        //if (!field)
                        //    throw new Error("Predicate error: Unknown field \"" + cond.fieldName() + "\" in model \"" + model.name() + "\".");

                        var res_vals = "";
                        var vals = cond.getCol("RightValues");
                        var val_arr = [];

                        for (var j = 0; j < vals.count() ; j++) {
                            var value = convertArg(vals.get(j));
                            if (value !== undefined)
                                val_arr.push(value);
                        }
                        if (left_side && (val_arr.length > 0)) {
                            var arg_num = cond.allowedArgNumber();
                            var is_between = cond.op() === "between";
                            var is_in = cond.op() === "in";
                            var sep = is_between ? " and " : ", ";
                            if (cond.isNegative())
                                res += "(NOT ";
                            res += "(";
                            res += left_side + " " + cond.op() + " ";
                            var num = arg_num.max === 0 ? val_arr.length : (arg_num.max > val_arr.length ? val_arr.length : arg_num.max);
                            if (arg_num.min > num)
                                throw new Error("Invalid number of arguments: " + num + " for operation \"" + cond.op() + "\".");
                            var need_parenthesis = ((num > 1) && (!is_between)) || is_in;
                            if (need_parenthesis)
                                res += "(";
                            for (j = 0; j < num ; j++) {
                                if (j > 0)
                                    res += sep;
                                res += val_arr[j];
                            };
                            if (need_parenthesis)
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

            _escapeValue: function (valType, val, params) {
                var value = valType.isComplex() ? valType.setValue(val, "", null, true) : val;
                return this.escapeValue(value, valType, params);
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
                    }
                    else
                        delete result[key];
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