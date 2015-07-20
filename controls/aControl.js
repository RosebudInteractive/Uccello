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
                {fname:"LayoutProp", ftype:"string"},
                {fname:"PadLeft", ftype:"string"},
                {fname:"PadRight", ftype:"string"},
                {fname:"PadTop", ftype:"string"},
                {fname:"PadBottom", ftype:"string"},
                {fname:"HorizontalAlign", ftype:"string"},
                {fname:"VerticalAlign", ftype:"string"},
                {fname:"MinWidth", ftype:"string"},
                {fname:"MinHeight", ftype:"string"},
                {fname:"MaxWidth", ftype:"string"},
                {fname:"MaxHeight", ftype:"string"},
                {fname:"Enabled", ftype:"boolean"}
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
            },

            padLeft: function(value) {
                return this._genericSetter("PadLeft", value);
            },

            padRight: function(value) {
                return this._genericSetter("PadRight", value);
            },

            padTop: function(value) {
                return this._genericSetter("PadTop", value);
            },

            padBottom: function(value) {
                return this._genericSetter("PadBottom", value);
            },

            horizontalAlign: function(value) {
                return this._genericSetter("HorizontalAlign", value);
            },

            verticalAlign: function(value) {
                return this._genericSetter("VerticalAlign", value);
            },

            minWidth: function(value) {
                return this._genericSetter("MinWidth", value);
            },

            maxWidth: function(value) {
                return this._genericSetter("MaxWidth", value);
            },

            minHeight: function(value) {
                return this._genericSetter("MinHeight", value);
            },

            maxHeight: function(value) {
                return this._genericSetter("MaxHeight", value);
            },

            enabled: function(value) {
                return this._genericSetter("Enabled", value);
            }


		});
		return AControl;
	}
);