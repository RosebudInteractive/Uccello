if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['bluebird', 'lodash'],
    function (Promise, _) {

        var Transaction = UccelloClass.extend({

            ISOLATION_LEVELS: {
                READ_UNCOMMITTED: 'READ UNCOMMITTED',
                READ_COMMITTED: 'READ COMMITTED',
                REPEATABLE_READ: 'REPEATABLE READ',
                SERIALIZABLE: 'SERIALIZABLE'
            },

            init: function (engine, options) {
                this._engine = engine;
                this._connection_mgr = engine.getProvider().connectionMgr();
                this._query = engine.getQuery();
                this._options = _.defaultsDeep(options ? _.cloneDeep(options) : {},
                    {
                        autocommit: true,
                        isolationLevel: this.ISOLATION_LEVELS.REPEATABLE_READ
                    });
                this._connection = null;
            },

            getConnection: function () {
                return this._connection;
            },

            start: function () {
                var self = this;
                return Promise.resolve(this._connection_mgr.getConnection())
                    .then(function (connection) {
                        self._connection = connection;
                    })
                    .then(function () {
                        return self._begin();
                    })
                    .then(function () {
                        return self.setIsolationLevel();
                    })
                    .then(function () {
                        return self.setAutocommit();
                    });
            },

            setIsolationLevel: function () {
                var self = this;
                return this._query.setIsolationLevel(this, this._options.isolationLevel);
            },

            setAutocommit: function () {
                var self = this;
                return this._query.setAutocommit(this, this._options.autocommit);
            },

            commit: function () {
                var self = this;
                return this._finalize(this._query.commitTransaction(this));
            },

            rollback: function () {
                var self = this;
                return this._finalize(this._query.rollbackTransaction(this));
            },

            _begin: function () {
                var self = this;
                return this._query.startTransaction(this);
            },

            _finalize: function (promise) {
                var self = this;
                return promise
                    .then(function () {
                        return self._cleanup()
                            .then(function () {
                                return Promise.resolve();
                            });

                    }, function (err) {
                        return self._cleanup()
                            .then(function () {
                                return Promise.reject(err);
                            });
                    });
            },

            _cleanup: function (promise) {
                var connection = this._connection;
                this._connection = null;
                return this._connection_mgr.releaseConnection(connection);
            }
        });

        return Transaction;
    }
);