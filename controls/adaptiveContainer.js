/**
 * Created by kiknadze on 25.02.2016.
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var AdaptiveContainer = Container.extend({

            className: "AdaptiveContainer",
            classGuid: UCCELLO_CONFIG.classGuids.AdaptiveContainer,
            metaCols: [{"cname": "Layouts", "ctype": "Layout"}],
            metaFields: [],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _getLayoutByControl: function(layout, controlId) {
                if (layout.control() && layout.control().getGuid() == controlId) return layout;
                var children = layout.getCol("Layouts");
                for (var i = 0; i < children.count(); i++) {
                    var l = children.get(i);
                    var res = this._getLayoutByControl(l, controlId);
                    if (res) return res;
                }
                return null;
            }
        });
        return AdaptiveContainer;
    }
);
