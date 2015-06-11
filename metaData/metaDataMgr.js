if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {
        var MetaDataMgr = UObject.extend({

            className: "MetaDataMgr",
            classGuid: UCCELLO_CONFIG.classGuids.MetaDataMgr,
            metaCols: [{ "cname": "Models", "ctype": "MetaModel" }],
            metaFields: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return MetaDataMgr;
    }
);