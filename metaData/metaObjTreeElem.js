if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./metaObjTreeElemRoot', './metaDefs'],
    function (MetaObjTreeElemRoot, Meta) {
        var MetaObjTreeElem = MetaObjTreeElemRoot.extend({

            className: "MetaObjTreeElem",
            classGuid: UCCELLO_CONFIG.classGuids.MetaObjTreeElem,
            metaFields: [
                { fname: "Alias", ftype: "string" },
                {
                    fname: "FieldRef", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.MetaModel,
                        res_elem_type: UCCELLO_CONFIG.classGuids.MetaModelField
                    }
                }
            ],

            alias: function (value) {
                return this._genericSetter("Alias", value);
            },

            fieldRef: function (value) {
                return this._genericSetter("FieldRef", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            }

        });
        return MetaObjTreeElem;
    }
);