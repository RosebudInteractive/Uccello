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

                if (params) {
                    this.dataReset();
                    if (this.get("OnDataInit"))
                        this.onDataInit = new Function(this.get("OnDataInit"));

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
                                            that._isDataInit = true;
                                            this.event.fire({ type: 'dataInit', target: this });
                                            if ("onDataInit" in this)
                                                setTimeout(function () {
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
                            callback: function (ds) { delete this._refreshedDataSets[ds.obj.getLid()]; }
                        }
                    ]);
                }
            },

            dataReset: function() {
                this._isDataInit = false;
                this._refreshedDataSets = {};
                var col = this.getCol("Datasets");
                for (var i = 0; i < col.count(); i++) {
                    var ds = col.get(i);
                    this._refreshedDataSets[ds.getLid()] = false;
                }
            }
        });
        return ADataModel;
    }
);