if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/queryExec'],
    function (Base) {

        var MySqlQueryExec = Base.extend({

            init: function (engine, connection, options) {
                UccelloClass.super.apply(this, [engine, connection, options]);
            },

            run: function (sql) {
                var self = this;
                var promise = new this._options.Promise(function (resolve, reject) {
                    self._connection.query(sql, function (err, results, fields) {
                        if (err) {
                            err.sql = sql;

                            reject(self._formatError(err));
                        } else {
                            resolve(self._formatResults(results));
                        }
                    });
                });
                return promise;
            },

            _formatError: function (err) {
                return err;
            },

            _formatResults: function (results) {
                return results;
            },

        });

        return MySqlQueryExec;
    }
);