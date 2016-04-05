/**
 * Created by kiknadze on 14.03.2016.
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/adaptiveContainer'],
    function(Container) {
        var FormDesigner = Container.extend({

            className: "FormDesigner",
            classGuid: UCCELLO_CONFIG.classGuids.FormDesigner,
            metaCols: [
                {"cname": "Controls", "ctype": "AComponent"},
                {"cname": "Layouts", "ctype": "AComponent"}
            ],
            metaFields: [{
                fname: "Cursor", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.AComponent
                }},
                {fname:"CurrentLayout", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.Layout
                }}
            ],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            cursor: function(value) {
                return this._genericSetter("Cursor", value);
            },

            currentLayout: function(value) {
                return this._genericSetter("CurrentLayout", value);
            }
        });
        return FormDesigner;
    }
);
