if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [],
    function () {

        var SqlTypes = UccelloClass.extend({

            init: function (engine, options) {

            }
        });

        return SqlTypes;
    }
);