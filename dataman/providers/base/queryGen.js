if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['lodash'],
    function (_) {

        var QueryGen = UccelloClass.extend({

            init: function (engine, options) {
                this._engine = engine;
            },

            dropTableQuery: function (model) {
                throw new Error("\"dropTableQuery\" wasn't implemented in descendant.");
            },

            createTableQuery: function (model) {
                throw new Error("\"createTableQuery\" wasn't implemented in descendant.");
            },

            selectQuery: function (model) {
                var query = "SELECT <%= fields%> FROM <%= table %>";
                var attrs = [];
                _.forEach(model.fields(), function (field) {
                    attrs.push(field.name());
                });
                var values = { table: model.name(), fields: attrs.join(", ") };
                return _.template(query)(values).trim() + ";";
            },

        });

        return QueryGen;
    }
);