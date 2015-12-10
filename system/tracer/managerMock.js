/**
 * Created by staloverov on 09.12.2015.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([], function() {
    var _manager = null;

    ManagerMock.getInstance = function() {
        if (!_manager) {
            _manager = new ManagerMock()
        }

        return _manager;
    };

    function ManagerMock() {
        this.createSource = function() {
            return {trace : function() {}}
        }
    }

    return ManagerMock
});
