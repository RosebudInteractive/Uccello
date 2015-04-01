if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
	['./aControl'],
	function(AControl) {
		var ADataControl = AControl.extend({

			className: "ADataControl",
			classGuid: UCCELLO_CONFIG.classGuids.ADataControl,
            metaFields: [{fname: "Dataset", ftype: "string"}],

			init: function(cm,params){
				this._super(cm,params);

			},
			

			subsInit: function() {
				this._subsDataSet();
			},

			processDelta: function() {
				var dsg = this.dataset();
				if (dsg) { // TODO лучше сделать через методы компонента чем лезть в ОД
					var dsc = this.getComp(dsg); //getControlMgr().get(dsg);
					var dso = dsc.getObj();
					if (!dsc._isProcessed()) dsc.processDelta(); // если у датасета processDelta еще не вызван, то вызвать его
					if (dsc.root() && this.getControlMgr().getDB().getObj(dsc.root()))
					  var dsmod = this.getDB().getObj(dsc.root()).isDataModified();
					else dsmod = false;
					if (dso.isFldModified("Root") || dso.isFldModified("Cursor") || dsmod) this._isRendered(false);
				}
				this._isProcessed(true);

			},

			_subsDataSet: function() {
				var dsg = this.dataset();
				if (dsg) {					
					//var ds = this.getControlMgr().get(dsg);
					var ds = this.getComp(dsg);
					console.log("subs "+this.name()+" to "+ds.name());
					ds.event.on({
						type: 'refreshData',
						subscriber: this,
						callback: function(){ this._isRendered(false); }
					});
					ds.event.on({
						type: 'moveCursor',
						subscriber: this,
						callback: function(){ this._isRendered(false); console.log("isrendered subs "+this.name()); }
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