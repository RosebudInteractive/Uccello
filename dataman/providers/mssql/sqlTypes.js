if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['lodash', UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType', '../base/sqlTypes'],
    function (_, MetaTypes, Base) {

        // Базовые типы не используем !
        //
        var mssqlTypes = {};

        // MSSQL типы:
        //

        MetaTypes.makeDescendant("int", mssqlTypes, {
            prefix: "MSSQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.Int, val, {});
            },
            toSql: function (provider, field) { return "INTEGER"; }
        });
        MetaTypes.makeDescendant("dataRef", mssqlTypes, {
            prefix: "MSSQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.Int, val, {});
            },
            toSql: function (provider, field) { return "INTEGER"; }
        });
        MetaTypes.makeDescendant("float", mssqlTypes, {
            prefix: "MSSQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.Float, val, {});
            },
            toSql: function (provider, field) { return "FLOAT"; }
        });
        MetaTypes.makeDescendant("decimal", mssqlTypes, {
            prefix: "SQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.Decimal, val, {
                    precision: this.precision(),
                    scale: this.scale()
                });
            },
            toSql: function (provider, field) {
                return "NUMERIC(" + this._precision + ", " + this._scale + ")";
            }
        });
        MetaTypes.makeDescendant("string", mssqlTypes, {
            prefix: "MSSQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.NVarChar, val, { length: this.length() });
            },
            toSql: function (provider, field) {
                if (this._length === Infinity)
                    throw new Error("Length of string type can't be unlimited.");
                return "NVARCHAR(" + this._length + ")";
            }
        });
        MetaTypes.makeDescendant("enum", mssqlTypes, {
            prefix: "MSSQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.NVarChar, val, { length: this.length() });
            },
            toSql: function (provider, field) {
                if (this._length === Infinity)
                    throw new Error("Length of string type can't be unlimited.");

                function escapeEnumVal(s) {
                    return "'" + s.replace(new RegExp("'", 'g'), "''") + "'";
                };

                var qGen = provider.queryGen();
                var values = _.map(this.values(), function (val) {
                    return escapeEnumVal(val);
                });
                var result = "NVARCHAR(" + this._length + ") CHECK (" + qGen.escapeId(field.name()) +
                    " IN (" + values.join(", ") + "))";
                return result;
            }
        });
        MetaTypes.makeDescendant("boolean", mssqlTypes, {
            prefix: "MSSQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.Bit, val, {});
            },
            toSql: function (provider, field) { return "BIT"; }
        });
        MetaTypes.makeDescendant("datetime", mssqlTypes, {
            prefix: "MSSQL",
            addParameter: function (TYPES, request, name, val) {
                request.addParameter(name, TYPES.DateTime2, val, {});
            },
            toSql: function (provider, field) { return "DATETIME2"; }
        });
        
        var MSSQLTypes = Base.extend({

            types: mssqlTypes,

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
            }
        });

        return MSSQLTypes;
    }
);