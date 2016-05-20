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
            metaFields: [
                {fname:"Title", ftype:"string"},
                {fname:"dbgName",ftype:"string"},
                {fname:"SelfRender", ftype:"boolean"},
                {fname: "CurrentControl", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.AControl
                }},
                {fname:"OnClose",ftype:"event"}
            ],
            metaCols: [{ "cname": "Params", "ctype": "UObject" }, { "cname": "SubForms", "ctype": "UObject" }],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);

                if (params) {
                    if (this.get("OnClose"))
                    /*jshint evil: true */
                        this.onClose = new Function("e", this.get("OnClose"));
                }
            },

            title: function (value) {
                return this._genericSetter("Title", value);
            },
            selfRender: function (value) {
                return this._genericSetter("SelfRender", value);
            },

            renderTo: function(element) {
                if (element !== undefined)
                    this._renderTo = element;
                return this._renderTo;
            },

            currentControl: function (value) {
                if (value !== undefined) {
                    console.log('TEST currentControl: '+value.name());
                    var curControl = this.currentControl();
                    if (curControl)
                        curControl._isRendered(false);
                    if (value)
                        value._isRendered(false);
                }
                return this._genericSetter("CurrentControl", value);
            },

            processDelta: function() {
                if (this.isFldModified("CurrentControl","pd")) {
                    var oldControl = this.getOldFldVal("CurrentControl","pd"),
                        newControl = this.currentControl();
                    if (oldControl)
                        oldControl._isRendered(false);
                    if (newControl)
                        newControl._isRendered(false);
                }
                this._isProcessed(true);
            },

            close: function(args) {
                if ("onClose" in this) this.onClose(args);
                this.event.fire({
                    type: 'OnClose',
                    target: this,
                    data: args
                });
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