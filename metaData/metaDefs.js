if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [],
    function () {
        var Meta = {
            DATA_LOG_NAME: "data_log",
            ROW_VERSION_FNAME: "__version",
            Db: {
                Name: "DataEngineDB",
                Guid: "66d43749-223a-48cb-9143-122381b9ed3c"
            },
            Field: {
                PrimaryKey: 1,
                AutoIncrement: 2,
                Hidden: 4,
                Internal: 8,
                System: 16,
                RowVersion: 32
            },
            State: {
                Browse: 0,
                Insert: 1,
                Edit: 2,
                Delete: 3,
                Pending: 4
            }
        };

        Meta.stateToString = function (state) {
            var state_str = "Unknown";
            switch (state) {
                case Meta.State.Browse:
                    state_str = "Browse";
                    break;
                case Meta.State.Edit:
                    state_str = "Edit";
                    break;
                case Meta.State.Insert:
                    state_str = "Insert";
                    break;
                case Meta.State.Delete:
                    state_str = "Delete";
                    break;
                case Meta.State.Pending:
                    state_str = "Pending";
                    break;
            };
            return state_str;
        };

        return Meta;
    }
);