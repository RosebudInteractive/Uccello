/**
 *  ќбеспечивает работу [dataObjectEngine] с MySQL RDBMS,
 *    переопредел€€ поведение базового класса [baseProvider].
 *
 *    »спользует https://github.com/felixge/node-mysql
 *      »нсталл€ци€: npm install mysql
 *
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['lodash', '../base/baseProvider', './connectionMgr', './queryExec', './queryGen', './sqlTypes'],
    function (_, Base, ConnectionMgr, QueryExec, QueryGen, SqlTypes) {

        var PROVIDER_ID = "mysql";

        var supports = _.merge(_.cloneDeep(Base.prototype.supports), {
            'VALUES ()': true,
            'LIMIT ON UPDATE': true,
            'IGNORE': ' IGNORE',
            lock: true,
            forShare: 'LOCK IN SHARE MODE',
            index: {
                collate: false,
                length: true,
                parser: true,
                type: true,
                using: 1,
            },

            TICK_CHAR: '`'
        });

        var defaultMySqlConfig = {
            port: 3306,
            provider_options: {
                engine: "InnoDB"
            },
            timezone: "+00:00"
        };

        var MySqlProvider = Base.extend({

            providerId: PROVIDER_ID,

            supports: supports,

            query: QueryExec,

            init: function (engine, options) {
                var opts = _.defaultsDeep(options ? _.cloneDeep(options) : {}, defaultMySqlConfig);
                UccelloClass.super.apply(this, [engine, opts]);
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
        return MySqlProvider;
    }
);