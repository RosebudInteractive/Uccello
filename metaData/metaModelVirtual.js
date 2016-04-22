if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./metaModel'],
    function (MetaModel) {

        var MetaModelVirtual = MetaModel.extend({

            className: "MetaModelVirtual",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModelVirtual,
            metaCols: [
                { "cname": "ProviderSQLs", "ctype": "KeyValuePair" },
                { "cname": "Bindings", "ctype": "UObject" }
            ],
            metaFields: [
                { fname: "DefaultSQL", ftype: "string" }
            ],

            isVirtual: function () {
                return true;
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

        });

        return MetaModelVirtual;
    }
);