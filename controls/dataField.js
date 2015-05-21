if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
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
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            }

        });
        return DataField;
    }
);