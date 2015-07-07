if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../controls/controlMgr', '../metaData/metaDataMgr', '../metaData/metaModel', '../metaData/metaModelField'],
    function (ControlMgr, MetaDataMgr, MetaModel, MetaModelField) {

        var DATAMAN_DB_NAME = "DatamanDB";
        var DATAMAN_DB_GUID = "66d43749-223a-48cb-9143-122381b9ed3c";

        var METADATA_FILE_NAME = UCCELLO_CONFIG.dataPath + "meta/metaTables.json";

        var Dataman = UccelloClass.extend({

		    init: function (router, controller, construct_holder) {
				this.pvt = {};
				this.pvt.router = router;
				this.pvt.controller = controller;
				this.pvt.constructHolder = construct_holder;

				var that = this;
				this.pvt.createComponent = function (typeObj, parent, sobj) {
				    var newObj = null;
				    var constr = that.pvt.constructHolder.getComponent(typeObj.getGuid())
				    if (constr && constr.constr) {
				        var params = { ini: sobj, parent: parent.obj, colName: parent.colName };
				        newObj = new constr.constr(that.pvt.dataBase, params);
				    };
				    return newObj;
				};

				this.pvt.dataBase = new ControlMgr(
                    {
                        controller: controller,
                        dbparams: {
                            name: DATAMAN_DB_NAME,
                            kind: "master",
                            guid: DATAMAN_DB_GUID
                        }
                    });
				this.pvt.metaDataMgr = this._loadMetaDataMgr();

				this.pvt.dataSource = 'local'; // 'local' or 'mysql'
				var that = this;
                router.add('query', function(){ return that.query.apply(that, arguments); });

                if (this.pvt.dataSource == 'mysql') {
                    var mysql = require('mysql');
                    this.pvt.mysqlConnection = mysql.createConnection({
                        host:     'localhost', // 'localhost'
                        user:     'rudenko',//'root',//'rudenko',
                        password: 'vrWSvr05',//'111111', //'vrWSvr05',
                        database: 'uccello'
                        /*host:     '54.93.99.65', // 'localhost'
                        user:     'rudenko',//'root',//'rudenko',
                        password: 'vrWSvr05',//'111111', //'vrWSvr05',
                        database: 'uccello'*/
                    });
                }
			},

		    getDB: function () {
		        return this.pvt.dataBase;
		    },

            query: function(data, done) {
				var result = {};
                var controller = this.pvt.controller;
                var db = controller.getDB(data.dbGuid);
                var rootGuid = controller.guid();
                db.deserialize(this.loadQuery(rootGuid), {}, function(){
                    controller.genDeltas(db.getGuid());
                    done({rootGuid:rootGuid});
                });
            },

            /**
             * Загрузить данные
             * @param guidRoot
             * @param expression
             * @returns {obj}
             */
            loadQuery: function (guidRoot, expression, done) {
                var hehe = {};
				var gr = guidRoot.slice(0,36);
                switch (gr) {
                    case UCCELLO_CONFIG.guids.rootCompany:
                        /*var time = Date.now();
                        function ddd() {
                            var timeEnd = Date.now();
                            logger.info((new Date()).toISOString()+';readCompanyFile;'+(timeEnd-time));
                            done.apply(this, arguments)
                        }
                        this.getCompany(gr, 10000, ddd);*/
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataCompany, 'company', done);
                        break;
                    case UCCELLO_CONFIG.guids.rootContact:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataContact, 'contact', done, 'CompanyId=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootContract:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataContract, 'contract', done, 'parent=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootAddress:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataCompany, 'address', done, 'parent=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootLead:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataLead, 'lead', done);
                        break;
                    case UCCELLO_CONFIG.guids.rootIncomeplan:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataIncomeplan, 'incomeplan', done, 'leadId=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootOpportunity:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataOpportunity, 'opportunity', done);
                        break;
                }
            },

            getDataSource: function() {
                return this.pvt.dataSource;
            },

            getMysqlConnection: function() {
                return this.pvt.mysqlConnection;
            },

            createResult: function(guidRoot, typeGuid, rows) {
                var result = {
                    "$sys": {
                        "guid": guidRoot,
                        "typeGuid": UCCELLO_CONFIG.classGuids.DataRoot
                    },
                    "fields": {
                        "Id": 1000,
                        "Name": "DataRoot"
                    },
                    "collections": {
                        "DataElements": [
                        ]
                    }
                };
                for(var i=0; i<rows.length; i++) {
                    var dataElement = {
                        "$sys": {
                            "guid": this.pvt.controller.guid(),
                            "typeGuid": typeGuid
                        },
                        "fields": rows[i],
                        "collections": {}
                    };
                    result.collections.DataElements.push(dataElement);
                }
                return result;
            },

            filterResult: function(result, expression) {
                // фильтрация по паренту
                if (expression) {
                    var filter = [];
                    for(var i in result.collections.DataElements) {
                        if (result.collections.DataElements[i].fields.parent == expression)
                            filter.push(result.collections.DataElements[i]);
                    }
                    result.collections.DataElements = filter;
                }
                return result;
            },

            readTableFile: function(file, guidRoot, classGuid, expression, done) {
                var fs = require('fs');
                var that = this;
                fs.exists(UCCELLO_CONFIG.dataPath + 'tables/'+file, function(exists) {
                    if (exists) {
                        fs.readFile(UCCELLO_CONFIG.dataPath + 'tables/'+file, function (err, data) {
                            if(err) throw err;
                            done(JSON.parse(data));
                        });
                    } else {
                        done(that.createResult(guidRoot, classGuid, {}));
                    }
                });
            },

            getList: function(guidRoot, typeGuid, table, done, where, whereParams, num) {
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();

                    where = where? ('WHERE '+where): '';
                    whereParams = whereParams? whereParams: [];
                    num = num? parseInt(num): 100000;

                    conn.query('SELECT * FROM '+table+' '+where+' LIMIT '+num, whereParams, function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, typeGuid, rows);

                        /*if (table == 'contact') {
                            var fs = require('fs');
                            var fileName = UCCELLO_CONFIG.dataPath + 'tables/'+table+(whereParams && whereParams[0]? ('-'+whereParams[0]): '')+'.json';
                            fs.writeFile(fileName, JSON.stringify(result), function(err) {
                                if(err) {
                                    console.log(err);
                                } else {
                                    console.log("The file `"+fileName+"` was saved!");
                                }
                            });
                        }*/
                        done(result);
                    });
                } else
                    this.readTableFile(table+(whereParams?'-'+whereParams[0]:'')+'.json', guidRoot, typeGuid, false, done);
                return "XXX";
            },

            _loadMetaDataMgr: function () {
                var fs = require('fs');
                var metaDataMgr = null;
                if (this.pvt.dataBase) {
                    new MetaModelField(this.pvt.dataBase);
                    new MetaModel(this.pvt.dataBase);
                    new MetaDataMgr(this.pvt.dataBase);
                    metaDataMgr = this.pvt.dataBase
                        .deserialize(JSON.parse(fs.readFileSync(METADATA_FILE_NAME, { encoding: "utf8" })),
                            {}, this.pvt.createComponent);
                };
                return metaDataMgr;
            }
        });
		return Dataman;
	}
);