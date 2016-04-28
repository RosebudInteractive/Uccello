'use strict';

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../controls/controlMgr', '../metaData/metaDataMgr', '../metaData/metaModel',
        '../metaData/metaModelField', '../metaData/metaDefs', '../metaData/metaModelRef', '../metaData/metaLinkRef',
        /*'bluebird',*/ 'lodash', './dataObjectQuery', '../predicate/predicate', './transaction', '../system/resourceBuilder/resourceBuilder'],
    function (ControlMgr, MetaDataMgr, MetaModel, MetaModelField, Meta, MetaModelRef, MetaLinkRef,
        /*Promise,*/ _, Query, Predicate, Transaction, ResourceBuilder) {

        var METADATA_FILE_NAME = UCCELLO_CONFIG.dataPath + "meta/metaTables.json";
        var METADATA_DIR_NAME = UCCELLO_CONFIG.dataPath + "meta";
        var META_DATA_MGR_GUID = "77153254-7f08-6810-017b-c99f7ea8cddf@2009";
        var PREDICATE_POOL_SIZE = 20;
        var DATA_ADAPTER_NAME = "dbData";

        var iDataObjectEngine = {

            className: "IDataObjectEngine",
            classGuid: UCCELLO_CONFIG.guids.iDataObjectEngine,

            tranStart: "function",
            tranCommit: "function",
            tranRollback: "function",
            getNextRowId: "function",
            execBatch: "function",
            execSql: "function",
            importDir: "function"
        };

        var DataObjectEngine = UccelloClass.extend({

            init: function (dataman, router, controller, construct_holder, rpc, options, resman) {
                var opts = _.cloneDeep(options || {});

                this._router = router;
                this._controller = controller;
                this._constructHolder = construct_holder;
                this._options = opts;
                this._schemas = {};
                this._predicates_idle = [];
                this._predicates_busy = {};
                this._resMan = resman ? resman : null;
                this.Meta = Meta;

                var self = this;
                this._dataBase = new ControlMgr(
                    {
                        controller: this._controller,
                        dbparams: {
                            name: Meta.Db.Name,
                            kind: "master",
                            guid: opts.auto_gen_db_guid ? this._controller.guid() : Meta.Db.Guid,
                            constructHolder: construct_holder
                        }
                    });

                this._provider = null;
                this._query = null;
                for (var i = 0; i < PREDICATE_POOL_SIZE; i++)
                    this._createPredicate();

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
                        console.log("###\n### Import finished !!!\n###");
                    })
                    .catch(function (err) {
                        console.log("###\n### IMPORT ERROR: " + err.message + "\n###");
                        throw err;
                    });
                };

                if (rpc && router) {
                    global.$data = rpc._publ(this, iDataObjectEngine); // Глобальная переменная для доступа к IDataObjectEngine
                    router.add('iDataObjectEngine', function (data, done) { done({ intf: iDataObjectEngine }); });
                };
                if (dataman)
                    dataman.regDataAdapter(DATA_ADAPTER_NAME, this);
            },

            getGuid: function () {
                return UCCELLO_CONFIG.guids.iDataObjectEngine;
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

            _createPredicate: function () {
                var pobj = new Predicate(this._dataBase, {});
                this._predicates_idle.push(pobj);
                return pobj;
            },

            releasePredicate: function (predicate) {
                if (predicate) {
                    var guid = predicate.getGuid();
                    var pobj = this._predicates_busy[guid];
                    if (pobj) {
                        pobj.clearConditions();
                        delete this._predicates_busy[guid];
                        this._predicates_idle.push(pobj);
                    };
                };
            },

            newPredicate: function () {
                var result;
                if (this._predicates_idle.length > 0) {
                    result = this._predicates_idle.pop();
                    result.clearConditions();
                }
                else
                    result = this._createPredicate();
                this._predicates_busy[result.getGuid()] = result;
                return result;
            },

            deserializePredicate: function (serialized_obj) {
                var result = this.newPredicate();
                var so = _.cloneDeep(serialized_obj);
                so.$sys.guid = result.getGuid();
                delete so["ver"]; // Удаляем версию рута, она здесь неактуальна
                result = this._dataBase.deserialize(so, {}, this._dataBase.getDefaultCompCallback());
                this._predicates_busy[result.getGuid()] = result;
                return result;
            },

            saveSchemaToFile: function (dir, schema_name, entity_name) {
                var fs = require('fs');
                var path = require('path');
                var method;
                switch (entity_name) {
                    case "model":
                        method = "models";
                        break;
                    case "objectTree":
                        method = "objectTrees";
                        break;
                    default:
                        if (!entity_name)
                            method = "models"
                        else
                            throw new Error("Entity \"" + entity_name + "\" isn't supported!");
                        break;
                }
                var models = this.getSchema(schema_name) ? this.getSchema(schema_name)[method].apply(this.getSchema(schema_name)) : null;
                if (!models)
                    throw new Error("Schema \"" + schema_name + "\" doesn't exist.");

                _.forEach(models, function (model) {
                    fs.writeFileSync(path.format({ dir: dir, base: model.name() + ".json" }),
                        JSON.stringify(model.getDB().serialize(model, true)),
                        { encoding: "utf8" })
                }, this);
            },

            saveSchemaTypesToFile: function (dir, schema_name) {
                var fs = require('fs');
                var path = require('path');
                var schema = this.getSchema(schema_name);
                if (!schema)
                    throw new Error("Schema \"" + schema_name + "\" doesn't exist.");

                var models = schema.models();
                var data = {
                    $sys: {
                        guid: this._controller.guid(),
                        typeGuid: Meta.TYPE_MODEL_RGUID
                    },
                    fields: {
                        Id: 1,
                        Name: Meta.TYPE_MODEL_RNAME
                    },
                    collections: {
                        DataElements: []
                    }
                };
                var elems = data.collections.DataElements;

                _.forEach(models, function (model) {
                    if ((!model.isTypeModel()) && (!model.isVirtual())) {
                        var elem = {
                            $sys: {
                                guid: this._controller.guid(),
                                typeGuid: Meta.TYPE_MODEL_GUID
                            },
                            fields: {
                                Id: model.getActualTypeId(),
                                TypeGuid: model.dataObjectGuid(),
                                ModelName: model.name()
                            },
                            collections: {}
                        };
                        var ancestors = model.getAncestors();
                        if (ancestors.length > 0)
                            elem.fields.ParentTypeId = ancestors[ancestors.length - 1].getActualTypeId();
                        elems.push(elem);
                    };
                }, this);

                fs.writeFileSync(path.format({ dir: dir, base: "DATA_" + Meta.TYPE_MODEL_NAME + ".json" }),
                    JSON.stringify(data), { encoding: "utf8" });
            },

            transaction: function (batch, options) {
                var result;
                try {
                    var tran = new Transaction(this, options);
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
                                    }, function () {
                                        // В случае ошибки ROLLBACK просто ее игнорируем
                                        return Promise.reject(err);
                                    });
                            });
                    }
                    else
                        result = tran.start().then(function () { return tran; });
                } catch (err) {
                    result = Promise.reject(err);
                };
                return result;
            },

            tranStart: function (options, callback) {

                var result = {};
                var res_promise;

                try {
                    var tran;
                    if (this.hasConnection()) {
                        tran = new Transaction(this, options);
                        res_promise = tran.start();
                    }
                    else
                        res_promise = Promise.reject(new Error("DB connection wasn't defined."));
                } catch (err) {
                    res_promise = Promise.reject(err);
                };

                res_promise
                    .then(function (opResult) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "OK";
                                result.transactionId = tran.getTranId();
                                callback(result);
                            }, 0);
                    })
                    .catch(function (err) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "ERROR";
                                result.message = "Unknown error in \"DataObjectEngine::tranStrart\".";
                                if (err.message)
                                    result.message = err.message;
                                callback(result);
                            }, 0);
                    });

                return UCCELLO_CONFIG.REMOTE_RESULT;
            },

            tranCommit: function (transactionId, callback) {

                var result = {};
                var res_promise;

                try {
                    var tran;
                    if (this.hasConnection()) {
                        tran = Transaction.getTranById(transactionId);
                        if (tran)
                            res_promise = tran.commit()
                        else
                            throw new Error("Transaction \"" + transactionId + "\" doesn't exist.");
                    }
                    else
                        res_promise = Promise.reject(new Error("DB connection wasn't defined."));
                } catch (err) {
                    res_promise = Promise.reject(err);
                };

                res_promise
                    .then(function (opResult) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "OK";
                                result.transactionId = tran.getTranId();
                                callback(result);
                            }, 0);
                    })
                    .catch(function (err) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "ERROR";
                                result.message = "Unknown error in \"DataObjectEngine::tranCommit\".";
                                if (err.message)
                                    result.message = err.message;
                                callback(result);
                            }, 0);
                    });

                return UCCELLO_CONFIG.REMOTE_RESULT;
            },

            tranRollback: function (transactionId, callback) {

                var result = {};
                var res_promise;

                try {
                    var tran;
                    if (this.hasConnection()) {
                        tran = Transaction.getTranById(transactionId);
                        if (tran)
                            res_promise = tran.rollback()
                        else
                            throw new Error("Transaction \"" + transactionId + "\" doesn't exist.");
                    }
                    else
                        res_promise = Promise.reject(new Error("DB connection wasn't defined."));
                } catch (err) {
                    res_promise = Promise.reject(err);
                };

                res_promise
                    .then(function (opResult) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "OK";
                                result.transactionId = tran.getTranId();
                                callback(result);
                            }, 0);
                    })
                    .catch(function (err) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "ERROR";
                                result.message = "Unknown error in \"DataObjectEngine::tranRollback\".";
                                if (err.message)
                                    result.message = err.message;
                                callback(result);
                            }, 0);
                    });

                return UCCELLO_CONFIG.REMOTE_RESULT;
            },

            getNextRowId: function (model_name, options, callback) {

                var result = {};
                var res_promise;

                try {
                    var tran;
                    if (this.hasConnection()) {
                        
                        var model = this._metaDataMgr.getModel(model_name);
                        if (model)
                            res_promise = this._query.getNextRowId(model, options)
                        else
                            throw new Error("Model \"" + model_name + "\" doesn't exist.");
                    }
                    else
                        res_promise = Promise.reject(new Error("DB connection wasn't defined."));
                } catch (err) {
                    res_promise = Promise.reject(err);
                };

                res_promise
                    .then(function (opResult) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "OK";
                                result.detail = [];
                                result.detail.push({ insertId: opResult.insertId });
                                callback(result);
                            }, 0);
                    })
                    .catch(function (err) {
                        if (callback)
                            setTimeout(function () {
                                result.result = "ERROR";
                                result.message = "Unknown error in \"DataObjectEngine::getNextRowId\".";
                                if (err.message)
                                    result.message = err.message;
                                callback(result);
                            }, 0);
                    });

                return UCCELLO_CONFIG.REMOTE_RESULT;
            },

            execSql: function (sql, options, callback) {
                var res_promise;

                try {
                    if (this.hasConnection()) {
                        res_promise = this._query.execSql(sql, options);
                    }
                    else
                        res_promise = Promise.reject(new Error("DB connection wasn't defined."));
                } catch (err) {
                    res_promise = Promise.reject(err);
                };

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
                                result.message = "Unknown error in \"DataObjectEngine::execSql\".";
                                if (err.message)
                                    result.message = err.message;
                                callback(result);
                            }, 0);
                    });

                return UCCELLO_CONFIG.REMOTE_RESULT;
            },

            execBatch: function (batch, options, callback) {
                console.log("execBatch: " + JSON.stringify(batch));

                var result = {};
                var res_promise;
                var self = this;

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

                                if (val.data.rowVersion) {
                                    var rwField = model.getRowVersionField();
                                    if (!rwField)
                                        throw new Error("execBatch::Model \"" + val.model + "\" hasn't row version field.");
                                };

                                promise = self._query.update(model, val.data.fields, null,
                                    {
                                        transaction: transaction,
                                        updOptions: {
                                            key: val.data.key,
                                            rowVersion: val.data.rowVersion
                                        }
                                    });
                                break;

                            case "delete":

                                if ((!val.data) || (!val.data.key))
                                    throw new Error("execBatch::Key for operation \"" + val.op + "\" doesn't exist.");

                                var key = model.getPrimaryKey();
                                if (!key)
                                    throw new Error("execBatch::Model \"" + val.model + "\" hasn't PRIMARY KEY.");

                                if (val.data.rowVersion) {
                                    var rwField = model.getRowVersionField();
                                    if (!rwField)
                                        throw new Error("execBatch::Model \"" + val.model + "\" hasn't row version field.");
                                };

                                promise = self._query.delete(model, null, {
                                    transaction: transaction,
                                    delOptions: {
                                        key: val.data.key,
                                        rowVersion: val.data.rowVersion
                                    }
                                });
                                break;
                        };
                        return promise;
                    });
                };

                try {
                    if (this.hasConnection() && (batch.length > 0)) {
                        res_promise = this.transaction(batchFunc, options);
                    }
                    else
                        res_promise = Promise.reject(new Error("DB connection wasn't defined."));
                } catch (err) {
                    res_promise = Promise.reject(err);
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
                                result.message = "Unknown error in \"DataObjectEngine::execBatch\".";
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
                            if (!model.isVirtual()) {
                                operations.push({ model: model, isDrop: true });
                                create.push({ model: model, isDrop: false });
                            };
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
                if (query.dataObject.parentField)
                    request.parentField = query.dataObject.parentField;
                if (query.dataObject.isStub)
                    request.isStub = query.dataObject.isStub;
                if (query.is_single)
                    request.is_single = query.is_single;

                if (_.isArray(query.dataObject.childs) && (query.dataObject.childs.length > 0))
                    _.forEach(query.dataObject.childs, function (ch_query) {
                        request.childs.push(this._makeRequest(ch_query));
                    }, this);

                return request;
            },


            requestData: function (guidRoot, expression, done) {
                var predicate;
                if (expression.predicate)
                    predicate = this.deserializePredicate(expression.predicate);

                if (expression.model.filter)
                    if (!predicate)
                        predicate = this.deserializePredicate(expression.model.filter)
                    else
                        predicate.addPredicate(expression.model.filter);

                var query = { dataObject: expression.model, dataGuid: guidRoot, predicate: predicate };
                if (expression.is_single)
                    query.is_single = expression.is_single;

                this.loadQuery(query)
                .then(function (result) {
                    done(result);
                })
                .catch(function (err) {
                    console.error("###ERROR: " + err.message);
                    done({});
                });
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
                            resolve(self._query.execDbInitialScript({}).then(function () {
                                return self._query.showForeignKeys().then(function (result) {
                                        var curr_promise = Promise.resolve();
                                        if (result.length > 0) {
                                            var models = self._metaDataMgr.models(true);
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
                                    });
                                })
                            );
                        });
                    }

                    return promise.then(function (result) {

                        return ResourceBuilder.prepareFiles()
                            .then(function () {
                                return (result);
                            })
                            .then(function (result) {

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
                                }).then(function (result) {
                                    var fin_result = result;
                                    return self._seqExec(self._metaDataMgr.models(true), function (model) {
                                        return self._query.setTableRowId(model);
                                    }).then(function (result_rowid) {
                                        var promise = Promise.resolve();
                                        if (self._resMan)
                                            promise = self._resMan.rebuildResources();
                                        return promise.then(function () {
                                            return fin_result.concat(result_rowid);
                                        })
                                    });
                                });
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
                        var links = self._metaDataMgr.outgoingDbRefsLinks();
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
                var time = process.hrtime();
                var tot_lines = 0;

                var result = {
                    "$sys": {
                        "guid": data_guid,
                        "typeGuid": request.model.dataRootGuid(),
                        "requiredTypes": []
                    },
                    "fields": {
                        "Name": request.model.dataRootName()
                    },
                    "collections": {
                        "DataElements": [
                        ]
                    }
                };

                if (request.alias)
                    result.fields.Alias = request.alias;

                if (request.parentField)
                    result.fields.ParentField = request.parentField;

                function make_types_arr(required_types, types) {

                    function _make_types_arr(arr, request, level, request_tree) {

                        var root_type_guid = request.model.dataRootGuid();
                        var obj_type_guid = request.model.dataObjectGuid();
                        if (level > 0) {
                            request_tree = request_tree[request.alias] = {};
                            request_tree.t = root_type_guid;
                            request_tree.f = request.parentField;
                        };

                        if (_.isArray(request.childs) && (request.childs.length > 0)) {
                            var rt;

                            if (!request_tree)
                                rt = request_tree = {}
                            else
                                rt = request_tree.c = {};

                            _.forEach(request.childs, function (ch_query) {
                                _make_types_arr(arr, ch_query, level + 1, rt);
                            });
                        };

                        if ((!types[root_type_guid]) && (level > 0)) {
                            arr.push(root_type_guid);
                            types[root_type_guid] = true;
                        };
                        if (!types[obj_type_guid]) {
                            arr.push(obj_type_guid);
                            types[obj_type_guid] = true;
                        };
                        return request_tree;
                    };
                    return _make_types_arr(required_types, request, 0, null);
                };

                var required_types = result.$sys.requiredTypes;
                var required_types_dict = {};

                var request_tree = make_types_arr(required_types, required_types_dict);
                if (request_tree)
                    result.fields.RequestTree = JSON.stringify(request_tree);

                var objects = {};

                function data_walk(data, request) {

                    function _data_walk(data, request, parent, parent_obj, curr_path) {
                        var guid;
                        var guidField = request.model.getClassGuidField();
                        if (guidField) {
                            var guid_fname = request.sqlAlias ? request.sqlAlias + "_" + guidField.name() : guidField.name();
                            guid = data[guid_fname];
                        }
                        else
                            if (request.model.isVirtual())
                                guid = controller.guid();
                        if (guid) {
                            var curr_obj = objects[guid];
                            if (!curr_obj) {
                                objects[guid] = curr_obj = { collections: {}, currPath: curr_path };
                                var data_obj = {
                                    "$sys": {
                                        "guid": guid,
                                        "typeGuid": request.model.dataObjectGuid()
                                    },
                                    "fields": {},
                                    "collections": {}
                                };

                                _.forEach(request.model.getClassFields(), function (class_field) {
                                    var fld_name = class_field.field.name();
                                    if (class_field.field !== guidField) {
                                        var data_fld_name = request.sqlAlias ? request.sqlAlias + "_" + fld_name : fld_name;
                                        if (data[data_fld_name] !== undefined)
                                            data_obj.fields[fld_name] = data[data_fld_name];
                                    }
                                });

                                if (request.childs_info) {
                                    // DataObject имеет наследников !
                                    var tp_fname = request.sqlAlias ? request.sqlAlias + "_" +
                                        request.childs_info.typeFieldName : request.childs_info.typeFieldName;
                                    var tp_val = data[tp_fname];
                                    if (tp_val) {
                                        var info = request.childs_info[tp_val];
                                        if (info) {
                                            if (!info.isBase) {
                                                var type_guid = info.model.dataObjectGuid();
                                                if (!required_types_dict[type_guid]) {
                                                    required_types.push(type_guid);
                                                    required_types_dict[type_guid] = true;
                                                }
                                                data_obj.$sys.typeGuid = type_guid; // Меняем тип DataObject
                                                // Добавляем поля наследника
                                                _.forEach(info.extraFields, function (extra_field) {
                                                    var data_fld_name = request.sqlAlias ? request.sqlAlias + "_" + extra_field.alias : extra_field.alias;
                                                    if (data[data_fld_name] !== undefined)
                                                        data_obj.fields[extra_field.fname] = data[data_fld_name];
                                                });
                                            };
                                        }
                                        else
                                            throw new Error("Unknown type value: \"" + tp_val + "\" : Model: \"" + request.model.name() +
                                                "\" : Guid: \"" + guid + "\".");
                                    }
                                    else
                                        throw new Error("Type field is empty: \"" + request.model.name() +
                                            "\" : Guid: \"" + guid + "\".");

                                };

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
                                                "Name": ch_query.model.dataRootName(),
                                                "Alias": ch_query.alias
                                            },
                                            "collections": {
                                                "DataElements": [
                                                ]
                                            }
                                        };
                                        if (ch_query.parentField)
                                            root.fields.ParentField = ch_query.parentField;
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
                    ++tot_lines;
                });

                if (request.is_single) {
                    var curr_guid = result.$sys.guid;
                    var req_types = result.$sys.requiredTypes;
                    if (result.collections.DataElements.length === 1) {
                        result = result.collections.DataElements[0];
                        result.$sys.guid = curr_guid;
                        result.$sys.requiredTypes = req_types;
                    }
                    else
                        result = null;
                };

                var diff = process.hrtime(time);
                console.log("=== Process result time: " + ((diff[0] * 1e9 + diff[1]) / 1e9).toFixed(4) + " sec. ( " + tot_lines + " lines ) ===");
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