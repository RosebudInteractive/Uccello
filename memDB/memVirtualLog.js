if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['../system/utils'],
	function (Utils) {

	    var subsMode = {
	        CurrentOnly: 0,
	        CurrentAndAllChilds: 1
	    };

	    var MemVirtualLog = UccelloClass.extend({

	        init: function (subs_mode, phLog) {
	            switch (subs_mode) {
	                case subsMode.CurrentOnly,
                        subsMode.CurrentAndAllChilds:
	                    this._subsMode = subs_mode;
	                    break;
	                default:
	                    throw new Error("MemVirtualLog::constructor: Unknown subscription mode: " + subs_mode + " !");
	            };
	            this._subsMode = subs_mode;
	            this._phLog = phLog;
	            this._guid = Utils.guid();
	            this._positions = [];
	            this._active = true;
	        },

	        getGuid: function () {
	            return this._guid;
	        },

	        getSubscriptionMode: function () {
	            return this._subsMode;
	        },

	        setActive: function (active) {
	            this._active = active;
	        },

	        getActive: function () {
	            return this._active;
	        },

	        addObject: function (obj) {
	            if (obj && (typeof (obj._setLogObject) === "function"))
	                this._phLog._addObjectToVLog(obj, this)
	            else
	                throw new Error("MemVirtualLog::addObject: Object isn't instance of \"MemProtoObj\"!");
	        },

	        reset: function () {
	            this._phLog._resetLog(this);
	            this._positions = [];
	        },

	        rollback: function () {
	            return this._phLog.rollback(this);
	        },

	        isFldModified: function (fldName, obj) {
	            return this._phLog.isFldModified(fldName, obj, this);
	        },

	        countModifiedFields: function (obj) {
	            return this._phLog.countModifiedFields(obj, this);
	        },

	        getOldFldVal: function (fldName, obj) {
	            return this._phLog.getOldFldVal(fldName, obj, this);
	        },

	        countModifiedCols: function (obj) {
	            return this._phLog.countModifiedCols(obj, this);
	        },

	        getLogCol: function (colName, obj) {
	            return this._phLog.getLogCol(colName, obj, this);
	        },

	        isDataModified: function (obj) {
	            return this._phLog.isDataModified(obj, this);
	        },

	        _addItem: function (item_idx) {
	            this._positions.push(item_idx);
	        },

	        _getHistory: function () {
	            return this._positions;
	        },

	    });

	    MemVirtualLog.SubscriptionMode = subsMode;

	    return MemVirtualLog;
	}
);