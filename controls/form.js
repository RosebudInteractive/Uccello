if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/vContainer'],
    function(VContainer ) {
        var Form = VContainer.extend({

            className: "Form",
            classGuid: UCCELLO_CONFIG.classGuids.Form,
            metaFields: [{fname:"Title", ftype:"string"},{fname:"dbgName",ftype:"string"}, {
                fname: "CurrentControl", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.AControl
                }
            }],
            metaCols: [{ "cname": "Params", "ctype": "UObject" }, { "cname": "SubForms", "ctype": "UObject" }],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            title: function (value) {
                return this._genericSetter("Title", value);
            },
            currentControl: function (value) {
                if (value !== undefined) {
                    var curControl = this.currentControl();
                    if (curControl)
                        this._isRendered(false);
                    if (value)
                        value._isRendered(false);
                }
                return this._genericSetter("CurrentControl", value);
            }
			/*
			load: function(rootGuids,params, cb) {
				if (this.getModule().isMaster()) {
					console.log("MASTER LOAD!!");
				}
				else {
					this.remoteCall('load', [rootGuids, params]);
				}
			},*/
			
        });
        return Form;
    }
);