if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/vContainer'],
    function(VContainer ) {
        var Form = VContainer.extend({

            className: "Form",
            classGuid: UCCELLO_CONFIG.classGuids.Form,
            metaFields: [{fname:"Title", ftype:"string"}],
            metaCols: [ {"cname": "Params", "ctype": "control"},{"cname": "Children", "ctype": "control"},{"cname": "SubForms", "ctype": "control"} ],

            init: function(cm,params){
                this._super(cm,params);
            },

            title: function (value) {
                return this._genericSetter("Title", value);
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