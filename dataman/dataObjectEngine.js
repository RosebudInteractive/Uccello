if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../controls/controlMgr', '../metaData/metaDataMgr', '../metaData/metaModel', '../metaData/metaModelField', 'bluebird', 'lodash'],
    function (ControlMgr, MetaDataMgr, MetaModel, MetaModelField, Promise, _) {

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

				this._provider = null;
				if (opts.connection && opts.connection.provider) {
				    try {
				        var provider = require("./providers/" + opts.connection.provider + "/provider");
				    } catch (err) {
				        throw new Error("Unknown provider: \"" + opts.connection.provider + "\".");
				    };
				    this._provider = new provider(this, opts.connection);
				    this._provider.connectionMgr().getConnection()
                        .then(function (connection) {
                            console.log("Connected !!!");
                        })
                        .catch(function (err) {
                            console.log("Connection failed. Error: "+ err);
                        });
				};
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

            deleteSchema: function (name) {
                // Здесь пока не хватает удаления из memDB
                delete this._schemas[name];
            },

            getDB: function () {
		        return this._dataBase;
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