if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}
define(
    ['../controls/aComponent'],
    function(AComponent) {
        var DataContract = AComponent.extend({

            className: "DataContract",
            classGuid: "08a0fad1-d788-3604-9a16-3544a6f97721",
            metaCols: [],
            metaFields: [
                {fname:"parent",ftype:"integer"},
                {fname:"number",ftype:"string"},
                {fname:"total",ftype:"integer"}
            ],

            init: function(cm,params){
                this._super(cm,params);
            },

            parent: function(value) {
                return this._genericSetter("parent", value);
            },

            total: function(value) {
                return this._genericSetter("total", value);
            },
            number: function(value) {
                return this._genericSetter("number", value);
            }
        });
        return DataContract;
    }
);