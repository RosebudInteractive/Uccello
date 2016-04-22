/**
 * Created by staloverov on 28.05.2015.
 */
var _parentDir = __dirname;
var _uccelloDir = _parentDir + '/../../';
var _dbPath = _parentDir + '/../../../ProtoOne/data/';
var _definitionsPath = _parentDir + '/definitions/';

var _path = {
    definitions : _definitionsPath,
    Uccello : _uccelloDir,
    DbPath : _dbPath
};


var _initializer = {
    getConfig : function(){
        return {
            dataPath        : _path.DbPath,
            uccelloPath     : _path.Uccello,
            webSocketServer : {port: 8082},
            masaccioPath: __dirname + '/../../../Masaccio/wfe/',

            dataman: {
                //connection: { //MSSQL
                //    host: "GALLO", // "SQL-SERVER"
                //    port: 1435, //instanceName: "SQL2008R2"
                    //username: "sa",
                    //password: "",
                    //database: "genetix_test",
                    //provider: "mssql",
                    //connection_options: { instanceName: "SQLEXPRESS", requestTimeout: 0 },
                    //provider_options: {},
                    //pool: {
                    //    max: 5,
                    //    min: 0,
                    //    idle: 10000
                    //}
                //},
                connection: { //MySql
                    host: "localhost",
                    username: "sa",
                    password: "1q2w3e",
                    database: "genetix_test",
                    provider: "mysql",
                    connection_options: { requestTimeout: 0 },
                    provider_options: {},
                    pool: {
                        max: 5,
                        min: 0,
                        idle: 10000
                    },
                },
                importData: {
                    autoimport: false,
                    dir: "../../ProtoOne/data/tables"
                },
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

        var EngineSingleton = require(this.getConfig().masaccioPath + 'engineSingleton');
        this.constructHolder = this.uccelloServ.pvt.constructHolder;
        var dbc = this.uccelloServ.getUserMgr().getController();
        EngineSingleton.initInstance({dbController : dbc, constructHolder : this.constructHolder});

        this.ResManager = this.uccelloServ.pvt.resman;
    }
};

var UccelloConfig = require(_path.Uccello + 'config/config');
UCCELLO_CONFIG = new UccelloConfig(_initializer.getConfig());
DEBUG = true;
PATH = _path;

if (module) {
    module.exports.Path = _path;
    module.exports.Config = _initializer;
}