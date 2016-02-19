/**
 * Created by staloverov on 23.12.2015.
 */
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var should  = require('chai').should();
var expect = require('chai').expect;

var Main = require("./main");
var ResUtils = require('./../resUtils');

function execSql(sql) {
    return new Promise(function(resolve, reject) {
        $data.execSql({cmd: sql}, {}, function (result) {
            if (result.result === "OK") {
                resolve()
            } else {
                reject()
            }
        });
    })
}

before(function() {
    Main.Config.init();
});

describe('#get functions', function() {
    before(function () {
        var _cmd = [
            "update SysVersion set CurrBuildId = 2 where Id = 2",
            "delete from SysBuild where Id > 2",
            "insert into SysResType (Id, Guid, Code, Name, ClassName, ResTypeGuid, Description)\n" +
            "select (select max(Id) + 1 from SysResType),\n" +
            "       'ebc35758-ff26-44f4-83d5-5c11f54e297c'," +
            "       'TEST_TYPE',\n" +
            "       'TestType',\n" +
            "       'TestClass',\n" +
            "       '50612b0f-f828-41e4-b52c-8ffc5b319d0b',\n" +
            "       'Description'\n" +
            "  from SysResType\n" +
            " where not exists (select Code from SysResType where Code = 'TEST_TYPE')"
        ];

        return execSql(_cmd);
    });

    describe('#getResource', function () {
        it('Загрузить существующий ресурс', function (done) {
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
            }
        );

        it('Запросить несуществующий ресурс', function (done) {
            var _resManger = Main.Config.ResManager;

            _resManger.getResource('ERROR').should.be.rejectedWith(Error).notify(done);
        });
    });

    describe('#getResources', function () {
        it('Загрузка 2 ресурсов', function () {
            var _resManger = Main.Config.ResManager;

            var _promise = _resManger.getResources(['0c5e3ff0-1c87-3d99-5597-21d498a477c6', '0d6f3891-f800-9f8f-edac-53cd51792f0c']);

            return _promise.then(function (bodys) {
                Object.keys(bodys).should.have.lengthOf(2);
                bodys['0c5e3ff0-1c87-3d99-5597-21d498a477c6'].should.be.exists;
                bodys['0d6f3891-f800-9f8f-edac-53cd51792f0c'].should.be.exists;
            });
        });

        it('Загрузка несуществующих ресурсов', function (done) {
            var _resManger = Main.Config.ResManager;

            var _promise = _resManger.getResources(['ERROR1', 'ERROR2']);

            _promise.then(function (bodys) {
                Object.keys(bodys).should.have.lengthOf(2);
                expect(bodys['ERROR1']).to.be.null;
                expect(bodys['ERROR2']).to.be.null;
                done();
            }, function (error) {
                done(error);
            });
        });
    });

    describe('#getResByType', function () {
        it('Существующий тип', function () {
            return Main.Config.ResManager.getResByType('7f93991a-4da9-4892-79c2-35fe44e69083').then(
                function (resources) {
                    Object.keys(resources).should.have.lengthOf(22);
                    for (guid in resources) {
                        if (!resources.hasOwnProperty(guid)) continue;
                        resources[guid].should.be.exists
                    }
                }
            );
        });

        it('Несуществующий тип', function () {
            return Main.Config.ResManager.getResByType('ERRROR').should.be.rejectedWith(Error);
        });

        it('Пустой тип', function () {
            return Main.Config.ResManager.getResByType('50612b0f-f828-41e4-b52c-8ffc5b319d0b').then(
                function (resources) {
                    resources.should.be.empty;
                }
            );
        });
    });

    describe('#getResListByType', function () {
        it('Существующий тип', function () {
            return Main.Config.ResManager.getResListByType('7f93991a-4da9-4892-79c2-35fe44e69083').then(
                function (resources) {
                    resources.should.have.lengthOf(22);
                }
            );
        });

        it('Несуществующий тип', function () {
            return Main.Config.ResManager.getResListByType('ERRROR').should.be.rejectedWith(Error);
        });

        it('Пустой тип', function () {
            return Main.Config.ResManager.getResListByType('50612b0f-f828-41e4-b52c-8ffc5b319d0b').then(
                function (resources) {
                    resources.should.be.empty;
                }
            );
        });
    });
});

