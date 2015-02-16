if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}
define(
    ['../controls/aComponent'],
    function(AComponent) {
        var DataCompany = AComponent.extend({

            className: "DataCompany",
            classGuid: "59583572-20fa-1f58-8d3f-5114af0f2c51",
            metaCols: [],
            metaFields: [
                {fname:"country",ftype:"string"},
                {fname:"city",ftype:"string"},
                {fname:"address",ftype:"string"}
            ],

            init: function(cm,params){
                this._super(cm,params);
            },

            country: function(value) {
                return this._genericSetter("country", value);
            },
            city: function(value) {
                return this._genericSetter("city", value);
            },
            address: function(value) {
                return this._genericSetter("address", value);
            }
        });
        return DataCompany;
    }
);