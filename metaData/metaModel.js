if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject'],
    function (UObject) {
        var MetaModel = UObject.extend({

            className: "MetaModel",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModel,
            metaCols: [{ "cname": "Fields", "ctype": "MetaModelField" }],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "DataObjectGuid", ftype: "string" }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }
        });
        return MetaModel;
    }
);