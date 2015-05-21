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
				//console.log("create "+this.name());

			},
			

			subsInit: function() {
				this._subsDataSet();
			},

			processDelta: function() {
				var dsg = this.dataset();
				if (dsg) { // TODO лучше сделать через методы компонента чем лезть в ОД
				    //var dsc = this.getComp(dsg);
				    var dsc = dsg;
				    if (!dsc._isProcessed()) dsc.processDelta(); // если у датасета processDelta еще не вызван, то вызвать его
					//if (dsc.root() && this.getDB().getObj(dsc.root()))
					//	var dsmod = this.getDB().getObj(dsc.root()).isDataModified();
				    if (dsc.rootInstance() && this.getDB().getObj(dsc.rootInstance()))
				        var dsmod = this.getDB().getObj(dsc.rootInstance()).isDataModified();
				    else dsmod = false;
					if (dsc.isFldModified("Root") || dsc.isFldModified("Cursor") || dsmod) this._isRendered(false);
				}
				this._isProcessed(true);

			},

			_subsDataSet: function() {
				var dsg = this.dataset();
				if (dsg) {					
				    //var ds = this.getComp(dsg);
				    var ds = dsg;
				    ds.event.on({
						type: 'refreshData',
						subscriber: this,
						callback: function(){ this._isRendered(false); }
					});
					ds.event.on({
						type: 'moveCursor',
						subscriber: this,
						callback: function(){ this._isRendered(false); /* console.log("isrendered subs "+this.name());*/ }
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