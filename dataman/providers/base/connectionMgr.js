if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['generic-pool', 'bluebird', 'lodash'],
    function (Pooling, Promise, _) {

        var defaultPoolingConfig = {
            max: 5,
            min: 0,
            idle: 10000,
            handleDisconnects: true
        };

        var ConnectionManager = UccelloClass.extend({

            init: function (engine, options) {

                var config = _.defaults(options || {}, { timezone: "+00:00" });
                this._config = config;
                this._engine = engine;
                this._nativeLib = null;

                config.pool = config.pool ? _.cloneDeep(config.pool) : {};
                config.pool = _.defaults(config.pool, defaultPoolingConfig, {
                    validate: this.$validate.bind(this)
                });
            },

            getNativeLib: function () {
                return this._nativeLib;
            },

            initPools: function () {
                var self = this;
                var config = _.cloneDeep(this._config);

                this._pool = Pooling.Pool({

                    name: 'genetix-connection',

                    create: function (callback) {
                        self.$connect(config).then(function (connection) {
                            callback(undefined, connection);
                        }, function (err) {
                            callback(err, undefined);
                        });
                    },

                    destroy: function (connection) {
                        self.$disconnect(connection);
                    },

                    max: config.pool.max,
                    min: config.pool.min,
                    validate: config.pool.validate,
                    idleTimeoutMillis: config.pool.idle
                });
            },

            getConnection: function (options) {
                var self = this;
                options = options || {};

                return new Promise(function (resolve, reject) {
                    self._pool.acquire(function (err, connection) {
                        if (err)
                            return reject(err);
                        resolve(connection);
                    }, options.priority, options.type, options.useMaster);
                });
            },

            releaseConnection: function (connection) {
                var self = this;

                return new Promise(function (resolve, reject) {
                    self._pool.release(connection);
                    resolve();
                });
            },

            $connect: function (config) {
                return this.connect(config);
            },

            $disconnect: function (connection) {
                return this.disconnect(connection);
            },

            $validate: function (connection) {
                if (!this.validate)
                    return Promise.resolve();
                return this.validate(connection);
            }
        });

        return ConnectionManager;
    }
);
