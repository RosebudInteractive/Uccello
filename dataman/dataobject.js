if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../process/processObject'],
    function (ProcessObject) {
        var DataObject = ProcessObject.extend({

            className: "DataObject",
            classGuid: UCCELLO_CONFIG.classGuids.DataObject,
            metaCols: [],
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
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
                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
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