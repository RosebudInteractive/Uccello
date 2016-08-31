var _parentDir = __dirname;
var _uccelloDir = _parentDir + '/../../';
var _dbPath = _parentDir + '/../../../ProtoOne/data/';
var _definitionsPath = _parentDir + '/definitions/';

var _path = {
    definitions : _definitionsPath,
    Uccello : _uccelloDir,
    DbPath : _dbPath,
    engine: __dirname + '/../../../Masaccio/wfe/',
};

var _connection = {
    USE_MSSQL_SERVER: (process.env.DB_TYPE == 'ms_sql'),

    mssql_connection: { 
        host: process.env.HOST || "SQL-SERVER", 
        port: 1435, 
        username: process.env.USER || "sa",
        password: process.env.PASSWORD !== undefined ? process.env.PASSWORD : "system",
        database: process.env.DB || "genetix_test",
        provider: "mssql",
        connection_options: {instanceName: process.env.INSTANCE || "SQLEXPRESS", requestTimeout: 0},
        provider_options: {},
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        }
    },

    mysql_connection: { 
       host: process.env.HOST || "localhost",
       username: process.env.USER || "root",
       password: process.env.PASSWORD || "1q2w3e",
       database: process.env.DB || "genetix_test",
       provider: "mysql",
       connection_options: { requestTimeout: 0 },
       provider_options: {},
       pool: {
           max: 5,
           min: 0,
           idle: 10000
       }
    },
    
    get: function() {
        return this.USE_MSSQL_SERVER ? this.mssql_connection : this.mysql_connection
    }
};



var _config = {
    dataPath: _path.DbPath,
    uccelloPath: _path.Uccello,
    webSocketServer: {port: 8082},

    needRecreateDB: false,

    dataman: {
        connection: _connection.get(),
        importData: {
            autoimport: false,
            dir: "../../ProtoOne/data/tables"
        },
        trace: {
            sqlCommands: true,
            importDir: true
        }
    },
    resman: {
        useDb: true,
        defaultProduct: 'ProtoOne',
        sourceDir: [
            {path: _path.DbPath + 'forms/', type: 'FRM'},
            {path: _path.DbPath + 'processDefinitions/', type: 'PR_DEF'}
        ]
    },
    resourceBuilder: {
        types: [
            {Code: "FRM", Name: "User Form", ClassName: "ResForm", Description: "Пользовательская форма"},
            {Code: "PR_DEF", Name: "Process Definition", ClassName: "ProcessDefinition", Description: "Определение процесса"}
        ],
        destDir : _path.DbPath + "tables/",
        formResTypeId: 1,
        productId: 2,
        currBuildId: 2
    }
};        


var _initializer = {
    getConfig : function(){
        return {
            dataPath        : _path.DbPath,
            uccelloPath     : _path.Uccello,
            webSocketServer : {port: 8082},
            masaccioPath: __dirname + '/../../../Masaccio/wfe/',

            dataman: {
                connection: { //MSSQL
                    host: "GALLO", // "SQL-SERVER"
                    port: 1435, //instanceName: "SQL2008R2"
                    username: "sa",
                    password: "",
                    database: "masaccio_test",
                    provider: "mssql",
                    connection_options: { instanceName: "SQLEXPRESS", requestTimeout: 0 },
                    provider_options: {},
                    pool: {
                        max: 5,
                        min: 0,
                        idle: 10000
                    }
                },
                //connection: { //MySql
                //    host: "localhost",
                //    username: "root",
                //    password: "1q2w3e",
                //    database: "genetix_test",
                //    provider: "mysql",
                //    connection_options: { requestTimeout: 0 },
                //    provider_options: {},
                //    pool: {
                //        max: 5,
                //        min: 0,
                //        idle: 10000
                //    },
                //},
                //importData: {
                //    autoimport: false,
                //    dir: "../../ProtoOne/data/tables"
                //},
                trace: {
                    sqlCommands: true,
                    importDir: true
                }
            },
            resman : {
                useDb : true,
                defaultProduct : 'ProtoOne',
                sourceDir: [
                    {path: _path.DbPath + '/forms/', type: 'FRM'},
                    {path: _path.DbPath + '/processDefinitions/', type: 'PR_DEF'}
                ]
            }
        };
    },

    init : function() {
        // модуль сервера
        var UccelloServ = require(_path.Uccello + 'uccelloServ');
        /**
         * Функция заглушка для аутентификации
         * @param user
         * @param pass
         * @param done
         */
        function fakeAuthenticate(user, pass, done) {
            var err = null, row = null;
            if (user.substring(0, 1) == 'u' && pass.substring(0, 1) == 'p')
                row = {user: user, user_id: 1, email: user + '@gmail.com'};
            else {
                var users = {
                    'Ivan': '123',
                    'Olivier': '123',
                    'Plato': '123'
                };
                if (users[user] && users[user] == pass) {
                    row = {user: user, user_id: 1, email: user + '@gmail.com'};
                }
            }
            done(err, row);
        }
        this.uccelloServ = new UccelloServ({authenticate: fakeAuthenticate});

        // var EngineSingleton = require(this.getConfig().masaccioPath + 'engineSingleton');
        // this.constructHolder = this.uccelloServ.pvt.constructHolder;
        // var dbc = this.uccelloServ.getUserMgr().getController();
        // EngineSingleton.initInstance({dbController : dbc, constructHolder : this.constructHolder});

        this.ResManager = this.uccelloServ.pvt.resman;
    }
};

var UccelloConfig = require(_path.Uccello + 'config/config');
UCCELLO_CONFIG = new UccelloConfig(_config);
DEBUG = true;
PATH = _path;

if (module) {
    module.exports.Path = _path;
    module.exports.Config = _initializer;
}