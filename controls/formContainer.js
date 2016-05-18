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

            loadForm: function(formGuid, options, cb) {
                if (typeof options == "function") {
                    callback = options;
                    options = null;
                }

                var that = this;
                var cm = this.getControlMgr();
                cm.tranStart();

                var roots = cm.getRootGuids();
                var guid = formGuid;
                for (var i = 0; i < roots.length; i++) {
                    if (roots[i] && roots[i].indexOf(formGuid) >= 0) {
                        guid = roots[i];
                        break;
                    }
                }

                function callback(guids) {
                    var obj = cm.getContext().getContextCM().get(guids.guids[0]);
                    if (obj) {
                        if (options) {
                            var form = obj.getForm();
                            var fParams = form.getCol("Params");
                            for (var i = 0; i < fParams.count(); i++) {
                                var param = fParams.get(i);
                                if (param.kind() == "in" && options[param.name()] !== undefined)
                                    param.value(options[param.name()]);
                            }
                        }
                        cm.allDataReset(obj.getForm());
                        cm.allDataInit(obj.getForm());
                    }
                    if (obj) {
                        obj.getForm().selfRender(false);
                        that.resource(guids.guids[0]);
                    }
                    cm.tranCommit();
                    if (cb) cb(obj);
                }

                if (guid == formGuid) {
                    cm.getRoots([guid], {rtype: "res", depth: 1}, callback);
                } else {
                    setTimeout(function() {
                        var obj = cm.getContext().getContextCM().get(guid);
                        cm.setToRendered(obj.getForm(), false);
                        that._isRendered(false);
                        callback({guids: [guid]});
                    }, 0);
                }

            }
        });
        return FormContainer;
    }
);

