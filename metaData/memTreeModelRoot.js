if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./memBsTreeModelRoot', './metaDefs', '../memDB/memVirtualLog'],
    function (MemBsTreeModelRoot, Meta, MemVirtualLog) {
        var MemTreeModelRoot = MemBsTreeModelRoot.extend({

            className: "MemTreeModelRoot",
            classGuid: UCCELLO_CONFIG.classGuids.MemTreeModelRoot,
            metaFields: [],
            metaCols: [],

            loadObject: function (singleObject, withSubTree, cb) {
                if (this._is_root) {
                    this._requestObject();
                };
                if (this._dataset)
                    this._dataset.onDataChanged();
            },

            getAdapter: function () {
                return "$testData";
            },

            getExpression: function () {
                return { adapter: this.getAdapter() };
            },

            loadData: function (isMasterOnly, withSubTree, source) {

                if (this._isWaitingForData) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + this.name() + "\" receives \"loadData\" request while it's waiting for data.");
                    return;
                };

                var self = this;

                function local_cb(res) {
                    if (DEBUG)
                        console.warn("### WARNING: \"" + self.name() + "\" has received data.");

                    var dataRoot = (res && res.guids && (res.guids.length === 1)) ? self.getDB().getObj(res.guids[0]) : self.rootObj();
                    self.rootObj(dataRoot ? dataRoot : null);
                    if (dataRoot && self._dataset)
                        self._dataset.onDataChanged();
                    self._isWaitingForData = false;
                };

                if (this._is_root) {

                    var dataRoot = this.rootObj();
                    var dataRootGuid = this.getSerialized("RootObj") ? this.getSerialized("RootObj").guidInstanceRes : undefined;
                    var rgp = dataRoot ? dataRoot.getGuid() : (dataRootGuid ? dataRootGuid : this.getDB().getController().guid());

                    var needToQuery = true;
                    var params = { expr: this.getExpression(), rtype: "data" };

                    // ≈сли (dataRootGuid && isMasterOnly) === true, то это означает, что у нас есть ссылка на инстанс рута данных на сервере
                    //   и происходит начальна€ ициализаци€ данных - в этом случае необходимо просто запросить рут данных,
                    //   не дела€ запрос к Ѕƒ.
                    if ((!(dataRootGuid && isMasterOnly)) || this.isNeedToRefresh()) {
                        if (this.isNeedToRefresh())
                            this.setRefreshedFlag();
                        this._isWaitingForData = true;
                        this._requestData([rgp], params, local_cb);
                    }
                    else
                        if (this._dataset)
                            this._dataset.onDataChanged();
                }
                else {
                    this.getDataCollection();
                    if (this._dataset)
                        this._dataset.onDataChanged();
                };
            },

            _requestData: function (rootGuid, params, cb) {
                if (this.isMaster())
                    this.getControlMgr().getRoots(rootGuid, params, cb);
                else {
                    params.subDbGuid = this.getControlMgr().getGuid();
                    this.remoteCall('_requestData', [rootGuid, params], cb);
                }
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            _requestObject: function () {
                obj = this.getDB().getContext()
                    .getConstructorHolder()
                    .getComponent(UCCELLO_CONFIG.classGuids.MemCompanyTest).constr
                    .testData;

                var root = this.getDB().deserialize(obj, {},
                    this.getDB().getDefaultCompCallback());
                this.rootObj(root);
            },

        });

        return MemTreeModelRoot;
    }
);