if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./aControl'],
	function(AControl) {
		var ADataControl = AControl.extend({

			className: "ADataControl",
			classGuid: UCCELLO_CONFIG.classGuids.ADataControl,
			metaFields: [{
			    fname: "Dataset", ftype: {
			        type: "ref",
			        res_elem_type: UCCELLO_CONFIG.classGuids.Dataset
			    }
			}],

			init: function(cm,params){
				UccelloClass.super.apply(this, [cm, params]);
			},
			

			subsInit: function() {
				this._subsDataSet();
			},

			processDelta: function() {
				var ds = this.dataset();
				if (ds) { 
				    if (!ds._isProcessed()) ds.processDelta(); // если у датасета processDelta еще не вызван, то вызвать его
				    var root = ds.root();
				    if (root)
				        var dsmod = root.isDataModified();
				    else dsmod = false;
					if (ds.isFldModified("Root") || ds.isFldModified("Cursor") || dsmod) this._isRendered(false);
				}
				this._isProcessed(true);

			},

			_subsDataSet: function() {
				var ds = this.dataset();
				if (ds) {					
				    ds.event.on({
						type: 'refreshData',
						subscriber: this,
						callback: function(){ this._isRendered(false); }
					});
					ds.event.on({
						type: 'moveCursor',
						subscriber: this,
						callback: function(){ this._isRendered(false); }
					});
					ds.event.on({
						type: 'modFld',
						subscriber: this,
						callback: function(){ this._isRendered(false); }
					});					
				}
			},

            dataset: function (value) {
                return this._genericSetter("Dataset", value);
            }


        });
		return ADataControl;
	}
);