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

            dataman: {
                //connection: { //MSSQL
                //    host: "GALLO", // "SQL-SERVER"
                //    port: 1435, //instanceName: "SQL2008R2"
                //    username: "sa",
                //    password: "",
                //    database: "resmanager_test",
                //    provider: "mssql",
                //    connection_options: { instanceName: "SQLEXPRESS" },
                //    provider_options: {},
                //    pool: {
                //        max: 5,
                //        min: 0,
                //        idle: 10000
                //    }
                //},
                connection: { //MySql
                    host: "localhost",
                    username: "sa",
                    password: "system",
                    database: "resmanager_test",
                    provider: "mysql",
                    connection_options: {},
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
                defaultProduct : 'ProtoOne'
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
        this.ResManager = this.uccelloServ.pvt.resman;
        //this.constructHolder = uccelloServ.pvt.constructHolder;
        //
        //var dbc = uccelloServ.getUserMgr().getController();
        //
        //var EngineSingleton = require(_path.engine + 'engineSingleton');
        //EngineSingleton.initInstance({dbController : dbc, constructHolder : this.constructHolder});
        //this.controlManager = EngineSingleton.getInstance().getControlManager();
        //
        //var TestClient = require('./../test/testClient');
        //this.testClient = new TestClient();
        //var that = this;
        //EngineSingleton.getInstance().notifier.registerObserver(that.testClient, that.testClient.handleNewRequest);
    },

    getControlManager : function() {
        if (!this.controlManager) {this.init()}
        return this.controlManager
    },

    initServer : function() {
        var EngineSingleton = require(_path.engine + 'engineSingleton');

        if (!EngineSingleton.getInstance()) {
            this.init();
        }
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