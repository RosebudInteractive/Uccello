if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var Toolbar = Container.extend({

            className: "GenToolbar",
            classGuid: UCCELLO_CONFIG.classGuids.Toolbar,
            metaFields: [
                {fname:"ToolbarSize", ftype:"string"}, // big, small
                {fname:"ToolbarColor", ftype:"string"}, // Blue, White
                {fname:"CaptionStyle",ftype:"string"}, //None, Text, Image, Both
                {fname:"Caption",ftype:"string"},
                {fname:"Image",ftype:"string"},
                {fname:"ContentAlign",ftype:"string"},
                {fname:"Spacing",ftype:"string"},
                {fname:"LayersContainer",ftype:{
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.LayersContainer
                }}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            /**
             * Properties
             * @param value
             * @returns {*}
             */

            toolbarSize: function(value) {
                return this._genericSetter("ToolbarSize", value);
            },
            toolbarColor: function(value) {
                return this._genericSetter("ToolbarColor", value);
            },
            captionStyle: function(value) {
                return this._genericSetter("CaptionStyle", value);
            },
            caption: function(value) {
                return this._genericSetter("Caption", value);
            },
            image: function(value) {
                return this._genericSetter("Image", value);
            },
            contentAlign: function(value) {
                return this._genericSetter("ContentAlign", value);
            },
            spacing: function(value) {
                return this._genericSetter("Spacing", value);
            },
            layersContainer: function(value) {
                return this._genericSetter("LayersContainer", value);
            }
        });
        return Toolbar;
    }
);