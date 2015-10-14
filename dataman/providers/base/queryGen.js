if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['lodash'],
    function (_) {

        var TICK_CHAR= '`';

        var QueryGen = UccelloClass.extend({

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

            createLinkQuery: function (ref) {
                var query = "ALTER TABLE <%= table %> ADD CONSTRAINT <%= name %> FOREIGN KEY (<%= field %>) REFERENCES "+
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

                return _.template(query)({
                    table: this.escapeId(ref.src.name()),
                    name: this.escapeId("FK_" + ref.src.name() + "_" + ref.field),
                    field: this.escapeId(ref.field),
                    parent: this.escapeId(ref.dst.name()),
                    key: this.escapeId(ref.dst.getPrimaryKey().name()),
                    parent_action: parent_action
                }).trim() + ";";
            },

            selectQuery: function (model, predicate) {
                var query = "SELECT <%= fields%> FROM <%= table %>";
                var attrs = [];
                var self = this;
                _.forEach(model.fields(), function (field) {
                    attrs.push(self.escapeId(field.name()));
                });
                var values = { table: this.escapeId(model.name()), fields: attrs.join(", ") };
                var result = _.template(query)(values).trim();
                if (predicate) {
                    var escVals = this._escapeValues(model, predicate);
                    var self = this;
                    var conditions = [];
                    _.forEach(escVals, function (value, key) {
                        if (model.getField(key)) {
                            conditions.push("(" + value.id + " = " + value.val + ")");
                        } else
                            throw new Error("Predicate error: Unknown field \"" + key + "\" in model \"" + model.name() + "\".");
                    });
                    if (conditions.length > 0) {
                        result += " WHERE " + conditions.join(" AND ");
                    };
                };
                return result + ";";
            },

            updateQuery: function (model, vals, predicate) {
                var query = "UPDATE <%= table %> SET <%= fields%>";
                var attrs = [];
                var self = this;
                var escVals = this._escapeValues(model, vals);
                _.forEach(escVals, function (value, key) {
                    attrs.push(value.id + " = " + value.val);
                });
                var values = { table: this.escapeId(model.name()), fields: attrs.join(", ") };
                var result = _.template(query)(values).trim();
                if (predicate) {
                    escVals = this._escapeValues(model, predicate);
                    var conditions = [];
                    _.forEach(escVals, function (value, key) {
                        if (model.getField(key)) {
                            conditions.push("(" + value.id + " = " + value.val + ")");
                        } else
                            throw new Error("Predicate error: Unknown field \"" + key + "\" in model \"" + model.name() + "\".");
                    });
                    if (conditions.length > 0) {
                        result += " WHERE " + conditions.join(" AND ");
                    };
                };
                return result + ";";
            },

            insertQuery: function (model, vals) {
                var query = "INSERT INTO <%= table %> (<%= fields%>) VALUES (<%= values%>)";
                var escVals = this._escapeValues(model, vals);
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
                var data = { table: this.escapeId(model.name()), fields: attrs.join(", "), values: values.join(", ") };
                return _.template(query)(data).trim() + ";";
            },

            escapeId: function (s) {
                return this._addTicks(s);
            },

            escapeValue: function (model, vals) {
                throw new Error("\"escapeValue\" wasn't implemented in descendant.");
            },

            _escapeValues: function (model, vals) {
                var result = _.cloneDeep(vals);
                var self = this;
                _.forEach(vals, function (val, key) {
                    var field = model.getField(key);
                    if (field) {
                        var value = field.fieldType().isComplex() ? field.fieldType().setValue(val, key, null, true) : val;
                        result[key] = {
                            id: self.escapeId(key),
                            val: self.escapeValue(value),
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