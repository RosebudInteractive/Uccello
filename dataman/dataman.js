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
                switch (guidRoot) {
                    case 'ab573a02-b888-b3b4-36a7-38629a5fe6b7':
                        this.getCompany(guidRoot, 10000, done);
                        break;
                    case 'b49d39c9-b903-cccd-7d32-b84beb1b76dc':
                        this.getContact(guidRoot, expression, done);
                        break;
                    case '8583ee1d-6936-19da-5ef0-9025fb7d1d8d':
                        this.getContract(guidRoot, expression, done);
                        break;
                    case 'edca46bc-3389-99a2-32c0-a59665fcb6a7':
                        this.getAddress(guidRoot, expression, done);
                        break;
                    case 'c170c217-e519-7c23-2811-ff75cd4bfe81':
                        this.getList(guidRoot, '86c611ee-ed58-10be-66f0-dfbb60ab8907', 'lead', done);
                        break;
                    case '8770f400-fd42-217c-90f5-507ca52943c2':
                        this.getList(guidRoot, '56cc264c-5489-d367-1783-2673fde2edaf', 'incomeplan', done, 'leadId=?', [expression]);
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
                    conn.query('SELECT * FROM company LIMIT ?', [num?num:0], function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, "59583572-20fa-1f58-8d3f-5114af0f2c51", rows);
                        done(result);
                    });
                } else
                    this.readTableFile('company.json', guidRoot, "59583572-20fa-1f58-8d3f-5114af0f2c51", false, done);
				return "XXX";
            },

            getContact: function(guidRoot, expression, done){
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();
                    conn.query('SELECT * FROM contact WHERE parent=?', [expression], function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, "73596fd8-6901-2f90-12d7-d1ba12bae8f4", rows);
                        done(result);
                    });
                } else
                    this.readTableFile('contact-'+expression+'.json', guidRoot, "73596fd8-6901-2f90-12d7-d1ba12bae8f4", expression, done);
            },

            getContract: function(guidRoot, expression, done){
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();
                    conn.query('SELECT * FROM contract WHERE parent=?', [expression], function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, "08a0fad1-d788-3604-9a16-3544a6f97721", rows);
                        done(result);
                    });
                } else
                    this.readTableFile('contract-'+expression+'.json', guidRoot, "08a0fad1-d788-3604-9a16-3544a6f97721", expression, done);
            },

            getAddress: function(guidRoot, expression, done){
                var source = this.getDataSource();
                var that = this;
                if (source == 'mysql') {
                    var conn = this.getMysqlConnection();
                    conn.query('SELECT * FROM address WHERE parent=?', [expression], function(err, rows) {
                        if (err) throw err;
                        var result = that.createResult(guidRoot, "16ec0891-1144-4577-f437-f98699464948", rows);
                        done(result);
                    });
                } else
                    this.readTableFile('address-'+expression+'.json', guidRoot, "16ec0891-1144-4577-f437-f98699464948", expression, done);
            }

        });
		return Dataman;
	}
);