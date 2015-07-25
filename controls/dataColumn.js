if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aComponent'],
    function(AComponent) {
        var DataColumn = AComponent.extend({

            className: "DataColumn",
            classGuid: UCCELLO_CONFIG.classGuids.DataColumn,
            metaCols: [],
            metaFields: [{ fname: "Label", ftype: "string" }, { fname: "Width", ftype: "int" }, { fname: "Values", ftype: "string" },
                {
                    fname: "Field", ftype: {
                        type: "ref",
                        res_elem_type: UCCELLO_CONFIG.classGuids.DataField
                    }
                }],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },

			_onDirtyRender: function(result) {
				this.getParent()._isRendered(false);
				this.pvt.isRendered = false;
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
            },
            values: function(value) {
                return this._genericSetter("Values", value);
            }

        });
        return DataColumn;
    }
);