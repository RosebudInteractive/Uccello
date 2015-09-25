if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['bluebird', 'lodash'],
    function (Promise, _) {

        var Query = UccelloClass.extend({

            init: function (engine, provider) {
                this._engine = engine;
                this._connection_mgr = provider.connectionMgr();
                this._query_gen = provider.queryGen();
                this._query = provider.query;
                this._query_options = { Promise: Promise, _: _ };
            },

            dropTable: function (model) {
                var sql = this._query_gen.dropTableQuery(model);
                return this._runQuery(sql);
            },

            createTable: function (model) {
                var sql = this._query_gen.createTableQuery(model);
                return this._runQuery(sql);
            },

            select: function (model) {
                var sql = this._query_gen.selectQuery(model);
                return this._runQuery(sql);
            },

            insert: function (model, values) {
                var sql = this._query_gen.insertQuery(model, values);
                return this._runQuery(sql);
            },

            _runQuery: function (sql) {
                var self = this;
                return Promise.resolve(this._connection_mgr.getConnection())
                .then(function (connection) {
                    var query = new self._query(self._engine, connection, self._query_options);
                    console.log("Started: " + sql);
                    return query.run(sql).then(function (result) {
                        return (self._connection_mgr.releaseConnection(connection))
                            .then(function(){
                                console.log("Finished: " + sql);
                                return Promise.resolve(result);
                            });
                    }, function (err) {
                        return (self._connection_mgr.releaseConnection(connection))
                            .then(function () {
                                return Promise.reject(err)
                            });
                    })
                });
            },

        });
        return Query;
    }
);