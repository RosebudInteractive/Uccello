if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../resman/dataTypes/resource', './metaObjTreeElemRoot', './metaObjTreeElem', './metaModel', './metaModelField', './metaDefs'],
    function (Resource, MetaObjTreeElemRoot, MetaObjTreeElem, MetaModel, MetaModelField, Meta) {
        var MetaObjTree = Resource.extend({

            className: "MetaObjTree",
            classGuid: UCCELLO_CONFIG.classGuids.MetaObjTree,

            metaCols: [
                { "cname": "TreeRoot", "ctype": "MetaObjTreeElemRoot" }
            ],

            elemNamePrefix: "DataSource",

            name: function (value) {
                return this._genericSetter("ResName", value);
            },

            init: function (cm, params) {

                UccelloClass.super.apply(this, [cm, params]);

                if (params) {
                    this._rootCol = this.getCol("TreeRoot");
                    this._rootCol.on({
                        type: 'beforeAdd',
                        subscriber: this,
                        callback: this._onBeforeAddElem
                    }).on({
                        type: 'beforeDel',
                        subscriber: this,
                        callback: this._onBeforeDeleteElem
                    });

                    if (!this.getDB()._metaDataMgr)
                        new (this.getDB().getMetaDataMgrConstructor())(this.getDB(), {});
                };
            },

            getRootDS: function () {
                var result = null;
                if (this._rootCol.count() === 1)
                    result = this._rootCol.get(0);
                return result;
            },

            getDSConstructor: function () {
                return MetaObjTreeElem;
            },

            _createRootDS: function (model) {
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
                        throw new Error("MetaObjTree::_createRootDS: Model argument is empty!");

                return new MetaObjTreeElemRoot(this.getDB(), {
                    ini: { fields: { ResElemName: "RootDS", ModelRef: ModelRef } },
                    parent: this,
                    colName: "TreeRoot"
                });

            },

            _onBeforeAddElem: function (args) {
                var col = args.target;
                if (col.count() > 0)
                    throw new Error("Root DS already exists ! Can't add a new one.");
            },

            _onBeforeDeleteElem: function (args) {
                throw new Error("Can't delete Root DS object.");
            }
        });

        return MetaObjTree;
    }
);