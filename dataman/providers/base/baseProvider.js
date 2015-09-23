if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../../dataObjectEngine', './connectionMgr', './queryExec', './queryGen', './sqlTypes'],
    function (Engine, ConnectionMgr, QueryExec, QueryGen, SqlTypes) {

        var PROVIDER_ID = "unknown";

        var BaseProvider = UccelloClass.extend({

            providerId: PROVIDER_ID,

            query: QueryExec,

            supports: {
                'DEFAULT': true,
                'DEFAULT VALUES': false,
                'VALUES ()': false,
                'LIMIT ON UPDATE': false,
                'ON DUPLICATE KEY': true,
                'ORDER NULLS': false,

                /* What is the dialect's keyword for INSERT IGNORE */
                'IGNORE': '',

                /* does the dialect support returning values for inserted/updated fields */
                returnValues: false,

                /* features specific to autoIncrement values */
                autoIncrement: {
                    /* does the dialect require modification of insert queries when inserting auto increment fields */
                    identityInsert: false,

                    /* does the dialect support inserting default/null values for autoincrement fields */
                    defaultValue: true,

                    /* does the dialect support updating autoincrement fields */
                    update: true
                },

                schemas: false,
                transactions: true,
                migrations: true,
                upserts: true,
                constraints: {
                    restrict: true
                },

                index: {
                    collate: true,
                    length: false,
                    parser: false,
                    concurrently: false,
                    type: false,
                    using: true,
                },

                TICK_CHAR: '`'
            },

            init: function (engine, options) {

                if (!(engine instanceof Engine))
                    throw new Error("Incorrect or missing \"engine\" parameter.");

                this._engine = engine;
                this._options = options || {};
                this._providerId = PROVIDER_ID;

                this._connectionMgr = this._createConnectionMgr();
                this._queryGen = this._createQueryGen();
                this._sqlTypes = this._createSqlTypes();
                this._connectionMgr.initPools();
            },

            engine: function () {
                return this._engine;
            },

            connectionMgr: function () {
                return this._connectionMgr;
            },

            queryGen: function () {
                return this._queryGen;
            },

            sqlTypes: function () {
                return this._sqlTypes;
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
        return BaseProvider;
    }
);