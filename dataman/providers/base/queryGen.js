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
                    attrs.push(self._addTicks(field.name()));
                });
                var values = { table: this._addTicks(model.name()), fields: attrs.join(", ") };
                return _.template(query)(values).trim() + ";";
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