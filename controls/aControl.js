if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


//
define(
	['./aComponent'],
	function(AComponent) {
		var AControl = AComponent.extend({
		
			className: "AControl",
			classGuid: UCCELLO_CONFIG.classGuids.AControl,
            metaFields: [
                {fname:"Top", ftype:"int"},
                {fname:"Left", ftype:"int"},
                {fname:"Width", ftype:"int"},
                {fname:"Height", ftype:"int"},
                {fname:"LayoutProp", ftype:"string"}
            ],
				
			init: function(cm,params){
				UccelloClass.super.apply(this, [cm, params]);
			},

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {
                viewset.render.apply(this, [options]);
            },

            top: function(value) {
                return this._genericSetter("Top", value);
            },

            left: function(value) {
                return this._genericSetter("Left", value);
            },

            width: function(value) {
                return this._genericSetter("Width", value);
            },

            height: function(value) {
                return this._genericSetter("Height", value);
            },

            layoutProp: function(value) {
                return this._genericSetter("LayoutProp", value);
            }


		});
		return AControl;
	}
);