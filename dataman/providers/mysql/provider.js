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

        var BaseProvider = Base.extend({

            providerId: PROVIDER_ID,

            supports: supports,

            query: QueryExec,

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
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
        return BaseProvider;
    }
);