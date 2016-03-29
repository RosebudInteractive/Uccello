if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

var currPath = __dirname;

define(
    ['path', '../../../system/utils', '../base/queryGen', 'lodash', UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType'],
    function (Path, Utils, Base, _, MemMetaType) {

        var iniScriptPath = Path.resolve(currPath, "./scripts/dbInit.sql");
        var ROWID_TABLE_PREFIX = "__GEN_ROWID_";

        var MySqlQueryGen = Base.extend({

            ROW_VERSION_INIT_VAL: 1,

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
                this._iniScriptPath = iniScriptPath;
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
                var batch = [];
                batch.push({
                    sqlCmd: _.template(query)({ table: this.escapeId(model.name()) }).trim() + ";",
                    params: []
                });
                batch.push({
                    sqlCmd: _.template(query)({ table: this.escapeId(ROWID_TABLE_PREFIX + model.name()) }).trim() + ";",
                    params: []
                });
                return batch;
            },

            createTableQuery: function (model) {
                var query = "CREATE TABLE IF NOT EXISTS <%= table %> (<%= fields%>) ENGINE=<%= engine%>";
                var query_gen = "CREATE TABLE IF NOT EXISTS <%= table %> (`Id` int NOT NULL auto_increment, `fake` int, PRIMARY KEY (`Id`)) ENGINE=<%= engine%>";

                var self = this;
                var batch = [];
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
                batch.push({ sqlCmd: _.template(query)(values).trim() + ";", params: [] });
                if (model.getChildLevel() === 0)
                    batch.push({
                        sqlCmd: _.template(query_gen)(
                            {
                                table: this.escapeId(ROWID_TABLE_PREFIX + model.name()),
                                engine: this._options.provider_options.engine
                            }).trim() + ";", params: []
                    });

                return batch;
            },

            setTableRowIdQuery: function (model) {
                var vals = {};
                var sql_params = [];
                var base_model = model.getBaseModel();
                var stringType = (MemMetaType.createTypeObject("datatype", this.getEngine().getDB()))
                    .setValue({ type: "string", length: 255 });
                vals.table = this.escapeValue(base_model.name(), stringType, sql_params);
                vals.rid_table = this.escapeValue(ROWID_TABLE_PREFIX + base_model.name(), stringType, sql_params);
                vals.pk = this.escapeValue(base_model.getPrimaryKey().name(), stringType, sql_params);

                var query = "CALL _sys_sp_set_row_id(<%= table %>, <%= rid_table %>, <%= pk %>, NULL)";
                return {
                    sqlCmd: _.template(query)(vals).trim() + ";",
                    params: sql_params,
                };
            },

            getNextRowIdQuery: function (model) {
                var vals = {};
                var sql_params = [];
                var base_model = model.getBaseModel();
                var stringType = (MemMetaType.createTypeObject("datatype", this.getEngine().getDB()))
                    .setValue({ type: "string", length: 255 });
                vals.table = this.escapeValue(ROWID_TABLE_PREFIX + base_model.name(), stringType, sql_params);

                var query = "CALL _sys_sp_get_row_id(<%= table %>)";
                return {
                    sqlCmd: _.template(query)(vals).trim() + ";",
                    params: sql_params,
                    type: this.queryTypes.ROWID
                };
            },

            escapeValue: function (s, type, params) {
                return this.getNativeLib().escape(s);
            },

            escapeId: function (s) {
                return this.getNativeLib().escapeId(s);
            },

        });

        return MySqlQueryGen;
    }
);