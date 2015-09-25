if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../base/queryGen', 'lodash'],
    function (Base, _) {

        var MySqlQueryGen = Base.extend({

            init: function (engine, options) {
                UccelloClass.super.apply(this, [engine, options]);
            },

            dropTableQuery: function (model) {
                var query = "DROP TABLE IF EXISTS <%= table %>";
                return _.template(query)({ table: this.escapeId(model.name()) }).trim() + ";";
            },

            createTableQuery: function (model) {
                var query = "CREATE TABLE IF NOT EXISTS <%= table %> (<%= fields%>) ENGINE=InnoDB";
                var self = this;
                var attrs = [];
                _.forEach(model.fields(), function (field) {
                    attrs.push(self.escapeId(field.name()) + " " + field.fieldType().toSql());
                });
                var values = { table: this.escapeId(model.name()), fields: attrs.join(", ") };
                return _.template(query)(values).trim() + ";";
            },

            escapeValue: function (s) {
                return this.getNativeLib().escape(s);
            },

            escapeId: function (s) {
                return this.getNativeLib().escapeId(s);
            },

        });

        return MySqlQueryGen;
    }
);