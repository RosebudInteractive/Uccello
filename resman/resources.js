/**
 * Created by staloverov on 21.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([
        UCCELLO_CONFIG.uccelloPath + 'controls/controlMgr',
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        'crypto'
    ],
    function(ControlMgr, Predicate, Crypto) {
        var Resources = UccelloClass.extend({
            init : function() {

            },


        });

        return Resources;
    }

);
