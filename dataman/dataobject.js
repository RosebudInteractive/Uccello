if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../process/processObject'],
    function (ProcessObject) {

        var DATA_LOG_NAME = "data_log";

        var DataObject = ProcessObject.extend({

            className: "DataObject",
            classGuid: UCCELLO_CONFIG.classGuids.DataObject,
            metaCols: [],
            metaFields: [],

            init: function (cm, params) {
                this._persFields = {};
                this._keyField = null;
                UccelloClass.super.apply(this, [cm, params]);
            },

            getOldValue: function (fldName) {
                var result = undefined;
                if (!this.isMaster())
                    throw new Error("Can't read \"old value\" of \""
                        + this.className + "." + fldName + "\" in \"Slave\" mode.");

                if (this.isFldModified(fldName, DATA_LOG_NAME))
                    result = this.getOldFldVal(fldName, DATA_LOG_NAME)
                else
                    result = this.get(fldName);

                return result;
            },

            edit: function (cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("edit");
                result = this._methodCall.apply(this, args);

                return result;
            },

            save: function (cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("save");
                result = this._methodCall.apply(this, args);

                return result;
            },

            cancel: function (cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("cancel");
                result = this._methodCall.apply(this, args);

                return result;
            },

            convert: function (cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("convert");
                result = this._methodCall.apply(this, args);

                return result;
            },

            archive: function (cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("archive");
                result = this._methodCall.apply(this, args);

                return result;
            },

            _$local_edit: function (cb) {
                this.resetModifFldLog(DATA_LOG_NAME);

                var result = { result: "OK" };
                var state=this._genericSetter("State");
                if ((state == "Converted") || (state == "Archieved")) {
                    result.result = "ERROR";
                    result.message = "Can't edit \"" + state + "\" lead.";
                };
                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            },

            _$local_save: function (cb) {
                var result = { result: "OK" };

                if ($data && this.countModifiedFields(DATA_LOG_NAME)) {
                    var data = { key: this._keyField ? this.getOldValue(this._keyField) : null };
                    var dataObj = { op: "update", model: this.className, data: data };
                    for (var fldName in this._persFields) {
                        if (this.isFldModified(fldName, DATA_LOG_NAME)) {
                            if (!data.fields)
                                data.fields = {};
                            data.fields[fldName] = this.getSerialized(fldName);
                        };
                    };
                    if (data.fields) {
                        var batch = [];
                        batch.push(dataObj);
                        $data.execBatch(batch, cb);
                    };
                }
                else
                    if (cb)
                        setTimeout(function () {
                            cb(result);
                        }, 0);

                this.removeModifFldLog(DATA_LOG_NAME);
            },

            _$local_cancel: function (cb) {
                var result = { result: "OK" };
                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            },

            _$local_convert: function (cb) {
                var result = { result: "OK" };
                this._genericSetter("State", "Converted");
                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            },

            _$local_archive: function (cb) {
                var result = { result: "OK" };
                this._genericSetter("State", "Archieved");
                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            },
        });
        return DataObject;
    }
);