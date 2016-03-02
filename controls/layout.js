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
                    res_elem_type: UCCELLO_CONFIG.classGuids.AControl
                }},
                {fname:"Width", ftype:"string"},
                {fname:"Height", ftype:"string"}
            ],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
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
            }
        });
        return LayersContainer;
    }
);
