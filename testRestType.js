/**
 * Created by staloverov on 13.01.2016.
 */
var UccelloServ = require('./uccelloServ');
var ControlMgr = require('./controls/controlMgr');

var _config = {
    dataPath        : _path.DbPath,
    uccelloPath     : _path.Uccello,
    webSocketServer : {port: 8082},

    dataman: {
        connection: { //MSSQL
            host: "GALLO", // "SQL-SERVER"
            //port: 1435, //instanceName: "SQL2008R2"
            username: "sa",
            password: "",
            database: "genetix_test",
            provider: "mssql",
            connection_options: { instanceName: "SQLEXPRESS" },
            provider_options: {},
            pool: {
                max: 5,
                min: 0,
                idle: 10000
            }
        },
        importData: {
            autoimport: false,
            dir: "../ProtoOne/data/tables"
        },
        trace: {
            sqlCommands: true,
            importDir: true
        }
    }
};

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

UCCELLO_CONFIG = new UccelloConfig(_config);
var _uccelloServ = new UccelloServ({authenticate: fakeAuthenticate});

var _dbParams = {
    name: "ResourceManager",
    kind: "master",
    guid: "c76362cf-5f15-4aa4-8ee2-4a6e242dca51",
    constructHolder: _uccelloServ.pvt.constructHolder
};

var _db = new ControlMgr({ controller: _uccelloServ.getUserMgr().getController(), dbparams: _dbParams },
    null, null, null, _uccelloServ.pvt.proxyServer);

var Predicate = require('./predicate/predicate');

var _predicate = new Predicate(_db, {});
_predicate.addCondition({field: "ResTypeGuid", op: "=", value: typeGuid});
var _expression = {
    model: {name: "SysResType"},
    predicate: _db.serialize(_predicate)
};

_db.getRoots(["d53fa310-a5ce-4054-97e0-c894a03d3719"], { rtype: "data", expr: _expression }, function(guids) {
    _db.getObj(guids.guids[0]).getCol('DataElements');
});