if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
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
                this._super(cm,params);

            },

            formGuid: function (value) {
                return this._genericSetter("FormGuid", value);
            }
        });
        return SubForm;
    }
);