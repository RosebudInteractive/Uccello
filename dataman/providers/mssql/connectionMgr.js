if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/connectionMgr', /*'bluebird',*/ 'lodash'],
    function (Base, /*Promise,*/ _) {

        var NATIVE_PACKAGE = "tedious";

        var MSSQLConnectionManager = Base.extend({

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
                    var connectionConfig =  {
                        server: config.host,
                        options: { port: config.port, database: config.database },
                    };

                    connectionConfig = config.domain ? _.merge(connectionConfig, { domain: config.domain }) :
                        _.merge(connectionConfig, { userName: config.username, password: config.password });

                    if (config.connection_options) {

                        // only set port if no instance name was provided
                        if (config.connection_options.instanceName) {
                            delete connectionConfig.options.port;
                        };

                        Object.keys(config.connection_options).forEach(function (key) {
                            connectionConfig.options[key] = config.connection_options[key];
                        });
                    }

                    var connection = new self._nativeLib.Connection(connectionConfig);
                    connection.lib = self._nativeLib;

                    connection.on('connect', function (err) {
                        if (!err) {
                            resolve(connection);
                            return;
                        }

                        if (!err.code) {
                            reject(err);
                            return;
                        }

                        switch (err.code) {
                            case 'ESOCKET':
                                reject(err);
                                break;
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
                    });
                });
            },

            disconnect: function (connection) {
                // Dont disconnect a connection that is already disconnected
                //if (!connection.connected) {
                //    if (DEBUG) console.log("MSSQL: Already disconnected!");
                //    return Promise.resolve();
                //};

                return new Promise(function (resolve, reject) {
                    connection.on('end', function () {
                        if (DEBUG) console.log("MSSQL: Disconnected!");
                        resolve();
                    });
                    if (DEBUG) console.log("MSSQL: Disconnecting...");
                    connection.close();
                });
            },

            validate: function (connection) {
                return connection && connection.loggedIn;
            }
        });

        return MSSQLConnectionManager;
    }
);
