'use strict';
var Main = require('./main');
var UccelloServ = require(PATH.Uccello + 'uccelloServ');
var EngineSingleton = require(PATH.engine + 'engineSingleton');
var ExtControls = require('./extControls');

var _instance = null;
function getInstance(){
    if (!_instance) {
        _instance = new Initiator()
    }
    return _instance;
}

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

class Initiator {
    constructor(){
        this.dataLoaded = !((UCCELLO_CONFIG.dataman) && (UCCELLO_CONFIG.dataman.importData) && (UCCELLO_CONFIG.needRecreateDB));

        var uccelloServ = new UccelloServ({
            authenticate: fakeAuthenticate,
            engineSingleton: EngineSingleton
        });

        this.controlManager = EngineSingleton.getInstance().getControlManager();
        ExtControls.register(uccelloServ.pvt.constructHolder);

        GLOBAL.ResManager = uccelloServ.pvt.resman;
    }

    static importData(){
        var that = getInstance();
        return new Promise(function(resolve, reject){
            if (!that.dataLoaded) {
                $data.importDir(UCCELLO_CONFIG.dataman.importData.dir, {force: true})
                    .then(function () {
                        console.log("### Import finished !!!");
                        that.dataLoaded = true;
                        resolve()
                    })
                    .catch(function (err) {
                        reject(err);
                    });
            } else {
                resolve()
            }
        });
    }

    static getControlManager() {
        return getInstance().controlManager
    }

    static clearTestClient() {
        getInstance().testClient.clear()
    }

    static enableTestClient() {
        getInstance().testClient.enable()
    }

    static disableTestClient() {
        getInstance().testClient.disable()
    }
}

if (module) {
    module.exports = Initiator;
}