if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType'],
    function (MetaTypes) {

        var types = {};

        // ����� �������������� ������� ����, ���������� �� ���
        //
        MetaTypes.makeDescendant("int", types, { prefix: "SQL", toSql: function () { return "INTEGER"; } });
        MetaTypes.makeDescendant("dataRef", types, { prefix: "SQL", toSql: function () { return "INTEGER"; } });
        var string_type = {
            prefix: "SQL",
            toSql: function () {
                if (this._length === Infinity)
                    throw new Error("Length of string type can't be unlimited.");
                return "VARCHAR(" + this._length + ")";
            }
        };
        MetaTypes.makeDescendant("string", types, string_type);
        MetaTypes.makeDescendant("enum", types, string_type);
        MetaTypes.makeDescendant("float", types, { prefix: "SQL", toSql: function () { return "FLOAT"; } });
        MetaTypes.makeDescendant("datetime", types, { prefix: "SQL", toSql: function () { return "DATETIME"; } });
        MetaTypes.makeDescendant("decimal", types, {
            prefix: "SQL",
            toSql: function () {
                return "NUMERIC(" + this._precision + ", " + this._scale + ")";
            }
        });
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