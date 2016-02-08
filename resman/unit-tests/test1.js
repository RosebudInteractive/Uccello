/**
 * Created by staloverov on 23.12.2015.
 */
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var should  = require('chai').should();
var expect = require('chai').expect;

var Main = require("./main");


before(function() {
    Main.Config.init();
});

describe('#getResource', function() {
    it('Загрузить существующий ресурс', function(done) {
        $data.execSql({
            cmd : "update SysVersion set CurrBuildId = 2 where Id = 2;" +
            "delete from SysBuild where Id > 2"
            //dialect: {
            //    mysql: "update sysproduct set description=concat('xxx ',description) where id=1",
            //    mssql: "update sysproduct set description='xxx '+description where id=1"
            //}
        }, {}, function (result) {
            if (result.result !== "OK") {
                done(new Error(result.message));
            }
        });

        var _resManger = Main.Config.ResManager;

        _resManger.getResource('0c5e3ff0-1c87-3d99-5597-21d498a477c6').then(
            function (body) {
                body.should.be.exist;
                var _resource = JSON.parse(body);
                _resource.fields.should.be.exists;
                _resource.fields.Name.should.be.equal('MainForm');
                done();
            }, function (reason) {
                done(reason);
            });
        //_resManger.getResource('0c5e3ff0-1c87-3d99-5597-21d498a477c6').should.be.fulfilled.notify(done);
    });
});

describe('#getResources', function() {
    it('Загрузка 2 ресурсов', function(done) {
        var _resManger = Main.Config.ResManager;

        var _promise = _resManger.getResources(['0c5e3ff0-1c87-3d99-5597-21d498a477c6', '0d6f3891-f800-9f8f-edac-53cd51792f0c']);

        _promise.then(function (bodys) {
            console.log('body0 : [%s]', bodys['0c5e3ff0-1c87-3d99-5597-21d498a477c6']);
            console.log('body1 : [%s]', bodys['0d6f3891-f800-9f8f-edac-53cd51792f0c']);
            done();
        }, function (reason) {
            console.log(reason);
            done();
        });
    });
});

describe('#getResByType', function() {
    it('Загрузка ресурсов по типу', function(done) {
        var _resManger = Main.Config.ResManager;

        var _promise = _resManger.getResByType('7f93991a-4da9-4892-79c2-35fe44e69083');

        _promise.then(function (resources) {
            console.log('body0 : [%s]', resources['0c5e3ff0-1c87-3d99-5597-21d498a477c6']);
            console.log('body1 : [%s]', resources['0d6f3891-f800-9f8f-edac-53cd51792f0c']);
            done();
        }, function (reason) {
            console.log(reason);
            done();
        });
    });
});

describe('#getResListByType', function() {
    it('Загрузка ресурсов по типу', function(done) {
        var _resManger = Main.Config.ResManager;

        var _promise = _resManger.getResListByType('7f93991a-4da9-4892-79c2-35fe44e69083');

        _promise.then(function (resources) {
            console.log('guid : [%s]', resources[0]);
            console.log('guid : [%s]', resources[1]);
            done();
        }, function (reason) {
            console.log(reason);
            done();
        });
    });
});

describe('#createNewResource', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.createNewResource({name : 'Test', code : 'TEST', description : 'Descr', resGuid : 'e8f21877-f3ba-4508-89bf-270a35f0361c', resTypeId : 1}, function(result) {
            console.log(result.result);
            console.log(result.message);
            done();
        })
    });
});

describe('#newResourceVersion', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.newResourceVersion('e8f21877-f3ba-4508-89bf-270a35f0361c', 'TEST', function(result) {
            console.log(result.result);
            console.log(result.message);
            done();
        });
    });
});

describe('#commitBuild', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.commitBuild(function(result) {
            console.log(result.result);
            console.log(result.message);
            done();
        })
    });
});

describe('#createNewBuild', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.createNewBuild('Новый тестовый build', function(result) {
            console.log(result.result);
            console.log(result.message);
            done();
        })
    });
});



/*$data.execSql({
    cmd : "select * from sysproduct",
    //dialect: {
    //    mysql: "update sysproduct set description=concat('xxx ',description) where id=1",
    //    mssql: "update sysproduct set description='xxx '+description where id=1"
    //}
}, {}, function (result) {
    if (result.result === "OK") {
        console.log(JSON.stringify(result));
    }
    else
        throw new Error(result.message);
});*/