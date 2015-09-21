if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../../dataObjectEngine', './connectionMgr', './queryExec', './queryGen', './sqlTypes'],
    function (Engine, ConnectionMgr, QueryExec, QueryGen, SqlTypes) {

        var PROVIDER_ID = "unknown";

        var BaseProvider = UccelloClass.extend({

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

                this.query = this._getQuery();
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

            _getQuery: function () {
                return QueryExec;
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