if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aComponent'],
    function(AComponent) {
        var DataField = AComponent.extend({

            className: "DataField",
            classGuid: UCCELLO_CONFIG.classGuids.DataField,
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