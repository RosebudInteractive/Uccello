﻿if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../controls/controlMgr', '../metaData/metaDataMgr', '../metaData/metaModel',
        '../metaData/metaModelField', '../metaData/metaDefs', '../metaData/metaModelRef', '../metaData/metaLinkRef',
        'bluebird', 'lodash', './dataObjectQuery', '../predicate/predicate', './transaction'],
    function (ControlMgr, MetaDataMgr, MetaModel, MetaModelField, Meta, MetaModelRef, MetaLinkRef,
        Promise, _, Query, Predicate, Transaction) {

        var METADATA_FILE_NAME = UCCELLO_CONFIG.dataPath + "meta/metaTables.json";
        var METADATA_DIR_NAME = UCCELLO_CONFIG.dataPath + "meta";
        var META_DATA_MGR_GUID = "77153254-7f08-6810-017b-c99f7ea8cddf@2009";

        var iDataObjectEngine = {

            className: "IDataObjectEngine",
            classGuid: UCCELLO_CONFIG.guids.iDataObjectEngine,

            execBatch: "function"
        };

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
                this._dataBase = new ControlMgr(
                    {
                        controller: this._controller,
                        dbparams: {
                            name: Meta.Db.Name,
                            kind: "master",
                            guid: Meta.Db.Guid,
                            constructHolder: construct_holder
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

                new MetaModelRef(this._dataBase);
                new MetaLinkRef(this._dataBase);
                new MetaModelField(this._dataBase);
                new MetaModel(this._dataBase);
                new MetaDataMgr(this._dataBase);

                //this._metaDataMgr = this._loadMetaDataMgr();
                this._metaDataMgr = this._dataBase.deserialize(
                    {
                        "$sys": {
                            "guid": META_DATA_MGR_GUID,
                            "typeGuid": UCCELLO_CONFIG.classGuids.MetaDataMgr
                        }
                    },
                    {},
                    this._dataBase.getDefaultCompCallback());
                //this._metaDataMgr = new MetaDataMgr(this._dataBase, {});
                this._loadMetaInfo(METADATA_DIR_NAME);

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

            getSchema: function (schema_name) {
                return schema_name ? this._schemas[schema_name] : this._metaDataMgr;
            },

            createSchema: function (name) {
                var schema = null;
                if (typeof (name) === "string") {
                    var db = new ControlMgr(
                    {
                        controller: this._controller,
                        dbparams: {
                            name: name,
                            kind: "master",
                            guid: this._controller.guid()
                        }
                    });
                    new MetaModelRef(db);
                    new MetaLinkRef(db);
                    new MetaModelField(db);
                    new MetaModel(db);
                    schema = new MetaDataMgr(db, {});
                    this._schemas[name] = schema;
                };
                return schema;
            },

            getProvider: function () {
                return this._provider;
            },

            getQuery: function () {
                return this._query;
            },

            deleteSchema: function (name) {
                // Здесь пока не хватает удаления из memDB
                delete this._schemas[name];
            },

            getDB: function () {
                return this._dataBase;
            },

            newPredicate: function () {
                return new Predicate(this._dataBase, {});
            },

            deserializePredicate: function (serialized_obj, predicate) {
                var result = predicate ? predicate : new Predicate(this._dataBase, {});
                var so = _.cloneDeep(serialized_obj);
                so.$sys.guid = result.getGuid();
                result = this._dataBase.deserialize(so, {}, this._dataBase.getDefaultCompCallback());
                return result;
            },

            saveSchemaToFile: function (dir, schema_name) {
                var fs = require('fs');
                var path = require('path');
                var models = this.getSchema(schema_name) ? this.getSchema(schema_name).models() : null;
                if (!models)
                    throw new Error("Schema \"" + schema_name + "\" doesn't exist.");

                _.forEach(models, function (model) {
                    fs.writeFileSync(path.format({ dir: dir, base: model.name() + ".json" }),
                        JSON.stringify(model.getDB().serialize(model)),
                        { encoding: "utf8" })
                }, this);
            },

            transaction: function (batch, options) {
                var tran = new Transaction(this, options);
                var result;
                if (batch) {
                    result = tran.start()
                        .then(function () {
                            return batch(tran);
                        })
                        .then(function (res) {
                            return tran.commit()
                                .then(function () {
                                    return res;
                                });
                        }, function (err) {
                            return tran.rollback()
                                .then(function () {
                                    return Promise.reject(err);
                                });
                        });
                }
                else
                    result = tran.start().then(function () { return tran; });
                return result;
            },

            execSql: function (sql, options, callback) {
                var res_promise;
                if (this.hasConnection()) {
                    res_promise = this._query.execSql(sql, options);
                }
                else
                    res_promise = Promise.reject(new Error("DB connection wasn't defined."));

                var result = {};
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
                                result.message = "Unknown error in \"execSql\".";
                                if (err.message)
                                    result.message = err.message;
                                callback(result);
                            }, 0);
                    });

                return UCCELLO_CONFIG.REMOTE_RESULT;
            },

            execBatch: function (batch, callback) {
                console.log("execBatch: " + JSON.stringify(batch));

                var result = {};
                var res_promise = Promise.resolve({});
                var self = this;

                if (this.hasConnection() && (batch.length > 0)) {

                    function batchFunc(transaction) {
                        return self._seqExec(batch, function (val) {

                            var promise = Promise.resolve();
                            var model = self._metaDataMgr.getModel(val.model);
                            if (!model)
                                throw new Error("execBatch::Model \"" + val.model + "\" doesn't exist.");

                            switch (val.op) {

                                case "insert":

                                    promise = self._query.insert(model, val.data.fields, { transaction: transaction });
                                    break;

                                case "update":

                                    if ((!val.data) || (!val.data.key))
                                        throw new Error("execBatch::Key for operation \"" + val.op + "\" doesn't exist.");

                                    var key = model.getPrimaryKey();
                                    if (!key)
                                        throw new Error("execBatch::Model \"" + val.model + "\" hasn't PRIMARY KEY.");
                                    self._tmpPredicate.addConditionWithClear({ field: key.name(), op: "=", value: val.data.key });

                                    if (val.data.rowVersion) {
                                        var rwField = model.getRowVersionField();
                                        if (!rwField)
                                            throw new Error("execBatch::Model \"" + val.model + "\" hasn't row version field.");
                                        self._tmpPredicate.addCondition({ field: rwField.name(), op: "=", value: val.data.rowVersion });
                                    };

                                    promise = self._query.update(model, val.data.fields, self._tmpPredicate,
                                        {
                                            transaction: transaction,
                                            updOptions: {
                                                rowVersion: val.data.rowVersion
                                            }
                                        });
                                    break;
                            };
                            return promise;
                        });
                    };

                    res_promise = this.transaction(batchFunc);
                }
                else
                    res_promise = Promise.reject(new Error("DB connection wasn't defined."));

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

            _makeRequest: function (query) {

                var request = { model: null, childs: [] };
                if (!query.dataObject)
                    throw new Error("\"dataObject\" isn't defined in query.");

                if ((!request.model) && query.dataObject.name) {
                    request.model = this._metaDataMgr.getModel(query.dataObject.name);
                    if (!request.model)
                        throw new Error("Can't find model (name = \"" + query.dataObject.name + "\".");
                };

                if ((!request.model) && query.dataObject.guid) {
                    request.model = this._metaDataMgr.getModelByGuid(query.dataObject.guid);
                    if (!request.model)
                        throw new Error("Can't find model (guid = \"" + query.dataObject.guid + "\".");
                };

                if ((!request.model) && query.dataObject.rootName) {
                    request.model = this._metaDataMgr.getModelByRootName(query.dataObject.rootName);
                    if (!request.model)
                        throw new Error("Can't find model (rootName = \"" + query.dataObject.rootName + "\".");
                };

                if ((!request.model) && query.dataObject.rootGuid) {
                    request.model = this._metaDataMgr.getModelByRootGuid(query.dataObject.rootGuid);
                    if (!request.model)
                        throw new Error("Can't find model (rootGuid = \"" + query.dataObject.rootGuid + "\".");
                };

                if (!request.model)
                    throw new Error("Can't find model " + JSON.stringify(query.dataObject) + ".");

                request.alias = query.dataObject.alias ? query.dataObject.alias : request.model.name();

                if (_.isArray(query.dataObject.childs) && (query.dataObject.childs.length > 0))
                    _.forEach(query.dataObject.childs, function (ch_query) {
                        request.childs.push(this._makeRequest(ch_query));
                    }, this);

                return request;
            },

            loadQuery: function (query, options) {
                if (this.hasConnection()) {

                    try {
                        var request = this._makeRequest(query);
                        var self = this;
                        return this._query.select(request, query.predicate)
                            .then(function (result) {
                                return self._formatLoadResult(query.dataGuid, request, result);
                            });
                    } catch (err) {
                        return Promise.reject(err);
                    };
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
                                                    if (dataObj.$sys.guid)
                                                        dataObj.fields.Guid = dataObj.$sys.guid;
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

            _formatLoadResult: function (dataGuid, request, rawData) {

                var objTypeGuid = request.model.dataObjectGuid();
                var controller = this._controller;
                var data_guid = dataGuid ? dataGuid : controller.guid();

                var result = {
                    "$sys": {
                        "guid": data_guid,
                        "typeGuid": request.model.dataRootGuid()
                    },
                    "fields": {
                        "dbgName": request.model.dataRootName()
                    },
                    "collections": {
                        "DataElements": [
                        ]
                    }
                };

                var objects = {};

                function data_walk(data, request) {

                    function _data_walk(data, request, parent, parent_obj, curr_path) {
                        var guid_fname = request.sqlAlias ? request.sqlAlias + "_Guid" : "Guid";
                        var guid = data[guid_fname];
                        if (guid) {
                            var curr_obj = objects[guid];
                            if (!curr_obj) {
                                objects[guid] = curr_obj = { collections: {}, currPath: curr_path };
                                data_obj = {
                                    "$sys": {
                                        "guid": guid,
                                        "typeGuid": request.model.dataObjectGuid()
                                    },
                                    "fields": {},
                                    "collections": {}
                                };

                                _.forEach(request.model.fields(), function (field) {
                                    var fld_name = field.name();
                                    if (fld_name !== "Guid") {
                                        var data_fld_name = request.sqlAlias ? request.sqlAlias + "_" + fld_name : fld_name;
                                        if (data[data_fld_name] !== undefined)
                                            data_obj.fields[fld_name] = data[data_fld_name];
                                    };
                                });

                                parent_obj.collections.DataElements.push(data_obj);

                                if (_.isArray(request.childs) && (request.childs.length > 0)) {
                                    data_obj.collections.Childs = [];
                                    _.forEach(request.childs, function (ch_query) {
                                        var root = {
                                            "$sys": {
                                                "guid": controller.guid(),
                                                "typeGuid": ch_query.model.dataRootGuid()
                                            },
                                            "fields": {
                                                "dbgName": ch_query.model.dataRootName(),
                                                "Alias": ch_query.alias
                                            },
                                            "collections": {
                                                "DataElements": [
                                                ]
                                            }
                                        };
                                        data_obj.collections.Childs.push(root);
                                        curr_obj.collections[ch_query.alias] = root;
                                    });
                                };
                            }
                            else
                                if (curr_obj.currPath !== curr_path)
                                    throw new Error("Duplicated object: \"" + guid + "\" in the result set!");

                            if (_.isArray(request.childs) && (request.childs.length > 0)) {
                                _.forEach(request.childs, function (ch_query) {
                                    _data_walk(data, ch_query, request,
                                        curr_obj.collections[ch_query.alias], curr_path + "/" + curr_obj.collections[ch_query.alias]["$sys"].guid);
                                });
                            };
                        };
                    };
                    _data_walk(data, request, null, result, "");
                };


                _.forEach(rawData, function (data) {
                    data_walk(data, request);
                });

                return result;
            },

            _loadMetaDataMgr: function () {
                var fs = require('fs');
                var metaDataMgr = null;
                metaDataMgr = this._dataBase
                    .deserialize(JSON.parse(fs.readFileSync(METADATA_FILE_NAME, { encoding: "utf8" })),
                        {}, this._dataBase.getDefaultCompCallback());
                return metaDataMgr;
            },

            _loadMetaInfo: function (dir, options) {
                var opts = _.defaults(options || {}, { ext_filter: "json" });
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
                        this._dataBase.deserialize(JSON.parse(fs.readFileSync(fname, { encoding: "utf8" })),
                            {}, this._dataBase.getDefaultCompCallback());
                    }, this);
                };
            }
        });

        return DataObjectEngine;
    }
);