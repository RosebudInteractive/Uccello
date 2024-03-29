if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['lodash', UCCELLO_CONFIG.uccelloPath + '/memDB/memMetaType', '../base/sqlTypes'],
    function (_, MetaTypes, Base) {

        // ����� �������������� ������� ����
        //
        var mysqlTypes = {};

        var MAX_NVARCHAR_LEN = 4000;

        // ��������, ��� "enum" ����� �������������� ���:
        //
        MetaTypes.makeDescendant("enum", mysqlTypes, {
            prefix: "MySQL",
            toSql: function (provider, field) {
                var enumDef = "ENUM(<%= vals%>)";
                var qGen = provider.queryGen();
                var enums = [];
                var self = this;
                _.forEach(this.values(), function (val) {
                    enums.push(qGen.escapeValue(val, self, []));
                });
                return _.template(enumDef)({ vals: enums.join(", ") }).trim();
            }
        });

        MetaTypes.makeDescendant("string", mysqlTypes, {
            prefix: "MySQL",
            toSql: function (provider, field) {
                var result;
                if (this._length > MAX_NVARCHAR_LEN)
                    result = "LONGTEXT";
                else
                    result = "VARCHAR(" + this._length + ")";
                return result;
            }
        });

        // ���������� �������, ��� ��� �� ���� ���������������
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