if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aComponent'],
    function(AComponent) {
        var DataField = AComponent.extend({

            className: "DataField",
            classGuid: "4bade3a6-4a25-3887-4868-9c3de4213729",
            metaCols: [],
            metaFields: [],

            init: function(cm, params) {
                this._super(cm, params);
                this.params = params;
            }

        });
        return DataField;
    }
);