if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType', '../base/sqlTypes'],
    function (MetaTypes, Base) {

        // «десь переопредел€ем базовые типы
        //
        var mysqlTypes = {};

        // Ќапример, тип "int" можно переопределить так:
        //
        //MetaTypes.makeDescendant("int", types, { toSql: function () { return "INT"; } });

        // »спользуем базовые, там где не было переопределени€
        //
        var baseTypes = Base.prototype.types;
        var keys = Object.keys(baseTypes);
        for (var i = 0; i < keys.length; i++)
            if (!mysqlTypes[keys[i]])
                mysqlTypes[keys[i]] = baseTypes[keys[i]];

        var MySqlTypes = Base.extend({

            types: mysqlTypes,

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
            }
        });

        return MySqlTypes;
    }
);