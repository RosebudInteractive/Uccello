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
                this._queryTypes = this.getEngine().getProvider().queryGen().queryTypes;
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
                var row_version_fnames = [];
                var query_type = sql.type;

                function collectRowVersions(request) {
                    var row_version_fname = request && request.model && request.model.getRowVersionField() ? request.model.getRowVersionField().name() : null;
                    if (row_version_fname)
                        row_version_fnames.push(request.sqlAlias ? request.sqlAlias + "_" + row_version_fname : row_version_fname);
                    if (request && _.isArray(request.childs) && (request.childs.length > 0)) {
                        _.forEach(request.childs, function (ch_query) {
                            cnt = collectRowVersions(ch_query);
                        });
                    };
                };

                collectRowVersions(sql.meta);

                if (_.isArray(results)) { // Результат SELECT ?
                    if ((query_type === this._queryTypes.ROWID) && (results.length === 2) && (results[0].length === 1)) {
                        res = {
                            affectedRows: 1,
                            changedRows: 0,
                            insertId: results[0][0].insertId ? results[0][0].insertId : null,
                        };
                    }
                    else {
                        res = results;
                        if (row_version_fnames.length > 0) {
                            res = _.cloneDeep(results);
                            _.forEach(res, function (rec) {
                                _.forEach(row_version_fnames, function (verfn) {
                                    if (typeof (rec[verfn]) === "number")
                                        rec[verfn] = rec[verfn].toString();
                                });
                            });
                        };
                    };
                }
                else {
                    res = {
                        affectedRows: results.affectedRows,
                        changedRows: results.changedRows,
                        insertId: sql.insertId ? sql.insertId : results.insertId,
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