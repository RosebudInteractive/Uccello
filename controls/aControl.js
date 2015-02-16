﻿if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}


//
define(
	['./aComponent'],
	function(AComponent) {
		var AControl = AComponent.extend({
		
			className: "AControl",
			classGuid: "c576cb6e-cdbc-50f4-91d1-4dc3b48b0b59",
            metaFields: [ {fname:"Top",ftype:"int"}, {fname:"Left",ftype:"int"}, {fname:"Width",ftype:"int"}, {fname:"Height",ftype:"int"} ],
				
			init: function(cm,params){
				this._super(cm,params);
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
            }


		});
		return AControl;
	}
);