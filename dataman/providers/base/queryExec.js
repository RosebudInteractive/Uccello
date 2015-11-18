if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [],
    function () {

        var QueryExec = UccelloClass.extend({

            init: function (engine, connection, options) {
                this._engine = engine;
                this._connection = connection;
                this._options = options || {};
            },

            getEngine: function () { return this._engine; },
            getConnection: function () { return this._connection; },
            getOptions: function () { return this._options; },

            run: function (sql) {
                throw new Error("\"run\" wasn't implemented in descendant.");
            },
        });

        return QueryExec;
    }
);