if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/sqlTypes'],
    function (Base) {

        var MySqlTypes = Base.extend({

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
            }
        });

        return MySqlTypes;
    }
);