/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([],
    function() {
        var ResUtils = UccelloClass.extend({});

        ResUtils.state = {new : 0, loaded : 1, changed : 2};
        ResUtils.errorReasons = {dbError : 0, objectError : 1};

        ResUtils.newObjectError = function(message) {
            return {reason : ResUtils.errorReasons.objectError, message : message}
        };

        ResUtils.newDbError = function(message) {
            return {reason : ResUtils.errorReasons.dbError, message : message}
        };

        return ResUtils;
    }

);