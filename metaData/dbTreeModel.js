if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./dbTreeModelRoot', './metaDefs'],
    function (DbTreeModelRoot, Meta) {
        var DbTreeModel = DbTreeModelRoot.extend({

            className: "DbTreeModel",
            classGuid: UCCELLO_CONFIG.classGuids.DbTreeModel,
            metaFields: [
                {
                    fname: "FieldRef", ftype: {
                        type: "ref",
                        external: true,
                        res_type: UCCELLO_CONFIG.classGuids.MetaModel,
                        res_elem_type: UCCELLO_CONFIG.classGuids.MetaModelField
                    }
                }
            ],

            fieldRef: function (value) {
                return this._genericSetter("FieldRef", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _getReqElem: function () {
                var result = UccelloClass.super.apply(this, []);

                var parentField;
                if (this.fieldRef())
                    parentField = this.fieldRef().name();
                else
                    parentField = this.getSerialized("FieldRef").elemName;
                if (parentField)
                    result.parentField = parentField;

                if (this.alias())
                    result.alias = this.alias();

                return result;
            },

        });
        return DbTreeModel;
    }
);