describe('#modify functions', function(){

    describe('#createNewResource', function() {

        it('Текущая сборка подверждена - Ошибка', function() {
            var _sql = 'update sysbuild\n' +
                       '   set IsConfirmed = true\n' +
                       ' where Id = (select CurrBuildId from sysversion where Id = 2)';

            var _newResource = {
                name : 'Test',
                code : 'TEST',
                description : 'Descr',
                resGuid : 'e8f21877-f3ba-4508-89bf-270a35f0361c',
                resTypeId : 1
            };

            return execSql([_sql]).then(function(){
                return Main.Config.ResManager.createNewResource(_newResource).should.be.rejected;
            });
        });

        describe('Текущая сборка не подверждена - ОК', function(){

            var _newResource = {
                name : 'Test',
                code : 'TEST',
                description : 'Descr',
                resGuid : 'e8f21877-f3ba-4508-89bf-270a35f0361c',
                resTypeId : 1
            };

            before(function(){
                var _sql = [
                    'update sysbuild\n' +
                    '   set IsConfirmed = false\n' +
                    ' where Id = (select CurrBuildId from sysversion where Id = 2)'
                    ,
                    //"delete from sysresource where ResGuid = '" + _newResource.resGuid + "'"
                    "delete br\n" +
                    "  from sysbuildres br\n" +
                    "  join sysresver rv on rv.Id = br.ResVerId\n" +
                    "  join sysresource r on r.Id = rv.ResId\n" +
                    " where r.ResGuid = '" + _newResource.resGuid + "'\n"
                    ,
                    "delete rv \n" +
                    "  from sysresver rv\n" +
                    "  join sysresource r on r.Id = rv.ResId\n" +
                    " where r.ResGuid = '" + _newResource.resGuid + "';\n"
                    ,
                    "delete from sysresource where ResGuid = '" + _newResource.resGuid + "'"
                ];

                return execSql(_sql);
            });

            it('Создание нового ресурса - ОК', function() {
                return Main.Config.ResManager.createNewResource(_newResource).then(function (result) {
                    result.should.be.exists;
                    result.result.should.be.equal('OK');
                    result.resourcesGuid.should.not.be.empty;
                });
            });

            it('Создание существующего ресурса - Ошибка', function() {
                return Main.Config.ResManager.createNewResource(_newResource).should.be.rejected;
            });

            after(function(){
                var _sql = ["delete from sysresource where ResGuid = '" + _newResource.resGuid + "'"];

                return execSql(_sql);
            });
        });

    });

    describe('#newResourceVersion', function() {

        describe('#Текущая сборка подтвержена - Ошибка', function(){
            before(function(){
                return execSql([
                    'update sysbuild\n' +
                    '   set IsConfirmed = true\n' +
                    ' where Id = (select CurrBuildId from sysversion where Id = 2)'
                ]);
            });

            it('#Создание новой версии - Ошибка', function(){
                return Main.Config.ResManager.newResourceVersion('e8f21877-f3ba-4508-89bf-270a35f0361c', 'TEST').should.be.rejected;
            })
        });

        describe('#Текущая версия не подтвержена - ОК', function(){
            before(function(){
                var _sql = [
                    'update sysbuild\n' +
                    '   set IsConfirmed = false\n' +
                    ' where Id = (select CurrBuildId from sysversion where Id = 2)'

                   //,"delete from sysresource where ResGuid = '" + _newResource.resGuid + "'"
                ];

                return execSql(_sql);
            });

            it('создание 1-ой новой версии ', function() {
                return Main.Config.ResManager.newResourceVersion('e8f21877-f3ba-4508-89bf-270a35f0361c', 'TEST').then(
                    function (result) {
                        result.should.be.exists;
                        result.result.should.be.equal('OK');
                        result.resVersionId.should.not.be.empty;
                    }
                );
            });
        });

    });

    xdescribe('#commitBuild', function() {
        it('создание Build-а', function(done) {
            var _resManger = Main.Config.ResManager;

            _resManger.commitBuild(function(result) {
                console.log(result.result);
                console.log(result.message);
                done();
            })
        });
    });

    xdescribe('#createNewBuild', function() {
        it('создание Build-а', function(done) {
            var _resManger = Main.Config.ResManager;

            _resManger.createNewBuild('Новый тестовый build', function(result) {
                console.log(result.result);
                console.log(result.message);
                done();
            })
        });
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