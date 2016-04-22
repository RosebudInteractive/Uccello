if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../common/keyValuePair'],
    function (KeyValuePair) {

        var DsAlias = KeyValuePair.extend({

            className: "DsAlias",
            classGuid: UCCELLO_CONFIG.classGuids.DsAlias,
            metaCols: [],
            metaFields: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });

        return DsAlias;
    }
);