if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/queryExec', 'lodash'],
    function (Base, _) {

        var MySqlQueryExec = Base.extend({

            init: function (engine, connection, options) {
                UccelloClass.super.apply(this, [engine, connection, options]);
            },

            run: function (sql) {
                var self = this;
                var promise = new this._options.Promise(function (resolve, reject) {
                    self._connection.query(sql.sqlCmd, function (err, results, fields) {
                        if (err) {
                            err.sql = sql.sqlCmd;

                            reject(self._formatError(err));
                        } else {
                            resolve(self._formatResults(results, sql));
                        }
                    });
                });
                return promise;
            },

            _formatError: function (err) {
                return err;
            },

            _formatResults: function (results, sql) {
                var res;
                var row_version_fname = sql.meta && sql.meta.getRowVersionField() ? sql.meta.getRowVersionField().name() : null;

                if (_.isArray(results)) { // Результат SELECT ?
                    res = results;
                    if (row_version_fname)
                        res = _.cloneDeep(results);
                    _.forEach(res, function (rec) {
                        if (typeof (rec[row_version_fname]) === "number")
                            rec[row_version_fname] = rec[row_version_fname].toString();
                        });
                }
                else {
                    res = {
                        affectedRows: results.affectedRows,
                        changedRows: results.changedRows,
                        insertId: results.insertId,
                        rowVersion: sql.rowVersion,
                        message: results.message,
                        warningCount: results.warningCount
                    };
                };
                return res;
            },

        });

        return MySqlQueryExec;
    }
);