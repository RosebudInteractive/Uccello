if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aDataControl'],
    function(ADataControl) {
        var ADataFieldControl = ADataControl.extend({

            className: "ADataFieldControl",
            classGuid: UCCELLO_CONFIG.classGuids.ADataFieldControl,
            metaFields: [{fname: "DataField", ftype: "string"}],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            dataField: function (value) {
                return this._genericSetter("DataField", value);
            }
        });
        return ADataFieldControl;
    }
);