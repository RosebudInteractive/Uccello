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
			        res_elem_type: UCCELLO_CONFIG.classGuids.DatasetBase
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
				    var dsmod = ds.isDataSourceModified("pd");
					if (ds.isFldModified("Cursor","pd") || dsmod) this._isRendered(false);
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

					ds.event.on({
						type: "beforeStateChange",
						subscriber: this,
						callback: function() { this._isRendered(false); console.log("beforeStateChange", this, arguments)}
					});
					ds.event.on({
						type: "afterStateChange",
						subscriber: this,
						callback: function() { this._isRendered(false); console.log("afterStateChange", this, arguments)}
					});
					ds.event.on({
						type: "mod%AutoEdit",
						subscriber: this,
						callback: function() { this._isRendered(false); }
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