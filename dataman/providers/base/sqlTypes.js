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
        MetaTypes.makeDescendant("int", types, { prefix: "SQL", toSql: function (provider, field) { return "INTEGER"; } });
        MetaTypes.makeDescendant("dataRef", types, { prefix: "SQL", toSql: function (provider, field) { return "INTEGER"; } });
        var string_type = {
            prefix: "SQL",
            toSql: function (provider, field) {
                if (this._length === Infinity)
                    throw new Error("Length of string type can't be unlimited.");
                return "VARCHAR(" + this._length + ")";
            }
        };
        MetaTypes.makeDescendant("string", types, string_type);
        MetaTypes.makeDescendant("guid", types, string_type);
        MetaTypes.makeDescendant("enum", types, string_type);
        MetaTypes.makeDescendant("float", types, { prefix: "SQL", toSql: function (provider, field) { return "FLOAT"; } });
        MetaTypes.makeDescendant("datetime", types, { prefix: "SQL", toSql: function (provider, field) { return "DATETIME"; } });
        MetaTypes.makeDescendant("decimal", types, {
            prefix: "SQL",
            toSql: function (provider, field) {
                return "NUMERIC(" + this._precision + ", " + this._scale + ")";
            }
        });
        MetaTypes.makeDescendant("boolean", types, { prefix: "SQL", toSql: function (provider, field) { return "BOOLEAN"; } });

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