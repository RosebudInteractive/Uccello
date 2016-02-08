if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./TranDefs', 'bluebird', 'lodash'],
    function (TranDefs, Promise, _) {

        var _curr_tran_id = 0;
        var transactions = {};

        var Transaction = UccelloClass.extend({

            init: function (engine, options) {
                this._engine = engine;
                this._id = "t" + (++_curr_tran_id);
                this._state = TranDefs.STATES.IDLE;
                this._connection_mgr = engine.getProvider().connectionMgr();
                this._query = engine.getQuery();
                this._options = _.defaultsDeep(options ? _.cloneDeep(options) : {},
                    {
                        autocommit: true,
                        isolationLevel: TranDefs.ISOLATION_LEVELS.REPEATABLE_READ
                    });
                this._connection = null;
                this._errMsg = "";
                this._parent = this._options.parent &&
                    (this._options.parent instanceof Transaction) ? this._options.parent : null;
                if ((!this._parent) && this._options.transactionId) {
                    this._parent = transactions[this._options.transactionId];
                    if (!this._parent)
                        throw new Error("Unknown parent transaction (transactionId = \"" + this._options.transactionId + "\").");
                };
                this._child = null;
                if (this._parent) {
                    if (this._parent.getState() !== TranDefs.STATES.STARTED)
                        throw new Error("Parent transaction is not in state \"" + TranDefs.STATES.STARTED + "\" (\"" +
                            this._parent.getState() + "\").");
                    if (this._parent.getChild())
                        throw new Error("Parent transaction \"" + this._parent.getTranId() + "\" already has a child(s).");
                    this._parent._setChild(this);
                };
                transactions[this._id] = this;
            },

            getConnection: function () {
                return this._connection;
            },

            getTranId: function () {
                return this._id;
            },

            getState: function () {
                return this._state;
            },

            getParent: function () {
                return this._parent;
            },

            getChild: function () {
                return this._child;
            },

            start: function () {
                var self = this;
                var promise;
                if (this._state !== TranDefs.STATES.IDLE) {
                    promise = Promise.reject(new Error("Can't start transaction, because it's not in state \"" + TranDefs.STATES.IDLE + "\" (\"" +
                        this._state + "\")."));
                }
                else {
                    this._state = TranDefs.STATES.STARTED;
                    if (this._parent) {
                        this._connection = this._parent.getConnection();
                        promise = Promise.resolve();
                    }
                    else {

                        promise = Promise.resolve(this._connection_mgr.getConnection())
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
                    };
                };
                return promise;
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
                var promise = Promise.resolve();
                if (this._state !== TranDefs.STATES.STARTED) {
                    promise = Promise.reject(new Error("Can't commit transaction, because it's not in state \"" + TranDefs.STATES.STARTED + "\" (\"" +
                        this._state + "\")."));
                }
                else
                    if (this._child) {
                        promise = Promise.reject(new Error("Can't commit transaction, because there is a child transaction \"" + TranDefs.STATES.STARTED + "\" (\"" +
                            this._child.getTranId() + "\")."));
                    }
                    else {
                        this._state = TranDefs.STATES.IN_COMMITING;
                        if (!this._parent) {
                            promise = this._query.commitTransaction(this);
                        };
                        promise = this._finalize(promise);
                    };
                return promise;
            },

            rollback: function () {
                var promise = Promise.resolve();
                if ((this._state !== TranDefs.STATES.STARTED) &&
                    (this._state !== TranDefs.STATES.CHILD_ROLLED_BACK)) {
                    promise = Promise.reject(new Error("Can't rollback transaction, because it's not in state \"" + TranDefs.STATES.STARTED + "\" (\"" +
                        this._state + "\")."));
                }
                else
                    if (this._child && (this._state !== TranDefs.STATES.CHILD_ROLLED_BACK)) {
                        promise = Promise.reject(new Error("Can't rollback transaction, because there is a child transaction \"" + TranDefs.STATES.STARTED + "\" (\"" +
                            this._child.getTranId() + "\")."));
                    }
                    else {
                        if (this._state !== TranDefs.STATES.CHILD_ROLLED_BACK) {
                            this._state = TranDefs.STATES.IN_ROLLING_BACK;
                            if (!this._parent) {
                                promise = this._query.rollbackTransaction(this);
                            };
                        };
                        promise = this._finalize(promise);
                    };
                return promise;
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
                                self._afterCleanup();
                                return Promise.resolve();
                            });

                    }, function (err) {
                        return self._cleanup(err)
                            .then(function () {
                                self._afterCleanup(err);
                                return Promise.reject(err);
                            });
                    });
            },

            _setChild: function (child) {
                this._child = child;
            },

            _afterCleanup: function (err) {

                var self = this;
                delete transactions[this._id];

                function process_parents(state) {
                    var curr_tran = self._parent;
                    while (curr_tran) {
                        curr_tran._state = state;
                        curr_tran._connection = null;
                        curr_tran = curr_tran.getParent();
                    };
                };

                if (err) {
                    this._prev_state = this._state;
                    this._errMsg = err.message;
                    this._state = TranDefs.STATES.ERROR;
                    process_parents(TranDefs.STATES.CHILD_ERROR);
                }
                else {
                    switch (this._state) {
                        case TranDefs.STATES.IN_COMMITING:
                            this._state = TranDefs.STATES.COMMITED;
                            break;
                        case TranDefs.STATES.IN_ROLLING_BACK:
                            this._state = TranDefs.STATES.ROLLED_BACK;
                            break;
                    };
                    if (this._parent) {
                        if (this._state === TranDefs.STATES.COMMITED) {
                            this._parent._setChild(null);
                        }
                        if (this._state === TranDefs.STATES.ROLLED_BACK) {
                            process_parents(TranDefs.STATES.CHILD_ROLLED_BACK);
                        }
                    };
                };
            },

            _cleanup: function (err) {
                var promise = Promise.resolve();
                if ((!this._parent) || (this._state === TranDefs.STATES.IN_ROLLING_BACK) || err) {
                    if (this._connection) {
                        var connection = this._connection;
                        promise = this._connection_mgr.releaseConnection(connection);
                    };
                };
                this._connection = null;
                return promise;
            }
        });

        Transaction.getTranById = function (transactionId) {
            return transactions[transactionId] ? transactions[transactionId] : null;
        };

        return Transaction;
    }
);