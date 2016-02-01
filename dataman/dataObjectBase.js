if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../process/processObject', '../metaData/metaDefs'],
    function (ProcessObject, Meta) {
        var DataObjectBase = ProcessObject.extend({

            className: "DataObjectBase",
            classGuid: UCCELLO_CONFIG.classGuids.DataObjectBase,
            metaCols: [],
            metaFields: [
                { fname: "_EditSet", ftype: "string" },
                { fname: "_ChildEdCnt", ftype: "int" },
                { fname: "_CurrState", ftype: "int" },
                { fname: "_PrevState", ftype: "int" }
            ],

            rowVersionFname: null,
            _keyField: null,
            _parentField: null,
            _persFields: {},

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
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
                            throw new Error("DataObject::set: Field \"" + field + "\" is READ ONLY.")
                        else
                            if (this._parentField && (field === this._parentField))
                                throw new Error("DataObject::set: Field \"" + field + "\" is READ ONLY.");
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

            getModifications: function (state) {
                var result = null;
                if (state === Meta.State.Insert) {
                    var fields = {};
                    fields.Guid = this.getGuidRes();
                    var ver_fld_name = this.rowVersionFname;
                    for (var fldName in this._persFields) {
                        if (ver_fld_name !== fldName) {
                            var val = this.getSerialized(fldName);
                            if (val !== undefined)
                                fields[fldName] = val;
                        };
                    };
                    result = {
                        op: "insert",
                        model: this.className,
                        data: { fields: fields }
                    };
                }
                else
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

            edit: function (cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataObjectBase::edit Invalid callback type \"" + typeof (callback) + "\".");

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

            save: function (options, cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataObjectBase::save Invalid callback type \"" + typeof (callback) + "\".");

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
                    throw new Error("DataObjectBase::cancel Invalid callback type \"" + typeof (callback) + "\".");

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

            modify: function (modif_func, options, callback) {

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
                                self.save(options, finalize);
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

            _$local_cancel: function (cb) {

                var result = { result: "OK" };
                try {
                    if (!this._checkIfCanSave(true)) {
                        this._editSet("");
                        this._setNewState(Meta.State.Browse);
                        this._childLeaveEdit();
                        this._iterateChilds(function (data_obj) {
                            var state = data_obj._currState();
                            if ((state === Meta.State.Edit) || (state === Meta.State.Insert)) {
                                data_obj._currState(Meta.State.Browse);
                                //data_obj.resetModifFldLog(Meta.DATA_LOG_NAME);
                            };
                        });
                    };
                } catch (err) {
                    result = { result: "ERROR", message: err.message };
                };

                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            },

            _$local_save: function (options, cb) {
                var result = { result: "OK" };

                var self = this;
                var pending_childs = [];

                try {
                    if (!this._checkIfCanSave()) {
                        this._setPendingState();
                        this._iterateChilds(function (data_obj) {
                            var state = data_obj._currState();
                            if ((state === Meta.State.Edit) || (state === Meta.State.Insert)) {
                                pending_childs.push({ obj: data_obj, state: data_obj._currState() });
                                data_obj._currState(Meta.State.Pending);
                            }
                        });

                        var ignore_child_save = self._editSet().length === 0;
                        var obj_updated = [];
                        var is_self_changed = false;
                        var is_done = false;

                        function local_cb(result) {
                            if (!ignore_child_save) {
                                var isSuccess = false;
                                if (result.result === "OK") {
                                    if (result.detail && (result.detail.length === obj_updated.length)) {
                                        var nobj = 0;
                                        var cur_obj;
                                        for (var i = 0; i < obj_updated.length; i++) {
                                            if (result.detail[i].affectedRows === 1) {
                                                nobj++;
                                                cur_obj = obj_updated[i];
                                                // Запоминаем новое значение версии записи.
                                                if (cur_obj.rowVersionFname && result.detail[i].rowVersion)
                                                    cur_obj.set(cur_obj.rowVersionFname, result.detail[i].rowVersion, false, true);
                                            };
                                        };
                                        isSuccess = nobj === obj_updated.length;
                                    };
                                    if (isSuccess) {
                                        self._editSet("");
                                        self._setNewState(Meta.State.Browse);
                                        // 2 раза, потому что был вызов _setPendingState
                                        self._childLeaveEdit(2);
                                        if (is_self_changed)
                                            self.resetModifFldLog(Meta.DATA_LOG_NAME);

                                        for (var i = 0; i < pending_childs.length; i++) {
                                            pending_childs[i].obj._currState(Meta.State.Browse);
                                            pending_childs[i].obj.resetModifFldLog(Meta.DATA_LOG_NAME);
                                            //pending_childs[i].obj.removeModifFldLog(Meta.DATA_LOG_NAME);
                                        };
                                    }
                                    else
                                        result = { result: "ERROR", message: "Data object has been modified by another user." };
                                };
                                if (! isSuccess) {
                                    self._rollbackState();
                                    for (var i = 0; i < pending_childs.length; i++)
                                        pending_childs[i].obj._currState(pending_childs[i].state);

                                };
                            };

                            if (cb)
                                cb(result);
                        };

                        if ((!ignore_child_save) && (typeof ($data) !== "undefined") && $data) {
                            var batch = [];
                            var dataObj = this.getModifications(Meta.State.Edit);
                            if (dataObj) {
                                batch.push(dataObj);
                                obj_updated.push(this);
                                is_self_changed = true;
                            }
                            for (var i = 0; i < pending_childs.length; i++) {
                                var dataObj = pending_childs[i].obj.getModifications(pending_childs[i].state);
                                if (dataObj) {
                                    batch.push(dataObj);
                                    obj_updated.push(pending_childs[i].obj);
                                }
                            }
                            if (batch.length > 0) {
                                is_done = true;
                                $data.execBatch(batch, options, local_cb);
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
                                cb(result);
                            }, 0);
                } catch (err) {
                    if (cb)
                        setTimeout(function () {
                            cb({ result: "ERROR", message: err.message });
                        }, 0);
                };
            },

            _$local_edit: function (cb) {

                var result = { result: "OK" };
                try {
                    if (!this._checkIfCanEdit()) {
                        this._editSet("current");
                        this._setNewState(Meta.State.Edit);
                        this._childEnterEdit();
                        this._iterateChilds(function (data_obj) {
                            if (data_obj._currState() === Meta.State.Browse)
                                data_obj._currState(Meta.State.Edit);
                        });
                    };
                } catch (err) {
                    result = { result: "ERROR", message: err.message };
                };

                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            },

            _iterateChilds: function (proc) {
                if (typeof (proc) === "function") {
                    for (var i = 0; i < this.countCol() ; i++) {
                        var childCol = this.getCol(i);
                        for (var j = 0; j < childCol.count(); j++) {
                            var child = childCol.get(j);
                            proc(child);
                            child._iterateChilds(proc);
                        };
                    };
                };
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
                    throw new Error("DataObjectBase: Can't edit data-object in state \"" + Meta.stateToString(state) + "\".");
                };
                if ((!ignore_op) && (this._childEdCnt() > 0)) {
                    throw new Error("DataObjectBase: Can't edit data-object when some CHILD objects in edit state.");
                };

                return ignore_op;
            },

            _checkIfCanSave: function (is_cancel) {
                var tp_str = is_cancel ? "cancel" : "save";
                var state = this._currState();
                var set = this._editSet();
                if ((state !== Meta.State.Edit) && (state !== Meta.State.Insert)) {
                    throw new Error("DataObjectBase: Can't " + tp_str + " data-object in state \"" + Meta.stateToString(state) + "\".");
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

        });
        return DataObjectBase;
    }
);