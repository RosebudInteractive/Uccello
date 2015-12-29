if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/treeView'],
    function(TreeView) {
        var DbTreeView = TreeView.extend({

            className: "DbTreeView",
            classGuid: UCCELLO_CONFIG.classGuids.DbTreeView,
            metaFields: [
                // [OneWay | null] - при перемещении по дереву устанавливается курсор в датасете,
                // [TwoWays] - при перемещении по датасету у дерева устанавливается курсор тоже
                {fname:"CursorSyncMode", ftype:"string"}
            ],
            metaCols: [{"cname": "Datasets", "ctype": "DbTreeViewItemType"}],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
                if (params===undefined) return;
                this.getCol("Datasets").on({
                    type: "add",
                    subscriber: this,
                    callback: this._onDirtyRender
                });
            },

            cursorSyncMode: function(value) {
                return this._genericSetter("CursorSyncMode", value);
            },

            size: function(value) {
                return this._genericSetter("Size", value);
            },

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {
                viewset.render.apply(this, [options]);
            },

            _subscribeOnDatasets: function(on) {
                var dsItems = this.getCol('Datasets');
                for (var i = 0; i < dsItems.count(); i++) {
                    var ds = dsItems.get(i).dataset();
                    var handler = {
                        type: 'moveCursor',
                        subscriber: this,
                        callback: this._moveDatasetHandler
                    };
                    if (on)
                        ds.event.on(handler);
                    else
                        ds.event.off(handler);
                }
            },

            _moveDatasetHandler: function(data) {
                var neededItem = null;
                var itemsCol = this.getCol("Items");
                for (var i = 0, len = itemsCol.count(); i < len; i++) {
                    var item = itemsCol.get(i);
                    if (data.target.getCurrentDataObject() &&
                        data.target.getCurrentDataObject().getGuid() == item.objectGuid()) {
                        neededItem = item;
                        break;
                    }
                }

                if (neededItem)
                    this.cursor(neededItem);
            },

            ensureIsOpen: function(item) {

                if (typeof item == "string") {
                    var itemsCol = this.getCol("Items");
                    var idx = itemsCol.indexOfGuid(item);
                    item = itemsCol.get(idx);
                }

                var parentItem = item.parent();
                while (parentItem) {
                    parentItem.isOpen(true);
                }
            },
            _isNodeDataLoaded: function(treeViewItem) {
                var items = this.getCol("Items");
                for (var i = 0; i < items.count(); i++) {
                    var item = items.get(i);
                    if (item.parent() == treeViewItem)
                        return true;
                }

                return false;
            },

            getDatasets: function(treeViewItem) {

                var parent = (!treeViewItem ? null : treeViewItem.dataset());
                var parentItem = treeViewItem;
                var items = this.getCol('Datasets'), children = [];
                var itemsCol = this.getCol("Items");
                for (var i = 0, len = items.count(); i < len; i++){
                    var item = items.get(i), ds = item.dataset();
                    if (parent == item.parent()) {
                        var idx = undefined;
                        var newTreeViewItem;
                        for (var j = 0; j < itemsCol.count(); j++) {
                            var curItem = itemsCol.get(j);
                            if (parentItem == curItem.parent() && curItem.dataset() == ds) {
                                newTreeViewItem = itemsCol.get(j);
                                idx = itemsCol.indexOf(newTreeViewItem);
                                break;
                            }
                        }
                        if (idx === undefined) {
                            newTreeViewItem = this._addItem(this, (treeViewItem ? treeViewItem.getGuid() : null));
                            newTreeViewItem.name(ds.name());
                            newTreeViewItem.parent(parentItem);
                            newTreeViewItem.dataset(ds);
                            newTreeViewItem.kind("coll")
                        } else
                            newTreeViewItem = itemsCol.get(idx);
                        var newNode = {
                            text: ds.name(),
                            id: newTreeViewItem.getGuid(),
                            children: true,
                            data: {
                                type: 'dataset',
                                ds: ds,
                                treeItem: newTreeViewItem,
                                parentNodeId: (parentItem ? parentItem.getGuid() : null)}
                        };
                        children.push(newNode);
                    }
                }
                return children;
            },

            getItems: function(treeViewItem) {

                var that = this;
                var dataset = treeViewItem.dataset();
                var parentItem = treeViewItem;
                var itemsTree=[],
                    names = {'DatasetContact':'firstname',
                        'DatasetContract':'number',
                        'DatasetCompany':'name',
                        'DatasetAddress':'country'};
                var col = dataset.root().getCol('DataElements'),
                    isChildren = this.isChildren(dataset);
                var itemsCol = this.getCol("Items");
                if (this._isNodeDataLoaded(treeViewItem)) {
                    for (var i = 0, len2 = itemsCol.count(); i < len2; i++) {
                        var newTreeViewItem = itemsCol.get(i);
                        if (newTreeViewItem.parent() == parentItem) {
                            var newNode = {
                                text : newTreeViewItem.name(),
                                id : newTreeViewItem.getGuid(),
                                children : isChildren,
                                data:{
                                    type: 'item',
                                    ds:dataset,
                                    objId: newTreeViewItem.objectId(),
                                    treeItem: newTreeViewItem,
                                    parentNodeId: parentItem.getGuid()
                                },
                                guid: newTreeViewItem.objectGuid()
                            };
                            itemsTree.push(newNode);
                        }
                    }
                } else {
                    for (var i = 0, len2 = col.count(); i < len2; i++) {
                        var obj = col.get(i);
                        var idx = itemsCol.indexOfGuid(obj.getGuid());
                        var newTreeViewItem;
                        if (idx === undefined) {
                            newTreeViewItem = this._addItem(parentItem.getGuid());
                            newTreeViewItem.name(obj[names[dataset.name()]]());
                            newTreeViewItem.parent(parentItem);
                            newTreeViewItem.objectId(obj.id());
                            newTreeViewItem.objectGuid(obj.getGuid());
                            newTreeViewItem.dataset(dataset);
                        } else
                            newTreeViewItem = itemsCol.get(idx);
                        var newNode = {
                            text : obj[names[dataset.name()]](),
                            id : newTreeViewItem.getGuid(),
                            children : isChildren,
                            data:{type: 'item', ds:dataset, objId:obj.id(), treeItem: newTreeViewItem, parentNodeId: parentItem.getGuid()},
                            guid: obj.getGuid()
                        };
                        itemsTree.push(newNode);
                    }
                }

                return itemsTree;
            },

            _setDatasetCursor: function(treeViewItem, cb) {
                var item = $('#' + this.getLid()),
                    that=this,
                    tree = item.find('.tree'),
                    ds = treeViewItem.dataset();


                if (treeViewItem.objectId() && treeViewItem.objectId() == treeViewItem.dataset().cursor()) {
                    if (cb) cb();
                    return;
                }
                var pars = [];
                //if (node.parents.length > 0) {
                var parentNode = treeViewItem.parent();
                while (parentNode) {
                //for (var i = node.parents.length - 1; i >= 0; i--) {

                    if ( parentNode.objectId() && parentNode.dataset().cursor() !=  parentNode.objectId()) {
                        pars.push({
                            ds: parentNode.dataset(),
                            id: parentNode.objectId()
                        });
                    }
                    parentNode = parentNode.parent();
                }
                //}
                pars.push({
                    ds: treeViewItem.dataset(),
                    id: treeViewItem.objectId() ? treeViewItem.objectId() : null
                });

                function bind(func, context, data) {
                    return function () {
                        return func.call(context, data);
                    };
                }

                if (pars.length > 1) {
                    for (var i = 1; i < pars.length; i++) {
                        var p = pars[i];
                        var callback = bind(function(data){
                            var dt = data;
                            if (dt.id)
                                dt.ds.cursor(dt.id);
                            else
                                dt.ds.first();
                            dt.ds.event.off(dt.handler);
                            if (treeViewItem.dataset() == dt.ds && cb) cb();
                        }, this, p);

                        var handler = {
                            type: 'refreshData',
                            subscriber: this,
                            callback: callback
                        };
                        p.handler = handler;
                        p.ds.event.on(handler);
                    }
                }

                //node.data.ds.cursor(node.data.obj.id());
                if (pars[0].id)
                    pars[0].ds.cursor(pars[0].id);
                else
                    pars[0].ds.first();
                if (pars[0].ds == treeViewItem.dataset() && cb) cb();
            },


            _addItem: function(parentId) {

                var parent = null;
                if (parentId) {
                    var items = this.getCol('Items'), itemsTree=[];
                    for (var i = 0, len = items.count(); i < len; i++) {
                        var item = items.get(i);
                        if (item.id() == parentId)
                            parent = item;
                    }
                }

                // добавляем в коллекцию
                var cm = this.getControlMgr(), vc = cm.getContext();
                var newItem = new (vc.getConstructorHolder().getComponent(UCCELLO_CONFIG.classGuids.TreeViewItem).constr)(cm, {parent: this, colName: "Items", ini:{fields:{Parent:parent, Kind:"item"}} });

                return newItem;
            },



            isChildren: function(ds) {
                var items = this.getCol('Datasets');
                for (var i = 0, len = items.count(); i < len; i++)
                    if (ds == items.get(i).parent())
                        return true;
                return false;
            },

            getData: function(treeViewItem, cb) {
                var that = this;
                if (treeViewItem == null) {
                    cb(this.getDatasets(treeViewItem));
                } else {
                    if (!treeViewItem.objectId()) {
                        if (this._isNodeDataLoaded(treeViewItem))
                            cb(this.getItems(treeViewItem));
                        else
                            this._setDatasetCursor(treeViewItem, function() {
                                cb(that.getItems(treeViewItem));
                            });
                    } else
                        cb(this.getDatasets(treeViewItem));
                }
            }


    });
        return DbTreeView;
    }
);