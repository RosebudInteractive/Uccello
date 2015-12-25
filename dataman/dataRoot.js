if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../process/processObject', '../metaData/metaDefs'],
    function (ProcessObject, Meta) {
        var DataRoot = ProcessObject.extend({

            className: "DataRoot",
            classGuid: UCCELLO_CONFIG.classGuids.DataRoot,
            metaCols: [{ "cname": "DataElements", "ctype": "DataObject" }],
            metaFields: [
                { fname: "dbgName", ftype: "string" },
                { fname: "_EditSet", ftype: "string" },
                { fname: "_ChildEdCnt", ftype: "int" },
                { fname: "_CurrState", ftype: "int" },
                { fname: "_PrevState", ftype: "int" }
            ],

            init: function (cm, params) {
                this._keyField = null;
                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this._editSet("");
                    this._childEdCnt(0);
                    this._currState(Meta.State.Browse);
                    this._prevState(Meta.State.Browse);
                };
            },

            newObject: function (flds, cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("newObject");
                result = this._methodCall.apply(this, args);

                return result;
            },

            edit: function (cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataRoot::edit Invalid callback type \"" + typeof (callback) + "\".");

                var args = [];
                var local_name = "_$local_edit";
                if (!this.isMaster()) {
                    for (var i = 0; i < (arguments.length - 1) ; i++)
                        args[i - 1] = arguments[i];
                    this.remoteCall(local_name, args, callback);
                }
                else
                    this[local_name].apply(this, arguments);
            },

            save: function (cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataRoot::save Invalid callback type \"" + typeof (callback) + "\".");

                var args = [];
                var local_name = "_$local_save";
                if (!this.isMaster()) {
                    for (var i = 0; i < (arguments.length - 1) ; i++)
                        args[i - 1] = arguments[i];
                    this.remoteCall(local_name, args, callback);
                }
                else
                    this[local_name].apply(this, arguments);
            },

            cancel: function (cb) {
                var callback = arguments.length > 0 ? arguments[arguments.length - 1] : null;
                if (typeof (callback) !== "function")
                    throw new Error("DataRoot::cancel Invalid callback type \"" + typeof (callback) + "\".");

                var args = [];
                var local_name = "_$local_cancel";
                if (!this.isMaster()) {
                    for (var i = 0; i < (arguments.length - 1) ; i++)
                        args[i - 1] = arguments[i];
                    this.remoteCall(local_name, args, callback);
                }
                else
                    this[local_name].apply(this, arguments);
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
                                data_obj.resetModifFldLog(Meta.DATA_LOG_NAME);
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

            _$local_save: function (cb) {
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
                        var is_done = false;

                        function local_cb(result) {
                            if (!ignore_child_save)
                                if (result.result === "OK") {
                                    self._editSet("");
                                    self._setNewState(Meta.State.Browse);
                                    // 2 раза, потому что был вызов _setPendingState
                                    self._childLeaveEdit(2);
                                    for (var i = 0; i < pending_childs.length; i++) {
                                        pending_childs[i].obj._currState(Meta.State.Browse);
                                        pending_childs[i].obj.resetModifFldLog(Meta.DATA_LOG_NAME);
                                        //pending_childs[i].obj.removeModifFldLog(Meta.DATA_LOG_NAME);
                                    };
                                }
                                else {
                                    self._rollbackState();
                                    for (var i = 0; i < pending_childs.length; i++)
                                        pending_childs[i].obj._currState(pending_childs[i].state);

                                }

                            if (cb)
                                cb(result);
                        };

                        if ((!ignore_child_save) && $data) {
                            var batch = [];
                            for (var i = 0; i < pending_childs.length; i++) {
                                var dataObj = pending_childs[i].obj.getModifications();
                                if (dataObj)
                                    batch.push(dataObj);
                            }
                            if (batch.length > 0) {
                                is_done = true;
                                $data.execBatch(batch, local_cb);
                            };
                        };

                        if (!is_done)
                            setTimeout(function () {
                                local_cb(result);
                            }, 0);
                    }
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
                var childCol = this.getCol("DataElements");
                if (typeof (proc) === "function")
                    for (var i = 0; i < childCol.count() ; i++)
                        proc(childCol.get(i));
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
                    throw new Error("DataRoot: Can't edit data-object in state \"" + Meta.stateToString(state) + "\".");
                };
                if ((!ignore_op) && (this._childEdCnt() > 0)) {
                    throw new Error("DataRoot: Can't edit data-object when some CHILD objects in edit state.");
                };

                return ignore_op;
            },

            _checkIfCanSave: function (is_cancel) {
                var tp_str = is_cancel ? "cancel" : "save";
                var state = this._currState();
                var set = this._editSet();
                if ((state !== Meta.State.Edit) && (state !== Meta.State.Insert)) {
                    throw new Error("DataRoot: Can't " + tp_str + " data-object in state \"" + Meta.stateToString(state) + "\".");
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

            _$local_newObject: function (flds, cb) {

                var db = this.getDB();
                var objType = this.getCol("DataElements").getColType();

                var _flds = flds || {};
                _flds.$sys = _flds.$sys || {};
                _flds.fields = _flds.fields || {};

                var self = this;

                function afterObjCreate(result) {
                    var localResult = result;
                    if (localResult.result === "OK") {
                        var objGuid = objType.getGuid();
                        var cm = self.getControlMgr();
                        var constr = cm.getContext().getConstructorHolder().getComponent(objGuid).constr;
                        if (self._keyField && result.detail && (result.detail.length === 1)
                            && (result.detail[0].insertId !== undefined))
                            _flds.fields[self._keyField] = result.detail[0].insertId;
                        var params = { parent: self, colName: "DataElements", ini: _flds };
                        var obj = new constr(cm, params);
                        localResult.newObject = obj.getGuid();
                    };
                    if (cb)
                        setTimeout(function () {
                            cb(localResult);
                        }, 0);
                };

                if ($data) {
                    // Присваивание GUID (не очень красиво)
                    if (!_flds.$sys.guid)
                        _flds.$sys.guid = this.getDB().getController().guid();
                    _flds.fields.Guid = _flds.$sys.guid;

                    var dataObj = {
                        op: "insert",
                        model: objType.get("typeName"),
                        data: { fields: _flds.fields }
                    };
                    var batch = [];
                    batch.push(dataObj);
                    $data.execBatch(batch, afterObjCreate);
                }
                else {
                    setTimeout(function () {
                        afterObjCreate({ result: "OK" });
                    }, 0);
                };
            }
        });
        return DataRoot;
    }
);