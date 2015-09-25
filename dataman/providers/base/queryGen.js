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
            },

            getNativeLib: function () {
                if (!this._nativeLib)
                    this._nativeLib = this.getProvider().connectionMgr().getNativeLib();
                return this._nativeLib;
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

            selectQuery: function (model) {
                var query = "SELECT <%= fields%> FROM <%= table %>";
                var attrs = [];
                var self = this;
                _.forEach(model.fields(), function (field) {
                    attrs.push(self.escapeId(field.name()));
                });
                var values = { table: this.escapeId(model.name()), fields: attrs.join(", ") };
                return _.template(query)(values).trim() + ";";
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