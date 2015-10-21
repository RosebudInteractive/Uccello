if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../controls/controlMgr', '../metaData/metaDataMgr', '../metaData/metaModel',
        '../metaData/metaModelField', '../metaData/metaDefs', 'bluebird', 'lodash',
        './dataObjectQuery', '../predicate/predicate'],
    function (ControlMgr, MetaDataMgr, MetaModel, MetaModelField, Meta, Promise, _, Query, Predicate) {

        var METADATA_FILE_NAME = UCCELLO_CONFIG.dataPath + "meta/metaTables.json";

        var iDataObjectEngine = {

            className: "IDataObjectEngine",
            classGuid: UCCELLO_CONFIG.guids.iDataObjectEngine,

            execBatch: "function"
        }

        var DataObjectEngine = UccelloClass.extend({

            init: function (router, controller, construct_holder, rpc, options) {
                var opts = _.cloneDeep(options || {});

                this._router = router;
                this._controller = controller;
                this._constructHolder = construct_holder;
                this._options = opts;
                this._schemas = {};
                this.Meta = Meta;

                var self = this;
                this._createComponent = function (typeObj, parent, sobj) {
                    var newObj = null;
                    var constr = self._constructHolder.getComponent(typeObj.getGuid());
                    if (constr && constr.constr) {
                        var params = { ini: sobj, parent: parent.obj, colName: parent.colName };
                        newObj = new constr.constr(self._dataBase, params);
                    };
                    return newObj;
                };

                this._dataBase = new ControlMgr(
                    {
                        controller: this._controller,
                        dbparams: {
                            name: Meta.Db.Name,
                            kind: "master",
                            guid: Meta.Db.Guid
                        }
                    });

                this._provider = null;
                this._query = null;
                this._tmpPredicate = this.newPredicate();

                if (opts.connection && opts.connection.provider) {
                    try {
                        var provider = require("./providers/" + opts.connection.provider + "/provider");
                    } catch (err) {
                        throw new Error("Unknown provider: \"" + opts.connection.provider + "\".");
                    };
                    this._provider = new provider(this, opts.connection);
                    this._query = new Query(this, this._provider, this._options);
                };

                new MetaModelField(this._dataBase);
                new MetaModel(this._dataBase);
                new MetaDataMgr(this._dataBase);

                this._metaDataMgr = this._loadMetaDataMgr();
                this._metaDataMgr.router(this._router);
                if (rpc) {
                    var remote = rpc._publ(this._metaDataMgr, this._metaDataMgr.getInterface());
                    this._constructHolder.addTypeProvider(remote); // удаленный провайдер
                };
                this._constructHolder.addTypeProvider(this._metaDataMgr, true); // локальный провайдер
                if (this.hasConnection() && opts.importData && (opts.importData.autoimport === true)) {

                    this.importDir(opts.importData.dir, { force: true })
                    .then(function (result) {
                        console.log("### Import finished !!!");
                    })
                    .catch(function (err) {
                        throw err;
                    });
                };

                if (rpc && router) {
                    global.$data = rpc._publ(this, iDataObjectEngine); // Глобальная переменная для доступа к IDataObjectEngine
                    router.add('iDataObjectEngine', function (data, done) { done({ intf: iDataObjectEngine }); });
                };
            },

            getGuid: function () {
                return UCCELLO_CONFIG.guids.dataObjectEngineGuid;
            },

            hasConnection: function () {
                return this._provider && this._query;
            },

            getSchema: function () {
                return this._metaDataMgr;
            },

            createSchema: function (name) {
                var schema = null;
                if (typeof (name) === "string") {
                    schema = new MetaDataMgr(this._dataBase, {});
                    this._schemas[name] = schema;
                };
                return schema;
            },

            getProvider: function () {
                return this._provider;
            },

            deleteSchema: function (name) {
                // Здесь пока не хватает удаления из memDB
                delete this._schemas[name];
            },

            getDB: function () {
                return this._dataBase;
            },

            newPredicate: function () {
                return new Predicate(this._dataBase, {});;
            },

            execBatch: function (batch, callback) {
                console.log("execBatch: " + JSON.stringify(batch));

                var result = {};
                var res_promise = Promise.resolve({});
                var self = this;

                if (this.hasConnection() && (batch.length > 0)) {
                    res_promise = this._seqExec(batch, function (val) {

                        var promise = Promise.resolve();
                        var model = self._metaDataMgr.getModel(val.model);
                        if (!model)
                            throw new Error("execBatch::Model \"" + val.model + "\" doesn't exist.");

                        switch (val.op) {

                            case "insert":

                                promise = self._query.insert(model, val.data.fields);
                                break;

                            case "update":

                                if ((!val.data) || (!val.data.key))
                                    throw new Error("execBatch::Key for operation \"" + val.op + "\" doesn't exist.");

                                var key = model.getPrimaryKey();
                                if (!key)
                                    throw new Error("execBatch::Model \"" + val.model + "\" hasn't PRIMARY KEY.");
                                self._tmpPredicate.addConditionWithClear({ field: key.name(), op: "=", value: val.data.key });
                                promise = self._query.update(model, val.data.fields, self._tmpPredicate);
                                break;
                        };
                        return promise;
                    });
                };

                res_promise
                    .then(function (opResult) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "OK";
                                result.detail = opResult;
                                callback(result);
                            }, 0);
                    })
                    .catch(function (err) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "ERROR";
                                result.message = "Unknown error in \"execBatch\".";
                                if (err.message)
                                    result.message = err.message;
                                callback(result);
                            }, 0);
                    });

                return UCCELLO_CONFIG.REMOTE_RESULT;
            },

            syncSchema: function (options) {

                if (this.hasConnection()) {

                    var opts = options || {};
                    var self = this;

                    if (opts.force) {

                        //
                        // Полное пересоздание всех таблиц
                        //
                        var models = this._metaDataMgr.models();
                        var operations = [];
                        var create = [];

                        _.forEach(models, function (model) {
                            operations.push({ model: model, isDrop: true });
                            create.push({ model: model, isDrop: false });
                        });
                        Array.prototype.push.apply(operations, create);

                        return this._seqExec(operations, function (val) {
                            var promise = val.isDrop ? self._query.dropTable(val.model) : self._query.createTable(val.model);
                            return promise;
                        });
                    }
                    else
                        return Promise.resolve();
                }
                else
                    return Promise.reject(new Error("DB connection wasn't defined."));
            },

            loadQuery: function (query, options) {
                if (this.hasConnection()) {
                    if (!query.dataObject)
                        return Promise.reject(new Error("\"dataObject\" isn't defined in query."));
                    var model = null;
                    if (query.dataObject.name) {
                        model = this._metaDataMgr.getModel(query.dataObject.name);
                        if (!model)
                            return Promise.reject(new Error("Can't find model (name = \"" + query.dataObject.name + "\"."));
                    };
                    if (query.dataObject.guid) {
                        model = this._metaDataMgr.getModelByGuid(query.dataObject.guid);
                        if (!model)
                            return Promise.reject(new Error("Can't find model (guid = \"" + query.dataObject.guid + "\"."));
                    };
                    if (query.dataObject.rootName) {
                        model = this._metaDataMgr.getModelByRootName(query.dataObject.rootName);
                        if (!model)
                            return Promise.reject(new Error("Can't find model (rootName = \"" + query.dataObject.rootName + "\"."));
                    };
                    if (query.dataObject.rootGuid) {
                        model = this._metaDataMgr.getModelByRootGuid(query.dataObject.rootGuid);
                        if (!model)
                            return Promise.reject(new Error("Can't find model (rootGuid = \"" + query.dataObject.rootGuid + "\"."));
                    };
                    if (!model)
                        return Promise.reject(new Error("Can't find model " + JSON.stringify(query.dataObject) + "."));

                    var self = this;
                    return this._query.select(model, query.predicate)
                        .then(function (result) {
                            return self._formatLoadResult(query.dataGuid, model, result);
                        });
                }
                else
                    return Promise.reject(new Error("DB connection wasn't defined."));
            },

            importDir: function (dir, options) {

                if (this.hasConnection()) {

                    var opts = _.defaults(options || {}, { ext_filter: "json" });
                    var self = this;

                    var promise = Promise.resolve([]);
                    if (opts.force === true) {
                        promise = new Promise(function (resolve, reject) {
                            resolve(self._query.showForeignKeys().then(function (result) {
                                var curr_promise = Promise.resolve();
                                if (result.length > 0) {
                                    var models = self._metaDataMgr.models();
                                    var fk_list = _.filter(result, function (fk) {
                                        var tbl_name = fk.dst_table.toLowerCase();
                                        var tbls = _.filter(models, function (model) {
                                            return model.name().toLowerCase() === tbl_name;
                                        });
                                        return tbls.length > 0;
                                    });
                                    if (fk_list.length > 0) {
                                        curr_promise = self._seqExec(fk_list, function (fk) {
                                            return self._query.dropForeignKey(fk.src_table, fk.fk_name);
                                        });
                                    };
                                };
                                return curr_promise.then(function (result) {
                                    return self.syncSchema({ force: true });
                                });
                            }));
                        });
                    }

                    return promise.then(function (result) {

                        var result_import = result;

                        function createRefs(result) {
                            result_import = result_import.concat(result);
                            if (opts.force === true)
                                return self._createAllReferences().then(function (result_ref) {
                                    return result_import.concat(result_ref);
                                });
                            else
                                return result_import;
                        };

                        return new Promise(function (resolve, reject) {
                            var fs = require('fs');
                            var path = require('path');
                            var allFiles = fs.readdirSync(dir);
                            var allData = {};

                            if (allFiles.length > 0) {
                                var files = allFiles;
                                if (opts.ext_filter !== "*")
                                    files = _.filter(allFiles, function (file) {
                                        return _.endsWith(file, "." + opts.ext_filter);
                                    });

                                _.forEach(files, function (file) {
                                    var fname = path.format({ dir: dir, base: file });
                                    var data = JSON.parse(fs.readFileSync(fname, { encoding: "utf8" }));
                                    if (self._options.trace.importDir)
                                        console.log("Read file: " + file);

                                    if (data && data.collections && data.collections.DataElements
                                        && (data.collections.DataElements.length > 0)) {
                                        if (self._options.trace.importDir)
                                            console.log("Process file: " + file);
                                        _.forEach(data.collections.DataElements, function (dataObj) {
                                            if (dataObj.$sys && dataObj.fields && dataObj.fields.Id) {
                                                var modelGuid = dataObj.$sys.typeGuid;
                                                var model = self._metaDataMgr.getModelByGuid(modelGuid);
                                                if (model) {
                                                    var modelData = allData[modelGuid];
                                                    if (!modelData) {
                                                        modelData = { model: model, data: {} };
                                                        allData[modelGuid] = modelData;
                                                    };
                                                    modelData.data[dataObj.fields.Id] = dataObj.fields;
                                                };
                                            };
                                        });
                                    };

                                });

                                resolve(self._seqExec(allData, function (val, key) {
                                    if (self._options.trace.importDir)
                                        console.log("Import data: \"" + val.model.name() + "\".");
                                    var _model = val.model;
                                    var _data = val.data;
                                    return self._seqExec(_data, function (values, id) {
                                        return self._query.insert(_model, values);
                                    });
                                }).then(function (result) {
                                    return createRefs(result);
                                }));
                            }
                            else
                                return resolve(createRefs([]));
                        });
                    });
                }
                else
                    return Promise.reject(new Error("DB connection wasn't defined."));
            },

            _createAllReferences: function () {
                if (this.hasConnection()) {
                    var self = this;
                    return new Promise(function (resolve, reject) {
                        var links = self._metaDataMgr.outgoingLinks();
                        resolve(self._seqExec(links, function (model, key) {
                            return self._seqExec(model, function (ref, key) {
                                return self._query.createLink(ref);
                            });
                        }));
                    });
                }
                else
                    return Promise.reject(new Error("DB connection wasn't defined."));
            },

            _seqExec: function (seq, createPromise) {
                var result = [];
                var isArray = _.isArray(seq);
                var keys = [];
                if (!isArray)
                    keys = Object.keys(seq);

                return new Promise(function (resolve, reject) {

                    function next(idx) {

                        return function (res) {
                            if (res)
                                result.push(res);

                            var obj = null;
                            if (isArray && (idx < seq.length))
                                obj = seq[idx];
                            else
                                if ((!isArray) && (idx < keys.length))
                                    obj = seq[keys[idx]];

                            if (obj) {
                                var promise = createPromise(obj, isArray ? undefined : keys[idx]);
                                promise
                                    .then(next(++idx))
                                    .catch(function (err) {
                                        reject(err);
                                    });
                            }
                            else
                                resolve(result);
                        };
                    };
                    // Запускаем процесс последовательного выполнения
                    next(0)();
                });
            },

            _formatLoadResult: function (dataGuid, model, rawData) {
                var objTypeGuid = model.dataObjectGuid();
                var controller = this._controller;
                var data_guid = dataGuid ? dataGuid : controller.guid();

                var result = {
                    "$sys": {
                        "guid": data_guid,
                        "typeGuid": model.dataRootGuid()
                    },
                    "fields": {
                        "Id": 1000,
                        "Name": model.dataRootName()
                    },
                    "collections": {
                        "DataElements": [
                        ]
                    }
                };

                _.forEach(rawData, function (data) {
                    result.collections.DataElements.push({
                        "$sys": {
                            "guid": controller.guid(),
                            "typeGuid": objTypeGuid
                        },
                        "fields": data,
                        "collections": {}
                    });
                });

                return result;
            },

            _loadMetaDataMgr: function () {
                var fs = require('fs');
                var metaDataMgr = null;
                metaDataMgr = this._dataBase
                    .deserialize(JSON.parse(fs.readFileSync(METADATA_FILE_NAME, { encoding: "utf8" })),
                        {}, this._createComponent);
                return metaDataMgr;
            }
        });

        return DataObjectEngine;
    }
);