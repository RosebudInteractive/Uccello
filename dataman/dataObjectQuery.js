if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['bluebird', 'lodash'],
    function (Promise, _) {

        var Query = UccelloClass.extend({

            init: function (engine, provider, options) {
                this._engine = engine;
                this._connection_mgr = provider.connectionMgr();
                this._query_gen = provider.queryGen();
                this._query = provider.query;
                this._query_options = { Promise: Promise, _: _ };
                this._options = options || {};
                this._trace = this._options.trace || {};
            },

            dropTable: function (model) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.dropTableQuery(model);
                    resolve(self._runQuery(sql));
                });
            },

            createTable: function (model) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.createTableQuery(model);
                    resolve(self._runQuery(sql));
                });
            },

            showForeignKeys: function (src_name, dst_name) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.showForeignKeysQuery(src_name, dst_name);
                    resolve(self._runQuery(sql));
                });
            },

            dropForeignKey: function (table_name, fk_name) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.dropForeignKeyQuery(table_name, fk_name);
                    resolve(self._runQuery(sql));
                });
            },

            createLink: function (ref) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.createLinkQuery(ref);
                    resolve(self._runQuery(sql));
                });
            },

            select: function (model, predicate) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.selectQuery(model, predicate);
                    resolve(self._runQuery(sql).then(function (result) {
                            //console.log(JSON.stringify(result));
                            return result;
                        })
                    );
                });
            },

            update: function (model, values, predicate) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.updateQuery(model, values, predicate);
                    resolve(self._runQuery(sql).then(function (result) {
                            //console.log(JSON.stringify(result));
                            return result;
                        })
                    );
                });
            },

            insert: function (model, values) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.insertQuery(model, values);
                    resolve(self._runQuery(sql));
                });
            },

            _runQuery: function (sql) {
                var self = this;
                return Promise.resolve(this._connection_mgr.getConnection())
                .then(function (connection) {
                    var query = new self._query(self._engine, connection, self._query_options);
                    if (self._trace.sqlCommands)
                        console.log("Started: " + sql);
                    return query.run(sql).then(function (result) {
                        return (self._connection_mgr.releaseConnection(connection))
                            .then(function(){
                                if (self._trace.sqlCommands)
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