if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../resman/dataTypes/resource', './dbTreeModelRoot', './dbTreeModel', './memTreeModelRoot', './memTreeModel', './metaModel'],
    function (Resource, DbTreeModelRoot, DbTreeModel, MemTreeModelRoot, MemTreeModel, MetaModel) {
        var DataModel = Resource.extend({

            className: "DataModel",
            classGuid: UCCELLO_CONFIG.classGuids.DataModel,

            metaCols: [
                { "cname": "TreeRoot", "ctype": "BaseTreeModel" }
            ],

            elemNamePrefix: "DataSource",

            name: function (value) {
                return this._genericSetter("ResName", value);
            },

            init: function (cm, params) {

                this._trees = {};
                UccelloClass.super.apply(this, [cm, params]);

                if (params) {
                    this._rootCol = this.getCol("TreeRoot");
                    this._rootCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddElem
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteElem
                    });

                    if (!this.getDB()._metaDataMgr)
                        new (this.getDB().getMetaDataMgrConstructor())(this.getDB(), {});
                };
            },

            getTreeRoot: function (alias) {
                return this._trees[alias] ? this._trees[alias].treeElem : null;
            },

            getDbDSConstructor: function () {
                return DbTreeModel;
            },

            getMemDSConstructor: function () {
                return MemTreeModel;
            },

            addDbTreeModel: function (alias, model) {
                if (typeof (alias) === "string") {

                    var ModelRef;

                    if (model instanceof MetaModel) {
                        ModelRef = {
                            guidInstanceRes: model.getGuid(),
                            guidInstanceElem: model.getGuid(),
                        };
                    }
                    else
                        if (model)
                            ModelRef = model;
                        else
                            throw new Error("DataModel::addDbTreeModel: Model argument is empty!");

                    var resElemName = alias;

                    return new DbTreeModelRoot(this.getDB(), {
                        ini: { fields: { ResElemName: resElemName, Alias: alias, ModelRef: ModelRef } },
                        parent: this,
                        colName: "TreeRoot"
                    });
                }
                else
                    throw new Error("Alias is of wrong type or undefined.");
            },

            addMemTreeModel: function (alias, class_guid) {
                if (typeof (alias) === "string") {

                    if (typeof (class_guid) !== "string")
                        throw new Error("DataModel::addMemTreeModel: Class Guid argument is empty!");

                    var resElemName = alias;

                    return new MemTreeModelRoot(this.getDB(), {
                        ini: { fields: { ResElemName: resElemName, Alias: alias, RootClassGuid: class_guid } },
                        parent: this,
                        colName: "TreeRoot"
                    });
                }
                else
                    throw new Error("Alias is of wrong type or undefined.");
            },

            _onAddElem: function (args) {
                var treeElem = args.obj;
                var col = args.target;
                var alias = treeElem.alias();
                if ((!alias) || (this._trees[alias] !== undefined)) {
                    col._del(treeElem);
                    var msg = "\"" + alias + "\" is already defined.";
                    if (!alias)
                        msg = "Alias can't be empty.";
                    throw new Error(msg);
                };
                var handler = {
                    type: 'mod%Alias',
                    subscriber: this,
                    callback: this._getOnAliasChangeProc(treeElem)
                };
                this._trees[alias] = {
                    treeElem: treeElem,
                    handler: handler
                };
                treeElem.event.on(handler);
            },

            _onDeleteElem: function (args) {
                var treeElem = args.obj;
                var obj = this._trees[treeElem.alias()];
                if (obj) {
                    delete this._trees[treeElem.alias()];
                    obj.treeElem.event.off(obj.handler);
                };
            },

            _getOnAliasChangeProc: function (treeElem) {
                var self = this;
                var oldAlias = treeElem.alias();

                return function (args) {
                    var alias = treeElem.alias();

                    if (alias !== oldAlias) {

                        if (self._trees[alias] !== undefined) {
                            treeElem.set("alias", oldAlias);
                            throw new Error("Can't change alias from \"" +
                                oldAlias + "\" to \"" + alias + "\". \"" + alias + "\" is already defined.");
                        };

                        var obj = self._trees[oldAlias];
                        delete self._trees[oldAlias];
                        self._trees[alias] = obj;

                        oldAlias = alias;
                    };
                };
            }

        });

        return DataModel;
    }
);