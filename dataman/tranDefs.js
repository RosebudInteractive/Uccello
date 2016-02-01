if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [],
    function () {

        var TranDefs = {

            ISOLATION_LEVELS: {
                READ_UNCOMMITTED: 'READ UNCOMMITTED',
                READ_COMMITTED: 'READ COMMITTED',
                REPEATABLE_READ: 'REPEATABLE READ',
                SERIALIZABLE: 'SERIALIZABLE'
            },

            STATES: {
                IDLE: "IDLE",
                STARTED: "STARTED",
                COMMITED: "COMMITED",
                ROLLED_BACK: "ROLLED_BACK",
                IN_COMMITING: "IN_COMMITING",
                IN_ROLLING_BACK: "IN_ROLLING_BACK",
                CHILD_ROLLED_BACK: "CHILD_ROLLED_BACK",
                ERROR: "ERROR",
                CHILD_ERROR: "CHILD_ERROR"
            }
        };

        return TranDefs;
    }
);