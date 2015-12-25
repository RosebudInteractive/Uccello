if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/queryExec', 'lodash'],
    function (Base, _) {

        var MSSQLQueryExec = Base.extend({

            init: function (engine, connection, options) {
                UccelloClass.super.apply(this, [engine, connection, options]);
                this._queryTypes = this.getEngine().getProvider().queryGen().queryTypes;
            },

            run: function (sql) {
                var self = this;
                var promise = new this._options.Promise(function (resolve, reject) {
                    var queryTypes = self.getEngine().getProvider().queryGen().queryTypes;

                    function processTran(err) {
                        if (!!err) {
                            reject(self._formatError(err));
                        } else {
                            resolve(self._formatResults(null, sql.type, 0));
                        }
                    };

                    switch (sql.type) {

                        case self._queryTypes.START_TRAN:
                            self._connection.beginTransaction(processTran);
                            break;

                        case self._queryTypes.COMMIT_TRAN:
                            self._connection.commitTransaction(processTran);
                            break;

                        case self._queryTypes.ROLLBACK_TRAN:
                            self._connection.rollbackTransaction(processTran);
                            break;

                        default:

                            var results = [];
                            var columns = {};

                            var request = new self._connection.lib.Request(sql.sqlCmd, function (err, rowCount) {

                                if (err) {
                                    err.sql = sql.sqlCmd;

                                    reject(self._formatError(err));
                                } else {
                                    resolve(self._formatResults(results, sql.type, rowCount));
                                }
                            });

                            request.on("row", function (columns) {
                                var row = {};
                                columns.forEach(function (column) {
                                    var val = column.value;
                                    if (val && (column.metadata.type.type === "GUIDN"))
                                        val = val.toLowerCase();
                                    row[column.metadata.colName] = val;
                                });

                                results.push(row);
                            });

                            var TYPES = self._connection.lib.TYPES;

                            sql.params.forEach(function (param) {
                                if (typeof (param.type.addParameter) === "function") {
                                    param.type.addParameter(TYPES, request, param.name, param.val);
                                }
                                else
                                    throw new Error("Function \"addParameter\" aren't implemented in type: \"" + param.type.key + "\".");
                            });

                            self._connection.execSql(request);
                            break;
                    };
                });
                return promise;
            },

            _formatError: function (err) {
                return err;
            },

            _formatResults: function (results, query_type, affectedRows) {
                var res;
                if (_.isArray(results)) // Результат SELECT ?
                    if ((query_type === this._queryTypes.INSERT) && (results.length === 1)) {
                        res = {
                            affectedRows: affectedRows,
                            changedRows: 0,
                            insertId: results[0].insertId
                        };
                    } else
                        res = results;
                else {
                    res = {
                        affectedRows: affectedRows,
                        changedRows: results ? results.changedRows : null,
                        insertId: results ? results.insertId : null,
                        message: results ? results.message : null,
                        warningCount: results ? results.warningCount : null
                    };
                };
                return res;
            },

        });

        return MSSQLQueryExec;
    }
);