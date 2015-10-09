if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [],
    function () {
        return {
            Db: {
                Name: "DataEngineDB",
                Guid: "66d43749-223a-48cb-9143-122381b9ed3c"
            },
            Field: {
                PrimaryKey: 1,
                AutoIncrement: 2,
                Hidden: 4,
                Internal: 8,
                System: 16
            }
        };
    }
);