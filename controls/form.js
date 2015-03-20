if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container ) {
        var Form = Container.extend({

            className: "Form",
            classGuid: UCCELLO_CONFIG.classGuids.Form,
            metaFields: [],
            metaCols: [ {"cname": "Params", "ctype": "control"},{"cname": "Children", "ctype": "control"},{"cname": "SubForms", "ctype": "control"} ],

            init: function(cm,params){
                this._super(cm,params);
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