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

            run: function (sql) {
                throw new Error("\"run\" wasn't implemented in descendant.");
            },
        });

        return QueryExec;
    }
);