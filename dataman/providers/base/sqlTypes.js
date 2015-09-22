if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType'],
    function (MetaTypes) {

        var types = {};

        // Здесь переопределяем базовые типы
        //
        MetaTypes.makeDescendant("int", types, { toSql: function () { return "INTEGER"; } });
        MetaTypes.makeDescendant("dataRef", types, { toSql: function () { return "INTEGER"; } });
        MetaTypes.makeDescendant("string", types, { toSql: function () { return "VARCHAR"; } });
        MetaTypes.makeDescendant("float", types, { toSql: function () { return "FLOAT"; } });
        MetaTypes.makeDescendant("datetime", types, { toSql: function () { return "DATETIME"; } });
        MetaTypes.makeDescendant("decimal", types, { toSql: function () { return "NUMERIC"; } });
        MetaTypes.makeDescendant("boolean", types, { toSql: function () { return "BOOLEAN"; } });

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