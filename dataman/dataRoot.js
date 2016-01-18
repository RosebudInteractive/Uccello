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
                { fname: "dbgName", ftype: "string" },
                { fname: "Alias", ftype: "string" }
            ],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            newObject: function (flds, cb) {
                var result = null;

                var args = [];
                Array.prototype.push.apply(args, arguments);
                args.unshift("newObject");
                result = this._methodCall.apply(this, args);

                return result;
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
                        if (result.detail && (result.detail.length === 1)
                            && (result.detail[0].insertId !== undefined)) {
                            if (self._keyField)
                                _flds.fields[self._keyField] = result.detail[0].insertId;
                            if (self.rowVersionFname)
                                _flds.fields[self.rowVersionFname] = result.detail[0].rowVersion;
                        };
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