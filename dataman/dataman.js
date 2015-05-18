if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./dataRoot'],
    function(DataRoot)  {
		var Dataman = Class.extend({

			init: function(router, controller){
				this.pvt = {};
				this.pvt.router = router;
				this.pvt.controller = controller;
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
                        var time = Date.now();
                        function ddd() {
                            var timeEnd = Date.now();
                            logger.info((new Date()).toISOString()+';readCompanyFile;'+(timeEnd-time));
                            done.apply(this, arguments)
                        }
                        this.getCompany(gr, 10000, ddd);
                        break;
                    case UCCELLO_CONFIG.guids.rootContact:
                        this.getContact(gr, expression, done);
                        break;
                    case UCCELLO_CONFIG.guids.rootContract:
                        this.getContract(gr, expression, done);
                        break;
                    case UCCELLO_CONFIG.guids.rootAddress:
                        this.getAddress(gr, expression, done);
                        break;
                    case UCCELLO_CONFIG.guids.rootLead:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataLead, 'lead', done);
                        break;
                    case UCCELLO_CONFIG.guids.rootIncomeplan:
                        this.getList(gr, UCCELLO_CONFIG.classGuids.DataIncomeplan, 'incomeplan', done, 'leadId=?', [expression]);
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

                        /*if (table == 'incomeplan') {
                            var fs = require('fs');
                            fs.writeFile(UCCELLO_CONFIG.dataPath + 'tables/incomeplan-'+whereParams[0]+'.json', JSON.stringify(result), function(err) {
                                if(err) {
                                    console.log(err);
                                } else {
                                    console.log("The file was saved!");
                                }
                            });
                        }*/
                        done(result);
                    });
                } else
                    this.readTableFile(table+(whereParams?'-'+whereParams[0]:'')+'.json', guidRoot, typeGuid, false, done);
                return "XXX";
            },

            getCompany: function(guidRoot, num, done) {
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();
                    var time = Date.now();
                    conn.query('SELECT * FROM company LIMIT ?', [num?num:0], function(err, rows) {
                        var timeEnd = Date.now();
                        logger.info((new Date()).toISOString()+';selectCompany;'+(timeEnd-time));
                        if (err) throw err;
                        time = Date.now();
                        var result = that.createResult(guidRoot, UCCELLO_CONFIG.classGuids.DataCompany, rows);
                        var timeEnd = Date.now();
                        logger.info((new Date()).toISOString()+';createResult;'+(timeEnd-time));
                        done(result);
                    });
                } else
                    this.readTableFile('company.json', guidRoot, UCCELLO_CONFIG.classGuids.DataCompany, false, done);
				return "XXX";
            },

            getContact: function(guidRoot, expression, done){
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();
                    conn.query('SELECT * FROM contact WHERE parent=?', [expression], function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, UCCELLO_CONFIG.classGuids.DataContact, rows);
                        done(result);
                    });
                } else
                    this.readTableFile('contact-'+expression+'.json', guidRoot, UCCELLO_CONFIG.classGuids.DataContact, expression, done);
            },

            getContract: function(guidRoot, expression, done){
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();
                    conn.query('SELECT * FROM contract WHERE parent=?', [expression], function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, UCCELLO_CONFIG.classGuids.DataContract, rows);
                        done(result);
                    });
                } else
                    this.readTableFile('contract-'+expression+'.json', guidRoot, UCCELLO_CONFIG.classGuids.DataContract, expression, done);
            },

            getAddress: function(guidRoot, expression, done){
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();
                    conn.query('SELECT * FROM address WHERE parent=?', [expression], function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, UCCELLO_CONFIG.classGuids.DataAddress, rows);
                        done(result);
                    });
                } else
                    this.readTableFile('address-'+expression+'.json', guidRoot, UCCELLO_CONFIG.classGuids.DataAddress, expression, done);
            }

        });
		return Dataman;
	}
);