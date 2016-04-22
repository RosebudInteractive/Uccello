if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/connectionMgr', /*'bluebird',*/ 'lodash'],
    function (Base, /*Promise,*/ _) {

        var NATIVE_PACKAGE = "mysql";

        var MySqlConnectionManager = Base.extend({

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);

                try {
                    this._nativeLib = require(NATIVE_PACKAGE);
                } catch (err) {
                    throw new Error("Please install \"" + NATIVE_PACKAGE + "\" package.");
                };
            },

            connect: function (config) {
                var self = this;

                return new Promise(function (resolve, reject) {
                    var connectionConfig = {
                        host: config.host,
                        port: config.port,
                        user: config.username,
                        password: config.password,
                        database: config.database,
                        timezone: config.timezone
                    };

                    if (config.connection_options) {
                        Object.keys(config.connection_options).forEach(function (key) {
                            connectionConfig[key] = config.connection_options[key];
                        });
                    }

                    var connection = self._nativeLib.createConnection(connectionConfig);

                    connection.connect(function (err) {
                        if (err) {
                            if (err.code) {
                                switch (err.code) {
                                    case 'ECONNREFUSED':
                                        reject(err);
                                        break;
                                    case 'ER_ACCESS_DENIED_ERROR':
                                        reject(err);
                                        break;
                                    case 'ENOTFOUND':
                                        reject(err);
                                        break;
                                    case 'EHOSTUNREACH':
                                        reject(err);
                                        break;
                                    case 'EINVAL':
                                        reject(err);
                                        break;
                                    default:
                                        reject(err);
                                        break;
                                }
                            } else {
                                reject(err);
                            };

                            return;
                        };

                        if (config.pool.handleDisconnects) {
                            // Connection to the MySQL server is usually
                            // lost due to either server restart, or a
                            // connnection idle timeout (the wait_timeout
                            // server variable configures this)
                            //
                            // See [stackoverflow answer](http://stackoverflow.com/questions/20210522/nodejs-mysql-error-connection-lost-the-server-closed-the-connection)
                            connection.on('error', function (err) {
                                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                                    // Remove it from read/write pool
                                    self._pool.destroy(connection);
                                }
                            });
                        }
                        resolve(connection);
                    });

                }).then(function (connection) {
                    connection.query("SET time_zone = '" + config.timezone + "'");
                    return connection;
                });
            },

            disconnect: function (connection) {

                // Dont disconnect connections with an ended protocol
                // That wil trigger a connection error
                if (connection._protocol._ended) {
                    return Promise.resolve();
                }

                return new Promise(function (resolve, reject) {
                    connection.end(function (err) {
                        if (err)
                            return reject(err);
                        resolve();
                    });
                });
            },

            validate: function (connection) {
                return connection && ['disconnected', 'protocol_error'].indexOf(connection.state) === -1;
            }
        });

        return MySqlConnectionManager;
    }
);
