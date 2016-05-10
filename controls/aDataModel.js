if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var ADataModel = AComponent.extend({

            className: "ADataModel",
            classGuid: UCCELLO_CONFIG.classGuids.ADataModel,
            metaCols: [
                { "cname": "Datasets", "ctype": "AComponent" }
            ],
            metaFields: [
                { "fname": "OnDataInit", "ftype": "event" }
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
                this._isDataInit = false;

                if (params) {
                    if (this.get("OnDataInit"))
                        this.onDataInit = new Function(this.get("OnDataInit"));

                    this._refreshedDataSets = {};
                    var that = this;

                    var col = this.getCol("Datasets");
                    col.on([
                        {
                            type: 'add',
                            subscriber: this,
                            callback: function (e) {
                                var ds = e.obj;
                                this._refreshedDataSets[ds.getLid()] = false;
                                ds.event.on({
                                    type: 'refreshData',
                                    subscriber: that,
                                    callback: function (e) {
                                        delete this._refreshedDataSets[e.target.getLid()];
                                        var empty = true;
                                        for (var it in this._refreshedDataSets) {
                                            empty = false;
                                            break;
                                        }
                                        if (empty && (!this._isDataInit)) {
                                            this.event.fire({ type: 'dataInit', target: this });
                                            if ("onDataInit" in this)
                                                setTimeout(function () {
                                                    that._isDataInit = true;
                                                    that.onDataInit();
                                                }, 0);

                                        }
                                    }
                                });
                            }
                        },
                        {
                            type: 'del',
                            subscriber: this,
                            callback: function (ds) { delete this._refreshedDataSets[ds.getLid()]; }
                        }
                    ]);
                }
            }
        });
        return ADataModel;
    }
);