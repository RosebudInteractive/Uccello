if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./dataObjectBase', '../metaData/metaDefs'],
    function (DataObjectBase, Meta) {

        var DataObject = DataObjectBase.extend({

            className: "DataObject",
            classGuid: UCCELLO_CONFIG.classGuids.DataObject,
            metaCols: [{ "cname": "Childs", "ctype": "DataRoot" }],
            metaFields: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this.resetModifFldLog(Meta.DATA_LOG_NAME);
                };
            },

            convert: function (cb) {
                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("convert");
                result = this._methodCall.apply(this, args);
            },

            archive: function (cb) {
                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("archive");
                result = this._methodCall.apply(this, args);
            },

            _$local_convert: function (cb) {
                var self = this;
                this.modify(function () {
                    self._genericSetter("State", "Converted");
                }, cb);
            },

            _$local_archive: function (cb) {
                var self = this;
                this.modify(function () {
                    self._genericSetter("State", "Archieved");
                }, cb);
            }
        });
        return DataObject;
    }
);