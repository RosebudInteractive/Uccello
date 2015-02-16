if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}
define(
    ['../controls/aComponent'],
    function(AComponent) {
        var DataContact = AComponent.extend({

            className: "DataContact",
            classGuid: "73596fd8-6901-2f90-12d7-d1ba12bae8f4",
            metaCols: [],
            metaFields: [
                {fname:"parent",ftype:"integer"},
                {fname:"firstname",ftype:"string"},
                {fname:"lastname",ftype:"string"},
                {fname:"birthdate",ftype:"date"},
                {fname:"country",ftype:"string"},
                {fname:"city",ftype:"string"},
                {fname:"address",ftype:"string"}
            ],

            init: function(cm,params){
                this._super(cm,params);
            },

            parent: function(value) {
                return this._genericSetter("parent", value);
            },

            firstname: function(value) {
                return this._genericSetter("firstname", value);
            },
            lastname: function(value) {
                return this._genericSetter("lastname", value);
            },
            birthdate: function(value) {
                return this._genericSetter("birthdate", value);
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
        return DataContact;
    }
);