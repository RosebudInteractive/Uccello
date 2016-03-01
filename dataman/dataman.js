if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../controls/controlMgr', '../metaData/metaDataMgr',
        '../metaData/metaModel', '../metaData/metaModelField', './dataObjectEngine', '../metaData/metaDefs'],
    function (ControlMgr, MetaDataMgr, MetaModel, MetaModelField, DataObjectEngine, Meta) {

        var DATAMAN_DB_NAME = "DatamanDB";
        var DATAMAN_DB_GUID = "66d43749-223a-48cb-9143-122381b9ed3c";

        var METADATA_FILE_NAME = UCCELLO_CONFIG.dataPath + "meta/metaTables.json";

        var Dataman = UccelloClass.extend({

		    init: function (router, controller, construct_holder, rpc) {
				this.pvt = {};
				this.pvt.router = router;
				this.pvt.controller = controller;
				this.pvt.constructHolder = construct_holder;

				var that = this;

				this.pvt.dataObjectEngine = new DataObjectEngine(router, controller,
                    construct_holder, rpc, UCCELLO_CONFIG.dataman);

				this.pvt.dataSource = 'local'; // 'local' or 'mysql'
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
                if (expression && expression.model) {
                    var predicate;
                    if (expression.predicate) {
                        // TODO: Здесь каждый раз надо новый предикат создавать !!!
                        predicate = this.pvt.dataObjectEngine.deserializePredicate(
                                expression.predicate,
                                this.pvt.dataObjectEngine.newPredicate()
                            );
                    };

                    var query = { dataObject: expression.model, dataGuid: guidRoot, predicate: predicate };
                    if (expression.is_single)
                        query.is_single = expression.is_single;
                    this._loadData(query, done);
                }
                else {
                    var gr = guidRoot.slice(0, 36);
                    switch (gr) {
                        case UCCELLO_CONFIG.guids.rootCompany:
                            this.getList(gr, 'company', done);
                            break;
                        case UCCELLO_CONFIG.guids.rootTstCompany:
                            this.getList(gr, 'company_tst', done);
                            break;
                        case UCCELLO_CONFIG.guids.rootContact:
                            this.getList(gr, 'contact', done, 'CompanyId=?', [expression], { field: "CompanyId", op: "=", value: expression });
                            break;
                        case UCCELLO_CONFIG.guids.rootTstContact:
                            this.getList(gr, 'contact_tst', done, 'parent=?', [expression], { field: "parent", op: "=", value: expression });
                            break;
                        case UCCELLO_CONFIG.guids.rootContract:
                            this.getList(gr, 'contract', done, 'parent=?', [expression], { field: "parent", op: "=", value: expression });
                            break;
                        case UCCELLO_CONFIG.guids.rootAddress:
                            this.getList(gr, 'address', done, 'parent=?', [expression], { field: "parent", op: "=", value: expression });
                            break;
                        case UCCELLO_CONFIG.guids.rootLead:
                            this.getList(gr, 'lead', done);
                            break;
                        case UCCELLO_CONFIG.guids.rootLeadLog:
                            this.getList(gr, 'lead_log', done, 'LeadId=?', [expression], { field: "LeadId", op: "=", value: expression });
                            break;
                        case UCCELLO_CONFIG.guids.rootIncomeplan:
                            this.getList(gr, 'incomeplan', done, 'leadId=?', [expression], { field: "LeadId", op: "=", value: expression });
                            break;
                        case UCCELLO_CONFIG.guids.rootOpportunity:
                            this.getList(gr, 'opportunity', done);
                            break;
                    }
                };
            },

            getDataSource: function() {
                return this.pvt.dataSource;
            },

            getMysqlConnection: function() {
                return this.pvt.mysqlConnection;
            },

            createResult: function(typeGuid, rows, objTypeGuid) {

                var dataRoots = {
                    "5f9e649d-43c4-d1e6-2778-ff4f58cd7c53": "c4d626bf-1639-2d27-16df-da3ec0ee364e",
                    '3618f084-7f99-ebe9-3738-4af7cf53dc49' : "de984440-10bd-f1fd-2d50-9af312e1cd4f",
                    "8583ee1d-6936-19da-5ef0-9025fb7d1d8d": "4f7d9441-8fcc-ba71-2a1d-39c1a284fc9b",
                    "edca46bc-3389-99a2-32c0-a59665fcb6a7": "07e64ce0-4a6c-978e-077d-8f6810bf9386",
                    "bb48579c-808e-291e-0242-0facc4876051": "bedf1851-cd51-657e-48a0-10ac45e31e20",
                    "8770f400-fd42-217c-90f5-507ca52943c2": "194fbf71-2f84-b763-eb9c-177bf9ac565d",
                    "f988a1cb-4be0-06c3-4eaa-4ae8b554f6b3": "3fe7cd6f-b146-8898-7215-e89a2d8ea702",
                    "ab573a02-b888-b3b4-36a7-38629a5fe6b7": "0c2f3ec8-ad4a-c311-a6fa-511609647747",
                    "b49d39c9-b903-cccd-7d32-b84beb1b76dc": "ad17cab2-f41a-36ef-37da-aac967bbe356",
                    "c170c217-e519-7c23-2811-ff75cd4bfe81": "31c99003-c0fc-fbe6-55eb-72479c255556"
                };

                var result = {
                    "$sys": {
                        "guid": typeGuid,
                        "typeGuid": dataRoots[typeGuid]
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
                            "typeGuid": objTypeGuid
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

            readTableFile: function(file, typeGuid, expression, done) {
                var fs = require('fs');
                var that = this;
                fs.exists(UCCELLO_CONFIG.dataPath + 'tables/'+file, function(exists) {
                    if (exists) {
                        fs.readFile(UCCELLO_CONFIG.dataPath + 'tables/'+file, function (err, data) {
                            if(err) throw err;
                            done(JSON.parse(data));
                        });
                    } else {
                        done(that.createResult(typeGuid, []));
                    }
                });
            },

            _loadData: function (query, done) {
                if (this.pvt.dataObjectEngine.hasConnection()) {

                    this.pvt.dataObjectEngine.loadQuery(query)
                    .then(function (result) {
                        done(result);
                    })
                    .catch(function (err) {
                        throw err;
                    });
                } else
                    done({});
            },

            getList: function (typeGuid, table, done, where, whereParams, condition, num) {
                var guidRoots = {
                    'ab573a02-b888-b3b4-36a7-38629a5fe6b7': '59583572-20fa-1f58-8d3f-5114af0f2c51', // DataCompany
                    '5f9e649d-43c4-d1e6-2778-ff4f58cd7c53': '34c6f03d-f6ba-2203-b32b-c7d54cd0185a', // DataTstCompany
                    'b49d39c9-b903-cccd-7d32-b84beb1b76dc': '73596fd8-6901-2f90-12d7-d1ba12bae8f4', // DataContact
                    '3618f084-7f99-ebe9-3738-4af7cf53dc49': '27ce7537-7295-1a45-472c-a422e63035c7', // DataTstContact
                    '8583ee1d-6936-19da-5ef0-9025fb7d1d8d': '08a0fad1-d788-3604-9a16-3544a6f97721', // DataContract
                    'edca46bc-3389-99a2-32c0-a59665fcb6a7': '16ec0891-1144-4577-f437-f98699464948', // DataAddress
                    'c170c217-e519-7c23-2811-ff75cd4bfe81': '86c611ee-ed58-10be-66f0-dfbb60ab8907', // DataLead
                    'bb48579c-808e-291e-0242-0facc4876051': 'c4fa07b5-03f7-4041-6305-fbd301e7408a', // DataLeadLog
                    '8770f400-fd42-217c-90f5-507ca52943c2': '56cc264c-5489-d367-1783-2673fde2edaf', // DataIncomeplan
                    'f988a1cb-4be0-06c3-4eaa-4ae8b554f6b3': '5b64caea-45b0-4973-1496-f0a9a44742b7'  // DataOpportunity
                };

                var source = this.getDataSource();
                var that = this;
                if (this.pvt.dataObjectEngine.hasConnection()) {
                    var query = { dataObject: { guid: guidRoots[typeGuid] }, dataGuid: typeGuid };
                    if (condition) {
                        var predicate = this.pvt.dataObjectEngine.newPredicate();
                        query.predicate = predicate.addConditionWithClear(condition);
                    }
                    this._loadData(query, done);
                } else
                    if (source == 'mysql') {
                        var conn = this.getMysqlConnection();

                        where = where ? ('WHERE ' + where) : '';
                        whereParams = whereParams ? whereParams : [];
                        num = num ? parseInt(num) : 100000;

                        conn.query('SELECT * FROM ' + table + ' ' + where + ' LIMIT ' + num, whereParams, function (err, rows) {
                            if (err) throw err;
                            var result = that.createResult(typeGuid, rows, guidRoots[typeGuid]);

                            // сохранить в файлы
                            /*if (table == 'lead_log') {
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
                        this.readTableFile(table + (whereParams ? '-' + whereParams[0] : '') + '.json', typeGuid, false, done);
                //return "XXX";
            }
        });
		return Dataman;
	}
);