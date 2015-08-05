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

		    init: function (router, controller, construct_holder, rpc) {
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
				this.pvt.metaDataMgr.router(this.pvt.router);
				var remote = rpc._publ(this.pvt.metaDataMgr, this.pvt.metaDataMgr.getInterface());
				this.pvt.constructHolder.addTypeProvider(remote); // удаленный провайдер
				this.pvt.constructHolder.addTypeProvider(this.pvt.metaDataMgr, true); // локальный провайдер

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
                        this.getList(gr, 'company', done);
                        break;
                    case UCCELLO_CONFIG.guids.rootTstCompany:
                        this.getList(gr, 'company_tst', done);
                        break;
                    case UCCELLO_CONFIG.guids.rootContact:
                        this.getList(gr, 'contact', done, 'CompanyId=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootTstContact:
                        this.getList(gr, 'contact_tst', done, 'parent=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootContract:
                        this.getList(gr, 'contract', done, 'parent=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootAddress:
                        this.getList(gr, 'address', done, 'parent=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootLead:
                        this.getList(gr, 'lead', done);
                        break;
                    case UCCELLO_CONFIG.guids.rootLeadLog:
                        this.getList(gr, 'lead_log', done, 'LeadId=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootIncomeplan:
                        this.getList(gr, 'incomeplan', done, 'leadId=?', [expression]);
                        break;
                    case UCCELLO_CONFIG.guids.rootOpportunity:
                        this.getList(gr, 'opportunity', done);
                        break;
                }
            },

            getDataSource: function() {
                return this.pvt.dataSource;
            },

            getMysqlConnection: function() {
                return this.pvt.mysqlConnection;
            },

            createResult: function(typeGuid, rows) {

                var guidRoots = {
                    'ab573a02-b888-b3b4-36a7-38629a5fe6b7':'59583572-20fa-1f58-8d3f-5114af0f2c51', // DataCompany
                    '5f9e649d-43c4-d1e6-2778-ff4f58cd7c53':'34c6f03d-f6ba-2203-b32b-c7d54cd0185a', // DataTstCompany
                    'b49d39c9-b903-cccd-7d32-b84beb1b76dc':'73596fd8-6901-2f90-12d7-d1ba12bae8f4', // DataContact
                    '3618f084-7f99-ebe9-3738-4af7cf53dc49':'27ce7537-7295-1a45-472c-a422e63035c7', // DataTstContact
                    '8583ee1d-6936-19da-5ef0-9025fb7d1d8d':'08a0fad1-d788-3604-9a16-3544a6f97721', // DataContract
                    'edca46bc-3389-99a2-32c0-a59665fcb6a7':'16ec0891-1144-4577-f437-f98699464948', // DataAddress
                    'c170c217-e519-7c23-2811-ff75cd4bfe81':'86c611ee-ed58-10be-66f0-dfbb60ab8907', // DataLead
                    'bb48579c-808e-291e-0242-0facc4876051':'c4fa07b5-03f7-4041-6305-fbd301e7408a', // DataLeadLog
                    '8770f400-fd42-217c-90f5-507ca52943c2':'56cc264c-5489-d367-1783-2673fde2edaf', // DataIncomeplan
                    'f988a1cb-4be0-06c3-4eaa-4ae8b554f6b3':'5b64caea-45b0-4973-1496-f0a9a44742b7'  // DataOpportunity
                };

                var result = {
                    "$sys": {
                        "guid": typeGuid,
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
                            "typeGuid": guidRoots[typeGuid]
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
                        done(that.createResult(typeGuid, {}));
                    }
                });
            },

            getList: function(typeGuid, table, done, where, whereParams, num) {
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();

                    where = where? ('WHERE '+where): '';
                    whereParams = whereParams? whereParams: [];
                    num = num? parseInt(num): 100000;

                    conn.query('SELECT * FROM '+table+' '+where+' LIMIT '+num, whereParams, function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(typeGuid, rows);

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
                    this.readTableFile(table+(whereParams?'-'+whereParams[0]:'')+'.json', typeGuid, false, done);
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