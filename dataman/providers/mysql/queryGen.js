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

            showForeignKeysQuery: function (src_name, dst_name) {
                var params = {};
                params.db = this.escapeValue(this._options.database);

                var query = "SELECT DISTINCT k.CONSTRAINT_NAME AS fk_name, c.TABLE_NAME AS src_table, k.REFERENCED_TABLE_NAME AS dst_table\n"+
                    " FROM information_schema.TABLE_CONSTRAINTS c\n" +
                    " JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k on k.TABLE_SCHEMA = c.TABLE_SCHEMA\n" +
                    " AND k.CONSTRAINT_NAME = c.CONSTRAINT_NAME\n" +
                    " WHERE c.CONSTRAINT_TYPE = 'FOREIGN KEY'\n" +
                    " AND c.TABLE_SCHEMA = <%= db %>";

                if (src_name) {
                    query += "\n  AND c.TABLE_NAME = <%= src %>";
                    params.src = this.escapeValue(src_name);
                };

                if (dst_name) {
                    query += "\n  AND k.REFERENCED_TABLE_NAME = <%= dst %>";
                    params.dst = this.escapeValue(dst_name);
                };

                return _.template(query)(params).trim() + ";";
            },

            dropForeignKeyQuery: function (table_name, fk_name) {
                var query = "ALTER TABLE <%= table_name %> DROP FOREIGN KEY <%= fk_name %>";
                return _.template(query)({ table_name: this.escapeId(table_name), fk_name: this.escapeId(fk_name) }).trim() + ";";
            },

            dropTableQuery: function (model) {
                var query = "DROP TABLE IF EXISTS <%= table %>";
                return _.template(query)({ table: this.escapeId(model.name()) }).trim() + ";";
            },

            createTableQuery: function (model) {
                var query = "CREATE TABLE IF NOT EXISTS <%= table %> (<%= fields%>) ENGINE=<%= engine%>";
                var self = this;
                var attrs = [];
                var provider = this.getProvider();
                _.forEach(model.fields(), function (field) {
                    var flags = field.flags() | 0;
                    attrs.push(self.escapeId(field.name()) + " " + field.fieldType().toSql(provider) +
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