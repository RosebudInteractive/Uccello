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
                { fname: "ParentField", ftype: "string" }
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

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            newObject: function (flds, options, cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("newObject");
                result = this._methodCall.apply(this, args);

                return result;
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
                        if (self._currState() === Meta.State.Edit)
                            obj._currState(Meta.State.Insert);
                        localResult.newObject = obj.getGuid();
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
            }
        });
        return DataRoot;
    }
);