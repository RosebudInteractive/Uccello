/**
 * Created by staloverov on 23.12.2015.
 */
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var should  = require('chai').should();
var expect = require('chai').expect;

var Main = require("./main");

function execSql(sql) {
    return new Promise(function(resolve, reject) {
        $data.execSql({cmd: sql}, {}, function (result) {
            if (result.result === "OK") {
                resolve()
            } else {
                reject(new Error(result.message))
            }
        });
    })
}

before(function() {
    Main.Config.init();
});

xdescribe('#loadRes', function(){
    xdescribe('Работа с файлами', function(){
        it('Загрузить смешанный массив - EXCEPT', function(done){

        });

        it('Загрузить массив Guid - OK', function(done){})
    });

    it('Загрузить смешанный массив - OK', function(done){
        var _resManger = Main.Config.ResManager;
        var _guids = [
            '4a4abdb4-3e3b-85a7-09b9-5f15b4b187f9',
            {resType : '10217b8e-b1f8-4221-a419-f20735219dd2', resName : 'crm-edit'},
            {resType : '10217b8e-b1f8-4221-a419-f20735219dd2', resName : 'crm-list'}
        ];

        _resManger.loadRes(_guids, function(result) {
            result.datas.should.be.lengthOf(2);
            done();
        })
    })
});

describe('#rebuildResources', function(){
    it('Пересохранить ресурсы - OK', function(done){
        Main.Config.ResManager.rebuildResources().
        then(function(){
            // check
            done()
        }).
        catch(function(err){
            done(err)
        })
    })
});

xdescribe('#get functions', function() {
    before(function () {
        var _cmd = [
            "update SysVersion set CurrBuildId = 2 where Id = 2",
            "delete from SysBuild where Id > 2",
            "insert into SysResType (Id, Guid, GuidVer, TypeId, Code, Name, ClassName, ResTypeGuid, Description)\n" +
            "select (select max(Id) + 1 from SysResType),\n" +
            "       'ebc35758-ff26-44f4-83d5-5c11f54e297c',\n" +
            "       '27a94bee-5f04-4d54-92cf-856845ed6cc7',\n" +
            "       6,\n" +
            "       'TEST_TYPE',\n" +
            "       'TestType',\n" +
            "       'TestClass',\n" +
            "       '50612b0f-f828-41e4-b52c-8ffc5b319d0b',\n" +
            "       'Description'\n" +
            " where not exists (select Code from SysResType where Code = 'TEST_TYPE')"
        ];

        return execSql(_cmd);
    });

    describe('#getResource', function () {
        it('Загрузить существующий ресурс', function () {
                return Main.Config.ResManager.getResource('0c5e3ff0-1c87-3d99-5597-21d498a477c6').then(
                    function (object) {
                        object.should.be.exist;
                        object.body.should.be.exist;
                        object.id.should.be.at.least(0)
                        var _resource = JSON.parse(object.body);
                        _resource.fields.should.be.exists;
                        _resource.fields.ResName.should.be.equal("company-list");
                    });
            }
        );

        it('Запросить несуществующий ресурс', function () {
            return Main.Config.ResManager.getResource('ERROR').should.be.rejectedWith(Error);
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
            return Main.Config.ResManager.getResByType('10217b8e-b1f8-4221-a419-f20735219dd2').then(
                function (resources) {
                    Object.keys(resources).should.have.lengthOf(24);
                    for (var element in resources) {
                        if (!resources.hasOwnProperty(element)) continue;
                        resources[element].should.be.exists;
                        resources[element].body.should.be.exists;
                    }
                }
            );
        });

        it('Несуществующий тип', function () {
            return Main.Config.ResManager.getResByType('ERRROR').should.be.rejectedWith('No such resource type');
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
            return Main.Config.ResManager.getResListByType('10217b8e-b1f8-4221-a419-f20735219dd2').then(
                function (resources) {
                    resources.should.have.lengthOf(24);
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

xdescribe('#modify functions', function(){

    describe('#createNewResource', function() {

        it('Текущая сборка подверждена - Ошибка', function() {
            var _sql = 'update sysbuild\n' +
                       '   set IsConfirmed = 1\n' +
                       ' where Id = (select CurrBuildId from sysversion where Id = 2)';

            var _newResource = {
                name : 'Test',
                code : 'TEST',
                description : 'Текущая сборка подверждена - Ошибка',
                resGuid : 'e8f21877-f3ba-4508-89bf-270a35f0361c',
                resTypeId : 1
            };

            return execSql([_sql]).then(function(){
                return Main.Config.ResManager.createNewResource(_newResource).should.be.rejected;
            });
        });

        describe('#Текущая сборка не подверждена - ОК', function(){

            var _newResource = {
                name : 'Test',
                code : 'TEST',
                description : 'Текущая сборка не подверждена - ОК',
                resGuid : 'e8f21877-f3ba-4508-89bf-270a35f0361c',
                resTypeId : 1
            };

            before(function(){
                var _sql = [
                    'update sysbuild\n' +
                    '   set IsConfirmed = 0\n' +
                    ' where Id = (select CurrBuildId from sysversion where Id = 2)'
                    ,
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
                    result.resourceGuid.should.not.be.empty;
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
                    '   set IsConfirmed = 1\n' +
                    ' where Id = (select CurrBuildId from sysversion where Id = 2)'
                ]);
            });

            it('#Создание новой версии - Ошибка', function(){
                return Main.Config.ResManager.newResourceVersion('e8f21877-f3ba-4508-89bf-270a35f0361c', 'TEST').should.be.rejected;
            })
        });

        describe('#Текущая версия не подтвержена - ОК', function(){

            var _newResource = {
                name : 'Test',
                code : 'TEST',
                description : 'Текущая версия не подтвержена - ОК',
                resGuid : 'e8f21877-f3ba-4508-89bf-270a35f0361c',
                resTypeId : 1
            };

            before(function() {
                var _sql = [
                    'update sysbuild\n' +
                    '   set IsConfirmed = 0\n' +
                    ' where Id = (select CurrBuildId from sysversion where Id = 2)'

                    , "delete from sysresource where ResGuid = '" + _newResource.resGuid + "'"
                ];

                return execSql(_sql).then(function(){
                    return Main.Config.ResManager.createNewResource(_newResource);
                });
            });

            it('создание 1-ой новой версии ', function() {
                return Main.Config.ResManager.newResourceVersion('e8f21877-f3ba-4508-89bf-270a35f0361c', 'TEST').then(
                    function (result) {
                        result.should.be.exists;
                        result.result.should.be.equal('OK');
                        result.resVersionId.should.not.be.empty;
                    }
                )
            });

            after(function(){
                var _sql = ["delete from sysresource where ResGuid = '" + _newResource.resGuid + "'"];

                return execSql(_sql);
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
