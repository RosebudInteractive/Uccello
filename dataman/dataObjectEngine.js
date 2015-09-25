if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../controls/controlMgr', '../metaData/metaDataMgr', '../metaData/metaModel',
        '../metaData/metaModelField', 'bluebird', 'lodash', './dataObjectQuery'],
    function (ControlMgr, MetaDataMgr, MetaModel, MetaModelField, Promise, _, Query) {

        var ENGINE_DB_NAME = "DataEngineDB";
        var ENGINE_DB_GUID = "5360e933-9983-410c-8175-d83b296d247f";

        var METADATA_FILE_NAME = UCCELLO_CONFIG.dataPath + "meta/metaTables.json";

        var DataObjectEngine = UccelloClass.extend({

            init: function (options) {
                var opts = options || {};

                this._router = opts.router;
                this._controller = opts.controller;
                this._constructHolder = opts.construct_holder;
                this._schemas = {};

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
                            name: ENGINE_DB_NAME,
                            kind: "master",
                            guid: ENGINE_DB_GUID
                        }
                    });

                this._provider = null;
                this._query = null;

                if (opts.connection && opts.connection.provider) {
                    try {
                        var provider = require("./providers/" + opts.connection.provider + "/provider");
                    } catch (err) {
                        throw new Error("Unknown provider: \"" + opts.connection.provider + "\".");
                    };
                    this._provider = new provider(this, opts.connection);
                    this._query = new Query(this, this._provider);
                };

                new MetaModelField(this._dataBase);
                new MetaModel(this._dataBase);
                new MetaDataMgr(this._dataBase);

                this._metaDataMgr = this._loadMetaDataMgr();
                this._metaDataMgr.router(this._router);
                if (opts.rpc) {
                    var remote = opts.rpc._publ(this._metaDataMgr, this._metaDataMgr.getInterface());
                    this._constructHolder.addTypeProvider(remote); // удаленный провайдер
                };
                this._constructHolder.addTypeProvider(this._metaDataMgr, true); // локальный провайдер

                //////////////////// test
                //this._query.createTable(this._metaDataMgr.getModel("DataLead"))
                //this._query.select(this._metaDataMgr.getModel("DataLead"))
                //.then(function (result) {
                //    console.log("Operation done !!!");
                //})
                //.catch(function (err) {
                //    console.log("Operation failed. Error: " + err);
                //});
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

            syncSchema: function (options) {

                if (this._provider && this._query) {

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

            importDir: function (dir, options) {

                if (this._provider && this._query) {

                    var opts = _.defaults(options || {}, { ext_filter: "json" });
                    var self = this;

                    var promise = Promise.resolve();
                    if (opts.force === true) {
                        promise = self.syncSchema({ force: true });
                    }

                    return promise.then(function (result) {

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
                                    console.log("Read file: " + file);

                                    if (data && data.collections && data.collections.DataElements
                                        && (data.collections.DataElements.length > 0)) {
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
                                    var _model = val.model;
                                    var _data = val.data;
                                    return self._seqExec(_data, function (values, id) {
                                        return self._query.insert(_model, values);
                                    });
                                }));
                            }
                            else
                                return resolve();
                        });
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