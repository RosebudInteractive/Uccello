if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../resman/dataTypes/resElem'],
    function (ResElem) {
        var BaseTreeModel = ResElem.extend({

            className: "BaseTreeModel",
            classGuid: UCCELLO_CONFIG.classGuids.BaseTreeModel,
            metaFields: [
                { fname: "Alias", ftype: "string" }
            ],

            metaCols: [
                { "cname": "Childs", "ctype": "BaseTreeModel" }
            ],

            alias: function (value) {
                return this._genericSetter("Alias", value);
            },

            edit: function (is_cached_upd, cb) {
                throw new Error("BaseTreeModel: \"edit\" wasn't implemented in descendant.");
            },

            save: function (is_cached_upd, options, cb) {
                throw new Error("BaseTreeModel: \"save\" wasn't implemented in descendant.");
            },

            cancel: function (is_cached_upd, cb) {
                throw new Error("BaseTreeModel: \"cancel\" wasn't implemented in descendant.");
            },

            addObject: function (flds, options, cb) {
                throw new Error("BaseTreeModel: \"addObject\" wasn't implemented in descendant.");
            },

            deleteObject: function (options, cb) {
                throw new Error("BaseTreeModel: \"deleteObject\" wasn't implemented in descendant.");
            },

            hasData: function () {
                throw new Error("BaseTreeModel: \"hasData\" wasn't implemented in descendant.");
            },

            getDataCollection: function () {
                throw new Error("BaseTreeModel: \"getDataCollection\" wasn't implemented in descendant.");
            },

            getState: function () {
                throw new Error("BaseTreeModel: \"getState\" wasn't implemented in descendant.");
            },

            isDataSourceModified: function (log) {
                throw new Error("BaseTreeModel: \"isDataSourceModified\" wasn't implemented in descendant.");
            },

            canMoveCursor: function (is_cached_updates) {
                throw new Error("BaseTreeModel: \"canMoveCursor\" wasn't implemented in descendant.");
            },

            getFirstCursorVal: function () {
                throw new Error("BaseTreeModel: \"getFirstCursorVal\" wasn't implemented in descendant.");
            },

            getLastCursorVal: function () {
                throw new Error("BaseTreeModel: \"getLastCursorVal\" wasn't implemented in descendant.");
            },

            getPrevCursorVal: function (curr_cursor) {
                throw new Error("BaseTreeModel: \"getPrevCursorVal\" wasn't implemented in descendant.");
            },

            getNextCursorVal: function (curr_cursor) {
                throw new Error("BaseTreeModel: \"getNextCursorVal\" wasn't implemented in descendant.");
            },

            getObjByCursor: function (cursor_value) {
                throw new Error("BaseTreeModel: \"getObjByCursor\" wasn't implemented in descendant.");
            },

            loadObject: function (singleObject, withSubTree, cb) {
                throw new Error("BaseTreeModel: \"loadObject\" wasn't implemented in descendant.");
            },

            loadData: function (isMasterOnly, singleObject, withSubTree, source) {
                throw new Error("BaseTreeModel: \"loadData\" wasn't implemented in descendant.");
            },

            init: function (cm, params) {
                this._childs = {};
                this._dataset = null;
                this._masterDataset = null;
                this._handlers = [];
                this._predicate = null;

                UccelloClass.super.apply(this, [cm, params]);

                if (params) {
                    this._childsCol = this.getCol("Childs");
                    this._childsCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddElem
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteElem
                    });
                };
            },

            getDataset: function () {
                return this._dataset;
            },

            getMasterDataset: function () {
                return this._masterDataset;
            },

            setDataset: function (dataset) {
                if (this._dataset)
                    this._dataset.master(null);
                this._dataset = dataset;
                if (this._masterDataset && this._dataset)
                    this._dataset.master(this._masterDataset);
            },

            setMasterDataset: function (master) {
                this._unSubscribeAll();
                this._masterDataset = master;
                if (this._dataset)
                    this._dataset.master(master);
                this._subscribeAll();
            },

            registerDataset: function (dataset) {
                this.setDataset(dataset);
                for (var i = 0; i < this._childsCol.count() ; i++) {
                    var cur_elem = this._childsCol.get(i);
                    cur_elem.setMasterDataset(dataset);
                };
            },

            unRegisterDataset: function () {
                this.registerDataset(null);
            },

            getParentTreeElem: function () {
                var result = this.getParent();
                if (result && (!(result instanceof BaseTreeModel)))
                    result = null;
                return result;
            },

            getRootTreeElem: function () {
                var result = this;
                var parent = this.getParent();
                while (parent && (parent instanceof BaseTreeModel)) {
                    result = parent;
                    parent = parent.getParent();
                }
                return result;
            },

            getRootDS: function () {
                return this.getRootTreeElem();
            },

            getDataSource: function (ds_name) {
                return this._childs[ds_name] ? this._childs[ds_name].treeElem : null;
            },

            makeRequest: function () {
            },

            _unSubscribeAll: function () {
                this._handlers.forEach(function (elem) {
                    elem.obj.off(elem.handler);
                });
                this._handlers.length = 0;
            },

            _subscribeAll: function () {
                var master = this._masterDataset;
                if (master) {
                    var h = {
                        type: 'moveCursor',
                        subscriber: this,
                        callback: this._onMasterMoveCursor
                    };
                    master.event.on(h);
                    this._handlers.push({ obj: master.event, handler: h });
                };
            },

            _onMasterMoveCursor: function () {
            },

            _onAddElem: function (args) {
                var treeElem = args.obj;
                var col = args.target;
                var alias = treeElem.alias();
                if (this._childs[alias] !== undefined) {
                    col._del(treeElem);
                    throw new Error("\"" + alias + "\" is already defined.");
                }
                var handler = {
                    type: 'mod%Alias',
                    subscriber: this,
                    callback: this._getOnAliasChangeProc(treeElem)
                };
                this._childs[alias] = {
                    treeElem: treeElem,
                    handler: handler
                };
                treeElem.event.on(handler);
            },

            _onDeleteElem: function (args) {
                var treeElem = args.obj;
                var obj = this._childs[treeElem.alias()];
                if (obj) {
                    delete this._childs[treeElem.alias()];
                    obj.treeElem.event.off(obj.handler);
                };
            },

            _getOnAliasChangeProc: function (treeElem) {
                var self = this;
                var oldAlias = treeElem.alias();

                return function (args) {
                    var alias = treeElem.alias();

                    if (alias !== oldAlias) {

                        if (self._childs[alias] !== undefined) {
                            treeElem.set("alias", oldAlias);
                            throw new Error("Can't change alias from \"" +
                                oldAlias + "\" to \"" + alias + "\". \"" + alias + "\" is already defined.");
                        };

                        var obj = self._childs[oldAlias];
                        delete self._childs[oldAlias];
                        self._childs[alias] = obj;

                        oldAlias = alias;
                    };
                };
            }
        });

        return BaseTreeModel;
    }
);