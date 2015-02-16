if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./aDataControl'],
    function(ADataControl) {
        var ADataFieldControl = ADataControl.extend({

            className: "ADataFieldControl",
            classGuid: "00a12976-6fe3-6592-1984-635684b30885",
            metaFields: [{fname: "DataField", ftype: "string"}],

            init: function(cm,params){
                this._super(cm,params);
            },

            dataField: function (value) {
                return this._genericSetter("DataField", value);
            }
        });
        return ADataFieldControl;
    }
);