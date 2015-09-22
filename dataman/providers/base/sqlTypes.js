if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType'],
    function (MetaTypes) {

        var types = {};

        // «десь переопредел€ем базовые типы, наследу€сь от них
        //
        MetaTypes.makeDescendant("int", types, { prefix: "SQL", toSql: function () { return "INTEGER"; } });
        MetaTypes.makeDescendant("dataRef", types, { prefix: "SQL", toSql: function () { return "INTEGER"; } });
        MetaTypes.makeDescendant("string", types, { prefix: "SQL", toSql: function () { return "VARCHAR(255)"; } });
        MetaTypes.makeDescendant("float", types, { prefix: "SQL", toSql: function () { return "FLOAT"; } });
        MetaTypes.makeDescendant("datetime", types, { prefix: "SQL", toSql: function () { return "DATETIME"; } });
        MetaTypes.makeDescendant("decimal", types, { prefix: "SQL", toSql: function () { return "NUMERIC(10, 4)"; } });
        MetaTypes.makeDescendant("boolean", types, { prefix: "SQL", toSql: function () { return "BOOLEAN"; } });

        var SqlTypes = UccelloClass.extend({

            types: types,

            init: function (engine, options) {
                this._engine = engine;
                if (engine && engine.getDB())
                    engine.getDB().installSqlTypes(this.types, engine);
            }
        });

        return SqlTypes;
    }
);