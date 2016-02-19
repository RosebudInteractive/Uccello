/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([],
    function() {
        function ResourceError(message, reason){
            Error.apply(this, arguments);
            this.message = message;
            this.reason = reason;
            this.result = 'ERROR'
        }
        //ResourceError.prototype = Error.prototype;

        ResourceError.prototype = Object.create(Error.prototype);
        ResourceError.prototype.constructor = ResourceError;


        var ResUtils = UccelloClass.extend({});

        ResUtils.state = {new : 0, loaded : 1, changed : 2};
        ResUtils.errorReasons = {dbError : 0, objectError : 1, systemError : 2};

        ResUtils.newObjectError = function(message) {
            return new ResourceError(message, ResUtils.errorReasons.objectError);//{result : 'ERROR', reason : ResUtils.errorReasons.objectError, message : message}
        };

        ResUtils.newDbError = function(message) {
            return new ResourceError(message, ResUtils.errorReasons.dbError);//{result : 'ERROR', reason : ResUtils.errorReasons.dbError, message : message}
        };

        ResUtils.newSystemError = function(message) {
            return new ResourceError(message, ResUtils.errorReasons.systemError);//{result : 'ERROR', reason : ResUtils.errorReasons.systemError, message : message}
        };

        return ResUtils;
    }

);