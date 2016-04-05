if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
};

var currPath = __dirname;

define(
    ['fs', 'path', '../base/queryGen', 'lodash', UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType'],
    function (Fs, Path, Base, _, MemMetaType) {

        var iniScriptPath = Path.resolve(currPath, "./scripts/dbInit.sql");
        var ROWID_TABLE_PREFIX = "__GEN_ROWID_";

        var MSSQLQueryGen = Base.extend({

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
                this._iniScriptPath = iniScriptPath;
            },

            showForeignKeysQuery: function (src_name, dst_name) {
                var params = {};
                var sql_params = [];
                var stringType = (MemMetaType.createTypeObject("datatype", this.getEngine().getDB()))
                    .setValue({ type: "string", length: 255 });
                params.db = this.escapeValue(this._options.database, stringType, sql_params);

                var query = "SELECT DISTINCT c.CONSTRAINT_NAME AS fk_name, s.TABLE_NAME AS src_table, d.TABLE_NAME AS dst_table\n" +
                    " FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS c\n" +
                    " JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE s ON s.CONSTRAINT_NAME=c.CONSTRAINT_NAME\n" +
                    " JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE d ON d.CONSTRAINT_NAME=c.UNIQUE_CONSTRAINT_NAME\n" +
                    " WHERE c.CONSTRAINT_CATALOG = <%= db %>";

                if (src_name) {
                    query += "\n  AND s.TABLE_NAME = <%= src %>";
                    params.src = this.escapeValue(src_name, stringType, sql_params);
                };

                if (dst_name) {
                    query += "\n  AND d.TABLE_NAME = <%= dst %>";
                    params.dst = this.escapeValue(dst_name, stringType, sql_params);
                };

                return { sqlCmd: _.template(query)(params).trim() + ";", params: sql_params };
            },

            dropForeignKeyQuery: function (table_name, fk_name) {
                var query = "ALTER TABLE <%= table_name %> DROP CONSTRAINT <%= fk_name %>";
                return {
                    sqlCmd: _.template(query)({ table_name: this.escapeId(table_name), fk_name: this.escapeId(fk_name) }).trim() + ";",
                    params: []
                };
            },

            dropTableQuery: function (model) {
                var query = "IF OBJECT_ID('<%= table %>', 'U') IS NOT NULL DROP TABLE <%= table %>";
                var batch = [];
                batch.push({ sqlCmd: _.template(query)({ table: this.escapeId(ROWID_TABLE_PREFIX + model.name()) }).trim() + ";", params: [] });
                batch.push({ sqlCmd: _.template(query)({ table: this.escapeId(model.name()) }).trim() + ";", params: [] });
                return batch;
            },

            createTableQuery: function (model) {
                var query = "IF OBJECT_ID('<%= table %>', 'U') IS NULL CREATE TABLE <%= table %> (<%= fields%>)";
                var query_gen = "IF OBJECT_ID('<%= table %>', 'U') IS NULL CREATE TABLE <%= table %> ([Id] int IDENTITY(1,1) NOT NULL, [fake] tinyint NULL)";

                var self = this;
                var batch = [];
                var attrs = [];
                var provider = this.getProvider();

                _.forEach(model.fields(), function (field) {
                    var flags = field.flags() | 0;
                    attrs.push(self.escapeId(field.name()) + " " + field.fieldType().toSql(provider, field) +
                        ((((flags & self.Meta.Field.PrimaryKey) !== 0) || (!field.fieldType().allowNull())) ? " NOT NULL" : "") +
                        (((flags & self.Meta.Field.AutoIncrement) !== 0) ? " IDENTITY(1,1)" : ""));
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
                    batch.push({ sqlCmd: _.template(query_gen)({ table: this.escapeId(ROWID_TABLE_PREFIX + model.name()) }).trim() + ";", params: [] });

                return batch;
            },

            commitTransactionQuery: function () {
                return { sqlCmd: "COMMIT TRANSACTION;", params: [], type: this.queryTypes.COMMIT_TRAN };
            },

            rollbackTransactionQuery: function () {
                return { sqlCmd: "ROLLBACK TRANSACTION;", params: [], type: this.queryTypes.ROLLBACK_TRAN };
            },

            startTransactionQuery: function () {
                return { sqlCmd: "BEGIN TRANSACTION;", params: [], type: this.queryTypes.START_TRAN };
            },

            setIsolationLevelQuery: function (isolationLevel) {
                return { sqlCmd: "SET TRANSACTION ISOLATION LEVEL " + isolationLevel + ";", params: [] };
            },

            setAutocommitQuery: function (autocommit) {
                return null;
            },

            createLinkQuery: function (ref) {
                var query = "ALTER TABLE <%= table %> ADD CONSTRAINT <%= name %> FOREIGN KEY (<%= field %>) REFERENCES " +
                    "<%= parent %> (<%= key %>) ON DELETE <%= parent_action %>";
                var ref_action = ref.type.refAction();
                var parent_action = "NO ACTION";

                switch (ref_action) {
                    case "parentRestrict":
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

            updateQuery: function (model, vals, predicate, options) {
                //var opts = _.cloneDeep(options || {});
                //var rw = model.getRowVersionField();
                //if (rw)
                //    opts.output = " OUTPUT INSERTED." + this.escapeId(rw.name()) + " AS rowVersion";
                //var updateCmd = UccelloClass.super.apply(this, [model, vals, predicate, opts]);
                var updateCmd = UccelloClass.super.apply(this, [model, vals, predicate, options]);
                return updateCmd;
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

                var query = "EXEC _sys_sp_set_row_id @TableName = <%= table %>, @RowIdTableName = <%= rid_table %>, @RowIdFieldName = <%= pk %>";
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

                var query = "EXEC _sys_sp_get_row_id @TableName = <%= table %>";
                return {
                    sqlCmd: _.template(query)(vals).trim() + ";",
                    params: sql_params,
                    type: this.queryTypes.ROWID
                };
            },

            insertQuery: function (model, vals) {
                var options = {};

                //var rw = model.getRowVersionField();
                //if (rw)
                //    options.output = " OUTPUT INSERTED." + this.escapeId(rw.name()) + " AS rowVersion";

                var insertCmd = UccelloClass.super.apply(this, [model, vals, options]);

                //var pk = model.getPrimaryKey();
                //if (pk && vals[pk.name()]) {
                //    insertCmd.insertId = vals[pk.name()];
                //}

                return insertCmd;
            },

            escapeValue: function (s, type, params) {
                var pname = "p" + params.length;
                params.push({ name: pname, type: type, val: s });
                return "@" + pname;
            },

            escapeId: function (identifier) {
                return '[' + identifier.replace(/[\[\]']+/g, '') + ']';
            }
        });

        return MSSQLQueryGen;
    }
);