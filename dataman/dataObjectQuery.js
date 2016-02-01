if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['bluebird', 'lodash', './transaction'],
    function (Promise, _, Transaction) {

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

            dropTable: function (model, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.dropTableQuery(model);
                    resolve(self._runQuery(sql, options));
                });
            },

            createTable: function (model, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.createTableQuery(model);
                    resolve(self._runQuery(sql, options));
                });
            },

            showForeignKeys: function (src_name, dst_name, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.showForeignKeysQuery(src_name, dst_name);
                    resolve(self._runQuery(sql, options));
                });
            },

            dropForeignKey: function (table_name, fk_name, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.dropForeignKeyQuery(table_name, fk_name);
                    resolve(self._runQuery(sql, options));
                });
            },

            createLink: function (ref, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.createLinkQuery(ref);
                    resolve(self._runQuery(sql, options));
                });
            },

            select: function (request, predicate, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.selectQuery(request, predicate);
                    resolve(self._runQuery(sql, options).then(function (result) {
                            //console.log(JSON.stringify(result));
                            return result;
                        })
                    );
                });
            },

            update: function (model, values, predicate, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var updOptions = _.cloneDeep(options && options.updOptions ? options.updOptions : {});
                    var sql = self._query_gen.updateQuery(model, values, predicate, updOptions);
                    resolve(self._runQuery(sql, options).then(function (result) {
                            //console.log(JSON.stringify(result));
                            return result;
                        })
                    );
                });
            },

            setTableRowId: function (model, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.setTableRowIdQuery(model);
                    resolve(self._runQuery(sql, options));
                });
            },

            getNextRowId: function (model, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sql = self._query_gen.getNextRowIdQuery(model);
                    resolve(self._runQuery(sql, options));
                });
            },

            insert: function (model, values, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    vals = _.cloneDeep(values);
                    var pk = model.getPrimaryKey();
                    if (!pk) {
                        reject(new Error("Missing PK: \"" + model.name() + "\"."));
                    }
                    else {
                        var res_id = { insertId: -1 };
                        var promise = Promise.resolve(res_id);
                        if (!vals[pk.name()]) {
                            promise = self.getNextRowId(model, options);
                        }
                        else
                            res_id.insertId = values[pk.name()];
                        resolve(promise.then(function (res) {
                            if (!res.insertId)
                                return Promise.reject(new Error("Missing PK value: \"" + model.name() + "\"."));
                            else {
                                if (!vals[pk.name()])
                                    vals[pk.name()] = res.insertId;
                                var sql = self._query_gen.insertQuery(model, vals);
                                return self._runQuery(sql, options);
                            };
                        }));
                    };
                });
            },

            execDbInitialScript: function (options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sqlArr = self._query_gen.getDbInitialScript();
                    resolve(self._runQuery(sqlArr, options));
                });
            },

            execSql: function (sql, options) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    var sqlCmd = self._query_gen.execSql(sql);
                    resolve(self._runQuery(sqlCmd, options));
                });
            },

            commitTransaction: function (transaction) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    if (!transaction || !(transaction instanceof Transaction)) {
                        throw new Error('Unable to commit a transaction without transaction object!');
                    };
                    var sql = self._query_gen.commitTransactionQuery();
                    resolve(self._runQuery(sql, { transaction: transaction }));
                });
            },

            rollbackTransaction: function (transaction) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    if (!transaction || !(transaction instanceof Transaction)) {
                        throw new Error('Unable to rollback a transaction without transaction object!');
                    };
                    var sql = self._query_gen.rollbackTransactionQuery();
                    resolve(self._runQuery(sql, { transaction: transaction }));
                });
            },

            startTransaction: function (transaction) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    if (!transaction || !(transaction instanceof Transaction)) {
                        throw new Error('Unable to start a transaction without transaction object!');
                    };
                    var sql = self._query_gen.startTransactionQuery();
                    resolve(self._runQuery(sql, { transaction: transaction }));
                });
            },

            setIsolationLevel: function (transaction, isolationLevel) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    if (!transaction || !(transaction instanceof Transaction)) {
                        throw new Error('Unable to set isolation level for a transaction without transaction object!');
                    };
                    var sql = self._query_gen.setIsolationLevelQuery(isolationLevel);
                    if (sql)
                        resolve(self._runQuery(sql, { transaction: transaction }));
                    else resolve();
                });
            },

            setAutocommit: function (transaction, autocommit) {
                var self = this;
                return new Promise(function (resolve, reject) {
                    if (!transaction || !(transaction instanceof Transaction)) {
                        throw new Error('Unable to set autocommit for a transaction without transaction object!');
                    };
                    var sql = self._query_gen.setAutocommitQuery(autocommit);
                    if (sql)
                        resolve(self._runQuery(sql, { transaction: transaction }));
                    else resolve();
                });
            },

            _runQueryBatch: function (sqlBatch, connection) {
                var self = this;

                function exec_query(cmd, connection) {
                    var query = new self._query(self._engine, connection, self._query_options);
                    if (self._trace.sqlCommands)
                        console.log("Started: " + cmd.sqlCmd);
                    return query.run(cmd).then(function (result) {
                        if (self._trace.sqlCommands)
                            console.log("Finished: " + cmd.sqlCmd);
                        return result;
                    });
                };

                return new Promise(function (resolve, reject) {
                    if (sqlBatch) {
                        if (_.isArray(sqlBatch))
                            resolve(self._engine._seqExec(sqlBatch, function (sqlCmd) {
                                return exec_query(sqlCmd, connection);
                            }))
                        else
                            resolve(exec_query(sqlBatch, connection));
                    }
                    else
                        resolve({});
                });
            },

            _runQuery: function (sqlBatch, options) {
                var self = this;
                var transaction = options && options.transaction ? options.transaction : null;
                return Promise.resolve(transaction ? transaction.getConnection() : this._connection_mgr.getConnection())
                .then(function (connection) {
                    return self._runQueryBatch(sqlBatch, connection).then(function (result) {
                        return (transaction ? Promise.resolve() : self._connection_mgr.releaseConnection(connection))
                            .then(function () {
                                return result;
                            });
                    }, function (err) {
                        return (transaction ? Promise.resolve() : self._connection_mgr.releaseConnection(connection))
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