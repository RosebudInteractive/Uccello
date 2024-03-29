/**
 * Created by kiknadze on 23.03.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aComponent'],
    function(Component) {
        var DesignerControl = Component.extend({

            className: "DesignerControl",
            classGuid: UCCELLO_CONFIG.classGuids.DesignerControl,
            metaCols: [],
            metaFields: [
                {fname:"TypeGuid", ftype:"string"},
                {fname: "ControlProperties", ftype:"string"}
            ],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _onDirtyRender: function(result) {
                this.getParent()._isRendered(false);
                this.pvt.isRendered = false;
            },

            /**
             * Properties
             * @param value
             * @returns {*}
             */

            typeGuid: function(value) {
                return this._genericSetter("TypeGuid", value);
            },

            controlProperties: function(value) {
                return this._genericSetter("ControlProperties", value);
            }
        });
        return DesignerControl;
    }
);
