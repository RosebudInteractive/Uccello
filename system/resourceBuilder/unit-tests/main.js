/**
 * Created by staloverov on 28.05.2015.
 */
var _parentDir = __dirname;
var _uccelloDir = _parentDir + '/../../../';
var _dbPath = _parentDir + '/../../../../ProtoOne/data/';
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

            resourceBuilder : {
                types: [
                    {Code: "FRM", Name: "User Form", ClassName: "Form", Description: "Пользовательская форма", Guid : "7f93991a-4da9-4892-79c2-35fe44e69083"},
                    {Code: "TEST", Name: "Test Type", ClassName: "Test", Description: "Тестовый тип", Guid : "7c516850-9c5b-4f51-9d2b-a51db4f4a554"}
                ],
                sourceDir: [
                    {path: _parentDir + '/../sourceFolder/FRM', type: 'FRM'},
                    {path: _parentDir + '/../sourceFolder/TEST', type: 'TEST'}
                ],
                destDir: './testFiles/',
                productId: 2,
                currBuildId: 2
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