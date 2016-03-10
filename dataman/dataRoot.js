if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./dataObjectBase', '../metaData/metaDefs'],
    function (DataObjectBase, Meta) {
        var DataRoot = DataObjectBase.extend({

            className: "DataRoot",
            classGuid: UCCELLO_CONFIG.classGuids.DataRoot,
            metaCols: [{ "cname": "DataElements", "ctype": "DataObject" }],
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "Alias", ftype: "string" },
                { fname: "ParentField", ftype: "string" },
                { fname: "RequestTree", ftype: "string" }
            ],

            name: function (value) {
                return this._genericSetter("Name", value);
            },

            alias: function (value) {
                return this._genericSetter("Alias", value);
            },

            parentField: function (value) {
                return this._genericSetter("ParentField", value);
            },

            requestTree: function (value) {
                return this._genericSetter("RequestTree", value);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this._requestTreeObj = null;
            },

            getRequestTree: function (alias) {
                var result = {};
                if (!this._requestTreeObj) {
                    var parent = this.getParent();
                    if (!parent) {
                        try{
                            this._requestTreeObj = JSON.parse(this.requestTree());
                        }
                        catch (err) {
                            this._requestTreeObj = {};
                        };
                    }
                    else
                        if (parent.isInstanceOf(UCCELLO_CONFIG.classGuids.DataObject))
                            this._requestTreeObj = parent.getRequestTree(this.alias());
                };
                if (this._requestTreeObj) {
                    if (alias) {
                        if (this._requestTreeObj[alias] && this._requestTreeObj[alias].c)
                            result = this._requestTreeObj[alias].c;
                    }
                    else
                        result = this._requestTreeObj;
                }
                return result;
            },

            newObject: function (flds, options, cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("newObject");
                result = this._methodCall.apply(this, args);

                return result;
            },

            deleteObject: function (obj_guid, options, cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("deleteObject");
                result = this._methodCall.apply(this, args);

                return result;
            },

            _create_child_collections: function (parent_obj, constrHolder) {
                var childs = this.getRequestTree();
                var keys = Object.keys(childs);
                for (var i = 0; i < keys.length; i++) {
                    var collection = childs[keys[i]];

                    var constr = constrHolder.getComponent(collection.t).constr;
                    if (typeof (constr) !== "function")
                        throw new Error("DataRoot::_create_child_collections: Undefined object constructor: \"" + objGuid + "\" !");

                    var params = {
                        parent: parent_obj, colName: "Childs", ini: {
                            $sys: { guid: this.getDB().getController().guid() },
                            fields: {
                                Alias: keys[i],
                                ParentField: collection.f
                            }
                        }
                    };

                    var new_root = new constr(this.getControlMgr(), params);
                    new_root._currState(Meta.State.Edit);

                };
            },

            _$local_newObject: function (flds, options, cb) {

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
                        var constrHolder = cm.getConstructHolder() ? cm.getConstructHolder() :
                            (cm.getContext() ? cm.getContext().getConstructorHolder() : null);
                        if (!constrHolder)
                            throw new Error("DataRoot::_$local_newObject: Undefined ConstructHolder !");
                        var constr = constrHolder.getComponent(objGuid).constr;
                        if (typeof (constr) !== "function")
                            throw new Error("DataRoot::_$local_newObject: Undefined object constructor: \"" + objGuid + "\" !");
                        if (result.detail && (result.detail.length === 1)
                            && (result.detail[0].insertId !== undefined)) {
                            if (self._keyField)
                                _flds.fields[self._keyField] = result.detail[0].insertId;
                            if (self.rowVersionFname && (result.detail[0].rowVersion !== undefined))
                                _flds.fields[self.rowVersionFname] = result.detail[0].rowVersion;
                        };
                        var params = { parent: self, colName: "DataElements", ini: _flds };

                        var obj = new constr(cm, params);
                        self._create_child_collections(obj, constrHolder);
                        if (self._currState() === Meta.State.Edit)
                            obj._currState(Meta.State.Insert);
                        localResult.newObject = obj.getGuid();
                        localResult.keyValue = obj.get(self._keyField);
                    };
                    if (cb)
                        setTimeout(function () {
                            cb(localResult);
                        }, 0);
                };

                if ((typeof ($data) !== "undefined") && $data) {
                    // Присваивание GUID (не очень красиво)
                    if (!_flds.$sys.guid)
                        _flds.$sys.guid = this.getDB().getController().guid();
                    _flds.fields.Guid = _flds.$sys.guid;

                    var pfname = this.parentField();
                    if (pfname) {
                        var parentDataObj = this.getParent();
                        if (parentDataObj && parentDataObj.isInstanceOf(UCCELLO_CONFIG.classGuids.DataObject)) {
                            var val = parentDataObj.getSerialized(parentDataObj._keyField);
                            if (val)
                                _flds.fields[pfname] = val;
                        }
                    };

                    if (this._currState() === Meta.State.Edit) {
                        $data.getNextRowId(objType.get("typeName"), options, afterObjCreate);
                    }
                    else {
                        var dataObj = {
                            op: "insert",
                            model: objType.get("typeName"),
                            data: { fields: _flds.fields }
                        };
                        var batch = [];
                        batch.push(dataObj);
                        $data.execBatch(batch, options, afterObjCreate);
                    };
                }
                else {
                    setTimeout(function () {
                        afterObjCreate({ result: "OK" });
                    }, 0);
                };
            },

            _$local_deleteObject: function (obj_guid, options, cb) {

                var db = this.getDB();
                var obj = db.getObj(obj_guid);
                var self = this;

                function afterObjDelete(result) {
                    var localResult = result;
                    if (localResult.result === "OK") {

                        var isSuccess = true;
                        if (result.detail) {
                            isSuccess = (result.detail.length === 1) && (result.detail[0].affectedRows === 1);
                            if(!isSuccess)
                                localResult = {
                                    result: "ERROR",
                                    message: "Deleted object already has been deleted or modified!"
                                };
                        }

                        if (isSuccess) {
                            var col = self.getCol("DataElements");
                            var idx = col._del(obj);
                            if (typeof (idx) === "number") {
                                var newIdx = col.count() > idx ? idx : (col.count() - 1);
                                if (newIdx >= 0) {
                                    var newObj = col.get(newIdx);
                                    if (newObj._keyField) {
                                        localResult.newObject = newObj.getGuid();
                                        localResult.keyValue = newObj.get(newObj._keyField);
                                    }
                                }
                            }
                        };
                    };

                    if (cb)
                        setTimeout(function () {
                            cb(localResult);
                        }, 0);
                };

                var f_cb_now = true;
                var result = { result: "OK" };
                if (obj && (obj.getParent() === this)) {
                    if ((typeof ($data) !== "undefined") && $data) {
                        if (this._currState() === Meta.State.Browse) {
                            if (obj.isPersistable() && obj._keyField) {
                                f_cb_now = false;
                                var data = {};
                                var opData = { op: "delete", model: obj.className, data: data };
                                data.key = obj.getSerialized(obj._keyField);
                                data.rowVersion = obj.rowVersionFname ? obj.getSerialized(obj.rowVersionFname) : null;
                                var batch = [];
                                batch.push(opData);
                                $data.execBatch(batch, options, afterObjDelete);
                            };
                        }
                    }
                }
                else
                    result = {
                        result: "ERROR",
                        message: "Deleted object doesn't belong to current data root or doesn' exist."
                    };

                if (f_cb_now) {
                    setTimeout(function () {
                        afterObjDelete(result);
                    }, 0);
                };
            }
        });
        return DataRoot;
    }
);