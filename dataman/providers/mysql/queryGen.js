if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/queryGen', 'lodash'],
    function (Base, _) {

        var MySqlQueryGen = Base.extend({

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
            },

            dropTableQuery: function (model) {
                var query = "DROP TABLE IF EXISTS <%= table %>";
                return _.template(query)({ table: this.escapeId(model.name()) }).trim() + ";";
            },

            createTableQuery: function (model) {
                var query = "CREATE TABLE IF NOT EXISTS <%= table %> (<%= fields%>) ENGINE=<%= engine%>";
                var self = this;
                var attrs = [];
                _.forEach(model.fields(), function (field) {
                    var flags = field.flags() | 0;
                    attrs.push(self.escapeId(field.name()) + " " + field.fieldType().toSql() +
                        ((((flags & self.Meta.Field.PrimaryKey) !== 0) || (!field.fieldType().allowNull())) ? " NOT NULL" : "") +
                        (((flags & self.Meta.Field.AutoIncrement) !== 0) ? " auto_increment" : ""));
                });
                if (model.getPrimaryKey()) {
                    attrs.push("PRIMARY KEY (" + this.escapeId(model.getPrimaryKey().name()) + ")");
                };
                var values = {
                    table: this.escapeId(model.name()),
                    fields: attrs.join(", "),
                    engine: this._options.provider_options.engine
                };
                return _.template(query)(values).trim() + ";";
            },

            escapeValue: function (s) {
                return this.getNativeLib().escape(s);
            },

            escapeId: function (s) {
                return this.getNativeLib().escapeId(s);
            },

        });

        return MySqlQueryGen;
    }
);