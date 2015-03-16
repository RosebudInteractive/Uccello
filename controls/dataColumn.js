if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aComponent'],
    function(AComponent) {
        var DataColumn = AComponent.extend({

            className: "DataColumn",
            classGuid: "100f774a-bd84-8c46-c55d-ba5981c09db5",
            metaCols: [],
            metaFields: [{fname:"Label", ftype:"string"}, {fname:"Width", ftype:"int"}, {fname:"Field", ftype:"string"}],

            init: function(cm, params) {
                this._super(cm, params);
                this.params = params;
            },

            // Properties
            label: function(value) {
                return this._genericSetter("Label", value);
            },
            width: function(value) {
                return this._genericSetter("Width", value);
            },
            field: function(value) {
                return this._genericSetter("Field", value);
            }

        });
        return DataColumn;
    }
);