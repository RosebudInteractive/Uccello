if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./dataRoot', './dataObjectBase', '../metaData/metaDefs'],
    function (DataRoot, DataObjectBase, Meta) {

        var DataObject = DataObjectBase.extend({

            className: "DataObject",
            classGuid: UCCELLO_CONFIG.classGuids.DataObject,
            metaCols: [{ "cname": "Childs", "ctype": "DataRoot" }],
            metaFields: [],

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this._childsCol = null;
                this._childs = {};
                if (params) {
                    this._childsCol = this.getCol("Childs");
                    if (this._childsCol)
                        this._childsCol.on({
                            type: 'beforeAdd',
                            subscriber: this,
                            callback: this._beforeAddChilds
                        }).on({
                            type: 'add',
                            subscriber: this,
                            callback: this._onAddChilds
                        }).on({
                            type: 'del',
                            subscriber: this,
                            callback: this._onDeleteChilds
                        });
                    if ((this.getParent() instanceof DataRoot) && this.getParent().parentField())
                        this._parentField = this.getParent().parentField();

                };
            },

            _beforeAddChilds: function (args) {
                var data_root = args.obj;
                var alias = data_root.get("Alias");
                if (this._childs[alias] !== undefined)
                    throw new Error("Duplicate child DataRoot: \"" + alias + "\".");
            },

            _onAddChilds: function (args) {
                var data_root = args.obj;
                var alias = data_root.get("Alias");
                this._childs[alias] = { dataRoot: data_root, dataObjects: data_root.getCol("DataElements") };
            },

            _onDeleteChilds: function (args) {
                delete this._childs[args.obj.get("Alias")];
            },

            isPersistable: function () {
                return true;
            },

            getRequestTree: function (alias) {
                var result = {};
                var parent = this.getParent();
                if (parent instanceof DataRoot)
                    result = parent.getRequestTree(alias);
                return result;
            },

            getChilds: function () {
                var result = {};
                var names = Object.keys(this._childs);
                for (var i = 0; i < names.length; i++) {
                    result[names[i]] = {
                        dataRoot: this._childs[names[i]].dataRoot,
                        dataObjects: this._childs[names[i]].dataObjects
                    };
                };
                return result;
            },

            getDataRoot: function (name) {
                var result = null;
                if (this._childs[name])
                    result = this._childs[name].dataRoot;
                return result;
            },

            getCollection: function (name) {
                var result = null;
                if (this._childs[name])
                    result = this._childs[name].dataObjects;
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

            _$local_convert: function (cb) {
                var self = this;
                this.modify(function () {
                    self._genericSetter("State", "Converted");
                }, {}, cb);
            },

            _$local_archive: function (cb) {
                var self = this;
                this.modify(function () {
                    self._genericSetter("State", "Archieved");
                }, {}, cb);
            }
        });
        return DataObject;
    }
);