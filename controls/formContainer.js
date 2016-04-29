/**
 * Created by kiknadze on 26.04.2016.
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(Control) {
        var FormContainer = Control.extend({

            className: "FormContainer",
            classGuid: UCCELLO_CONFIG.classGuids.FormContainer,
            metaFields: [{
                fname: "Resource", ftype: {
                    type: "ref",
                    external: true,
                    res_type: UCCELLO_CONFIG.classGuids.ResForm,
                    res_elem_type: UCCELLO_CONFIG.classGuids.ResForm
                }}
            ],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            resource: function(value) {
                return this._genericSetter("Resource", value);
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {
                viewset.render.apply(this, [options]);

                if (this.resource()) {
                    var renderItem = {};
                    renderItem[this.resource().getGuid()] = viewset.getFormDivId.apply(this);
                    this.resource().getForm().renderTo(renderItem[this.resource().getGuid()]);
                    this.getControlMgr().getContext().renderForms(
                        [this.resource().getGuid()], renderItem);
                }
            },

            loadForm: function(formGuid, callback) {
                var that = this;
                var cm = this.getControlMgr();
                cm.tranStart();
                cm.getRoots([formGuid], { rtype: "res", depth: 1  }, function(guids) {
                    var obj = cm.getContext().getContextCM().get(guids.guids[0]);
                    if (obj)
                        cm.allDataInit(obj.getForm());
                    cm.tranCommit();
                    if (obj) {
                        obj.getForm().selfRender(false);
                        that.resource(guids.guids[0]);
                    }
                });

            }
        });
        return FormContainer;
    }
);

