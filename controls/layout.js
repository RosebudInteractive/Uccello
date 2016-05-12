/**
 * Created by kiknadze on 25.02.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aComponent'],
    function(Component) {
        var LayersContainer = Component.extend({

            className: "Layout",
            classGuid: UCCELLO_CONFIG.classGuids.Layout,
            metaCols: [{"cname": "Layouts", "ctype": "Layout"}],
            metaFields: [
                {fname:"Direction", ftype:"string"},
                {fname:"Control", ftype:{
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.AComponent
                }},
                {fname:"Width", ftype:"string"},
                {fname:"Height", ftype:"string"},
                {fname:"MaxTargetWidth", ftype:"int"},
                {fname:"TabNumber", ftype:"int"},
                {fname:"SizeUnits", ftype:"int"}
            ],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _onDirtyRender: function(result) {
                var container = this._getContainer();
                container._isRendered(false);
                this.pvt.isRendered = false;
            },

            /*_isRendered: function(value) {
                UccelloClass.super.apply(this, [value]);
                var container = this._getContainer();
                if (container) container._isRendered(false);
            },*/

            _getContainer: function() {
                var parent = this.getParentComp();
                while (parent && parent.className != "AdaptiveContainer" && parent.className != "FormDesigner")
                    parent = parent.getParentComp();
                return parent;
            },

            /**
             * Properties
             * @param value
             * @returns {*}
             */

            direction: function(value) {
                return this._genericSetter("Direction", value);
            },

            width: function(value) {
                return this._genericSetter("Width", value);
            },

            height: function(value) {
                return this._genericSetter("Height", value);
            },

            control: function (value) {
                return this._genericSetter("Control", value);
            },

            maxTargetWidth: function(value) {
                return this._genericSetter("MaxTargetWidth", value);
            },

            tabNumber: function(value) {
                return this._genericSetter("TabNumber", value);
            },

            sizeUnits: function(value) {
                return this._genericSetter("SizeUnits", value);
            }

        });
        return LayersContainer;
    }
);
