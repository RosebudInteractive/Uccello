if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/queryGen', 'lodash', UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType'],
    function (Base, _, MemMetaType) {

        var MySqlQueryGen = Base.extend({

            ROW_VERSION_INIT_VAL: 1,

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
            },

            showForeignKeysQuery: function (src_name, dst_name) {
                var params = {};
                var sql_params = [];
                var stringType = MemMetaType.createTypeObject({ type: "string", length: 255 }, null);
                params.db = this.escapeValue(this._options.database, stringType, sql_params);

                var query = "SELECT DISTINCT k.CONSTRAINT_NAME AS fk_name, c.TABLE_NAME AS src_table, k.REFERENCED_TABLE_NAME AS dst_table\n"+
                    " FROM information_schema.TABLE_CONSTRAINTS c\n" +
                    " JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k on k.TABLE_SCHEMA = c.TABLE_SCHEMA\n" +
                    " AND k.CONSTRAINT_NAME = c.CONSTRAINT_NAME\n" +
                    " WHERE c.CONSTRAINT_TYPE = 'FOREIGN KEY'\n" +
                    " AND c.TABLE_SCHEMA = <%= db %>";

                if (src_name) {
                    query += "\n  AND c.TABLE_NAME = <%= src %>";
                    params.src = this.escapeValue(src_name, stringType, sql_params);
                };

                if (dst_name) {
                    query += "\n  AND k.REFERENCED_TABLE_NAME = <%= dst %>";
                    params.dst = this.escapeValue(dst_name, stringType, sql_params);
                };

                return { sqlCmd: _.template(query)(params).trim() + ";", params: sql_params };
            },

            dropForeignKeyQuery: function (table_name, fk_name) {
                var query = "ALTER TABLE <%= table_name %> DROP FOREIGN KEY <%= fk_name %>";
                return {
                    sqlCmd: _.template(query)({ table_name: this.escapeId(table_name), fk_name: this.escapeId(fk_name) }).trim() + ";",
                    params: []
                };
            },

            dropTableQuery: function (model) {
                var query = "DROP TABLE IF EXISTS <%= table %>";
                return {
                    sqlCmd: _.template(query)({ table: this.escapeId(model.name()) }).trim() + ";",
                    params: []
                };
            },

            createTableQuery: function (model) {
                var query = "CREATE TABLE IF NOT EXISTS <%= table %> (<%= fields%>) ENGINE=<%= engine%>";
                var self = this;
                var attrs = [];
                var provider = this.getProvider();
                _.forEach(model.fields(), function (field) {
                    var flags = field.flags() | 0;
                    attrs.push(self.escapeId(field.name()) + " " + field.fieldType().toSql(provider, field) +
                        ((((flags & self.Meta.Field.PrimaryKey) !== 0) || (!field.fieldType().allowNull())) ? " NOT NULL" : "") +
                        (((flags & self.Meta.Field.AutoIncrement) !== 0) ? " auto_increment" : "")+
                        (((flags & self.Meta.Field.RowVersion) !== 0) ? " DEFAULT " + self.ROW_VERSION_INIT_VAL : "")
                        );
                });
                if (model.getPrimaryKey()) {
                    attrs.push("PRIMARY KEY (" + this.escapeId(model.getPrimaryKey().name()) + ")");
                };
                var values = {
                    table: this.escapeId(model.name()),
                    fields: attrs.join(", "),
                    engine: this._options.provider_options.engine
                };
                return { sqlCmd: _.template(query)(values).trim() + ";", params: [] };
            },

            updateQuery: function (model, vals, predicate, options) {
                var opts = _.cloneDeep(options || {});
                var mysql_vals = _.cloneDeep(vals || {});
                var rw = model.getRowVersionField();
                var row_version;
                if (rw && opts.rowVersion) {
                    row_version = ((opts.rowVersion | 0) + 1) & 0x7FFFFFFF;
                    if (!row_version)
                        row_version = this.ROW_VERSION_INIT_VAL;
                    mysql_vals[rw.name()] = row_version;
                };
                var updateCmd = UccelloClass.super.apply(this, [model, mysql_vals, predicate, opts]);
                updateCmd.rowVersion = row_version.toString();
                return updateCmd;
            },

            insertQuery: function (model, vals) {
                var mysql_vals = _.cloneDeep(vals || {});
                var rw = model.getRowVersionField();
                if (rw)
                    mysql_vals[rw.name()] = this.ROW_VERSION_INIT_VAL;
                var insertCmd = UccelloClass.super.apply(this, [model, mysql_vals]);
                insertCmd.rowVersion = this.ROW_VERSION_INIT_VAL.toString();
                return insertCmd;
            },

            escapeValue: function (s, type, params) {
                var val = s;
                if (type.isRowVersionType && (typeof (s) === "string"))
                    val = s | 0;
                return this.getNativeLib().escape(val);
            },

            escapeId: function (s) {
                return this.getNativeLib().escapeId(s);
            },

        });

        return MySqlQueryGen;
    }
);