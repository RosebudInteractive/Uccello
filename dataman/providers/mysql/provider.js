if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/baseProvider', './connectionMgr', './queryExec', './queryGen', './sqlTypes'],
    function (Base, ConnectionMgr, QueryExec, QueryGen, SqlTypes) {

        var PROVIDER_ID = "mysql";

        var BaseProvider = Base.extend({

            providerId: PROVIDER_ID,

            query: QueryExec,

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
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