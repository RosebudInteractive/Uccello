if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../process/processObject', '../metaData/metaDefs'],
    function (ProcessObject, Meta) {

        var DataObject = ProcessObject.extend({

            className: "DataObject",
            classGuid: UCCELLO_CONFIG.classGuids.DataObject,
            metaCols: [],
            metaFields: [
                { fname: "_EditSet", ftype: "string" },
                { fname: "_ChildEdCnt", ftype: "int" },
                { fname: "_CurrState", ftype: "int" },
                { fname: "_PrevState", ftype: "int" }
            ],

            rowVersionFname: null,
            _persFields: {},
            _keyField: null,

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this.resetModifFldLog(Meta.DATA_LOG_NAME);
                    this._editSet("");
                    this._childEdCnt(0);
                    this._currState(Meta.State.Browse);
                    this._prevState(Meta.State.Browse);
                };
            },

            set: function (field, value, withCheckVal, isApplyLog) {
                if (typeof (field) !== "string")
                    throw new Error("DataObject::set: Invalid type of field name: \"" + typeof (field) + "\".");
                if ((!isApplyLog) && (value !== undefined) && (this._persFields[field] !== undefined)) {
                    var state = this._currState();
                    if ((state !== Meta.State.Edit) && (state !== Meta.State.Insert)) {
                        throw new Error("DataObject::set: Can't modify data-object in state \"" + Meta.stateToString(state) + "\".");
                    }
                    else
                        if (this.rowVersionFname && (field === this.rowVersionFname))
                            throw new Error("DataObject::set: Field \"" + Meta.ROW_VERSION_FNAME + "\" is READ ONLY.");
                };
                UccelloClass.super.apply(this, [field, value, withCheckVal]);
            },

            getOldValue: function (fldName, is_serialized) {
                var result = undefined;
                if (!this.isMaster())
                    throw new Error("Can't read \"old value\" of \""
                        + this.className + "." + fldName + "\" in \"Slave\" mode.");

                if (this.isFldModified(fldName, Meta.DATA_LOG_NAME))
                    result = this.getOldFldVal(fldName, Meta.DATA_LOG_NAME, is_serialized)
                else
                    result = is_serialized ? this.getSerialized(fldName) : this.get(fldName);

                return result;
            },

            edit: function (cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataObject::edit Invalid callback type \"" + typeof (callback) + "\".");

                var args = [];
                var local_name = "_$local_edit";
                if (!this.isMaster()) {
                    for (var i = 0; i < (arguments.length - 1) ; i++)
                        args[i] = arguments[i];
                    this.remoteCall(local_name, args, callback);
                }
                else
                    this[local_name].apply(this, arguments);
            },

            save: function (cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataObject::save Invalid callback type \"" + typeof (callback) + "\".");

                var args = [];
                var local_name = "_$local_save";
                if (!this.isMaster()) {
                    for (var i = 0; i < (arguments.length - 1) ; i++)
                        args[i] = arguments[i];
                    this.remoteCall(local_name, args, callback);
                }
                else
                    this[local_name].apply(this, arguments);
            },

            cancel: function (cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataObject::cancel Invalid callback type \"" + typeof (callback) + "\".");

                var args = [];
                var local_name = "_$local_cancel";
                if (!this.isMaster()) {
                    for (var i = 0; i < (arguments.length - 1) ; i++)
                        args[i] = arguments[i];
                    this.remoteCall(local_name, args, callback);
                }
                else
                    this[local_name].apply(this, arguments);
            },

            modify: function (modif_func, callback) {

                var self = this;

                function finalize(result) {
                    if (callback)
                        setTimeout(function () {
                            callback(result);
                        }, 0);
                };

                try {
                    this.edit(function (result) {
                        if (result && (result.result === "OK")) {
                            try {
                                modif_func();
                                self.save(finalize);
                            } catch (err) {
                                finalize({ result: "ERROR", message: err.message });
                            };
                        }
                        else
                            finalize(result);
                    });
                }
                catch (err) {
                    finalize({ result: "ERROR", message: err.message });
                };
            },

            getModifications: function () {
                var result = null;
                if (this.countModifiedFields(Meta.DATA_LOG_NAME) > 0) {
                    var data = {
                        key: this._keyField ? this.getOldValue(this._keyField, true) : null,
                        rowVersion: this.rowVersionFname ? this.getOldValue(this.rowVersionFname, true) : null
                    };
                    var dataObj = { op: "update", model: this.className, data: data };
                    for (var fldName in this._persFields) {
                        if (this.isFldModified(fldName, Meta.DATA_LOG_NAME)) {
                            if (!data.fields)
                                data.fields = {};
                            data.fields[fldName] = this.getSerialized(fldName);
                        };
                    };
                    if (data.fields)
                        result = dataObj;
                };
                return result;
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

            _setPendingState: function () {
                this._prevState(this._currState());
                this._currState(Meta.State.Pending);
                this._childEnterEdit();
            },

            _rollbackState: function () {
                if (this._currState() === Meta.State.Pending)
                    this._currState(this._prevState());
                this._childLeaveEdit();
            },

            _setNewState: function (state) {
                if (this._currState() !== Meta.State.Pending)
                    this._prevState(this._currState());
                this._currState(state);
            },

            _checkIfCanEdit: function (value) {
                var set = this._editSet();
                var state = this._currState();
                var ignore_op = ((set.length === 0) && ((state === Meta.State.Edit) || (state === Meta.State.Insert)));
                if ((!ignore_op) && (state !== Meta.State.Browse)) {
                    throw new Error("DataObject: Can't edit data-object in state \"" + Meta.stateToString(state) + "\".");
                };
                if ((!ignore_op) && (this._childEdCnt() > 0)) {
                    throw new Error("DataObject: Can't edit data-object when some CHILD objects in edit state.");
                };

                return ignore_op;
            },

            _checkIfCanSave: function (is_cancel) {
                var tp_str = is_cancel ? "cancel" : "save";
                var state = this._currState();
                var set = this._editSet();
                if ((state !== Meta.State.Edit) && (state !== Meta.State.Insert)) {
                    throw new Error("DataObject: Can't " + tp_str + " data-object in state \"" + Meta.stateToString(state) + "\".");
                };
                return set.length === 0;
            },

            _childEnterEdit: function (n) {
                var lvl = typeof (n) === "number" ? n : 1;
                for (var parent = this.getParent() ; parent; parent = parent.getParent()) {
                    if (typeof (parent._childEdCnt) === "function")
                        parent._childEdCnt(this._childEdCnt() + lvl);
                };
            },

            _childLeaveEdit: function (n) {
                var lvl = typeof (n) === "number" ? n : 1;
                for (var parent = this.getParent() ; parent; parent = parent.getParent()) {
                    if (typeof (parent._childEdCnt) === "function")
                        parent._childEdCnt(this._childEdCnt() - lvl);
                };
            },

            _editSet: function (value) {
                return this._genericSetter("_EditSet", value);
            },

            _childEdCnt: function (value) {
                return this._genericSetter("_ChildEdCnt", value);
            },

            _currState: function (value) {
                return this._genericSetter("_CurrState", value);
            },

            _prevState: function (value) {
                return this._genericSetter("_PrevState", value);
            },

            _$local_edit: function (cb) {

                var result = { result: "OK" };
                try {
                    if (!this._checkIfCanEdit()) {
                        this._editSet("current");
                        this._setNewState(Meta.State.Edit);
                        this._childEnterEdit();

                        if (this.getObjType().get("typeName") === "DataLead") {
                            var state = this._genericSetter("State");
                            if ((state == "Converted") || (state == "Archieved")) {
                                result.result = "ERROR";
                                result.message = "Can't edit \"" + state + "\" lead.";
                            };
                        };
                    };
                } catch (err) {
                    result = { result: "ERROR", message: err.message };
                };

                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            },

            _$local_save: function (cb) {
                var result = { result: "OK" };

                var self = this;

                try {
                    if (!this._checkIfCanSave()) {
                        this._setPendingState();

                        var ignore_child_save = self._editSet().length === 0;
                        var is_done = false;

                        function local_cb(result) {
                            if (!ignore_child_save)
                                if (result.result === "OK") {
                                    // ѕровер€ем, что запись действительно была изменена.
                                    if (result.detail && (result.detail.length === 1)
                                        && (result.detail[0].affectedRows === 1)) {

                                        // «апоминаем новое значение версии записи.
                                        if (self.rowVersionFname && result.detail[0].rowVersion)
                                            self.set(self.rowVersionFname, result.detail[0].rowVersion, false, true);

                                        self._editSet("");
                                        self._setNewState(Meta.State.Browse);
                                        // 2 раза, потому что был вызов _setPendingState
                                        self._childLeaveEdit(2);

                                        self.resetModifFldLog(Meta.DATA_LOG_NAME);
                                        //this.removeModifFldLog(Meta.DATA_LOG_NAME);
                                    }
                                    else {
                                        result = { result: "ERROR", message: "Data object has been modified by another user." };
                                        self._rollbackState();
                                    };
                                }
                                else
                                    self._rollbackState();

                            if (cb)
                                cb(result);
                        };

                        if ((!ignore_child_save) && $data && (this.countModifiedFields(Meta.DATA_LOG_NAME) > 0)) {
                            var dataObj = this.getModifications();
                            if (dataObj) {
                                var batch = [];
                                batch.push(dataObj);
                                is_done = true;
                                $data.execBatch(batch, local_cb);
                            };
                        };

                        if (!is_done)
                            setTimeout(function () {
                                local_cb(result);
                            }, 0);
                    }
                    else
                        if (cb)
                            setTimeout(function () {
                                cb({ result: "OK" });
                            }, 0);
                } catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0);
                };
            },

            _$local_cancel: function (cb) {

                var result = { result: "OK" };
                try {
                    if (!this._checkIfCanSave(true)) {
                        this._editSet("");
                        this._setNewState(Meta.State.Browse);
                        this._childLeaveEdit();
                    };
                } catch (err) {
                    result = { result: "ERROR", message: err.message };
                };

                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
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
            },
        });
        return DataObject;
    }
);