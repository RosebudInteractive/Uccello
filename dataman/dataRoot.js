if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../process/processObject'],
    function (ProcessObject) {
        var DataRoot = ProcessObject.extend({

            className: "DataRoot",
            classGuid: UCCELLO_CONFIG.classGuids.DataRoot,
            metaCols: [{ "cname": "DataElements", "ctype": "DataObject" }],
            metaFields: [{fname:"dbgName",ftype:"string"}],

            init: function(cm,params){
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
                var objGuid = this.getCol("DataElements").getColType().getGuid();
                var cm = this.getControlMgr();
                var constr = cm.getContext().getConstructorHolder().getComponent(objGuid).constr;
                var params = { parent: this, colName: "DataElements", ini: flds };
                var obj = new constr(cm, params);

                if (cb)
                    setTimeout(function () {
                        cb({ result: "OK", newObject: obj.getGuid() });
                    }, 0);

                return obj.getGuid();
            }
        });
        return DataRoot;
    }
);