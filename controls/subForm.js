if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var SubForm = AComponent.extend({

            className: "SubForm",
            classGuid: UCCELLO_CONFIG.classGuids.SubForm,
            metaFields: [
                {fname: "FormGuid", ftype: "string"}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);

            },

            formGuid: function (value) {
                return this._genericSetter("FormGuid", value);
            }
        });
        return SubForm;
    }
);