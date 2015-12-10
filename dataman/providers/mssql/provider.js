/**
 *  ќбеспечивает работу [dataObjectEngine] с MSSQL RDBMS,
 *    переопредел€€ поведение базового класса [baseProvider].
 *
 *    »спользует http://pekim.github.io/tedious/index.html
 *      »нсталл€ци€: npm install tedious
 *
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['lodash', '../base/baseProvider', './connectionMgr', './queryExec', './queryGen', './sqlTypes'],
    function (_, Base, ConnectionMgr, QueryExec, QueryGen, SqlTypes) {

        var PROVIDER_ID = "mssql";

        var supports = _.merge(_.cloneDeep(Base.prototype.supports), {
            'DEFAULT': true,
            'DEFAULT VALUES': true,
            'LIMIT ON UPDATE': true,
            'ORDER NULLS': false,
            lock: false,
            transactions: false,
            migrations: false,
            upserts: false,
            returnValues: {
                output: true
            },
            schemas: true,
            autoIncrement: {
                identityInsert: true,
                defaultValue: false,
                update: false
            },
            constraints: {
                restrict: false
            },
            index: {
                collate: false,
                length: false,
                parser: false,
                type: true,
                using: false,
            },

            TICK_CHAR: '"',
            TICK_CHAR_LEFT: '[',
            TICK_CHAR_RIGHT: ']'
        });

        var defaultMySqlConfig = {
            port: 1433,
            connection_options: {
                connectTimeout: 15000,
                requestTimeout: 15000
            }
        };

        var MSSQLProvider = Base.extend({

            providerId: PROVIDER_ID,

            supports: supports,

            query: QueryExec,

            init: function (engine, options) {
                var opts = _.defaultsDeep(options ? _.cloneDeep(options) : {}, defaultMySqlConfig);
                UccelloClass.super.apply(this, [engine, opts]);
            },

            _createConnectionMgr: function () {
                return new ConnectionMgr(this._engine, this._options);
            },

            _createQueryGen: function () {
                return new QueryGen(this._engine, this._options);
            },

            _createSqlTypes: function () {
                return new SqlTypes(this._engine, this._options);
            }
        });
        return MSSQLProvider;
    }
);