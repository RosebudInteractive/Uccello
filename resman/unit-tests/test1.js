/**
 * Created by staloverov on 23.12.2015.
 */
var should  = require('chai').should();
var expect = require('chai').expect;

var Main = require("./main");


before(function() {
    Main.Config.init();
});

xdescribe('#init', function() {
    it('Прогрузить первоначальные данные', function(done) {
        var _resManger = Main.Config.ResManager;
        _resManger.should.be.exist;

        var _interval =  setInterval(function() {
            clearInterval(_interval);

            var _promise = _resManger.getResource('0c5e3ff0-1c87-3d99-5597-21d498a477c6');

            _promise.then(function(body) {
                console.log('body : [%s]', body);
                done();
            }, function(reason){
                console.log(reason);
                done();
            });

        }, 1000);
    });
});

describe('#getResource', function() {
    it('Прогрузить первоначальные данные', function(done) {
        var _resManger = Main.Config.ResManager;

        var _promise = _resManger.getResource('0c5e3ff0-1c87-3d99-5597-21d498a477c6');
        _promise.then(function (body) {
            console.log('body : [%s]', body);
            done();
        }, function (reason) {
            console.log(reason);
            done();
        });
    });
});

describe('#getResources', function() {
    it('Загрузка 2 ресурсов', function(done) {
        var _resManger = Main.Config.ResManager;

        //var _interval =  setInterval(function() {
        //    clearInterval(_interval);

        var _promise = _resManger.getResources(['0c5e3ff0-1c87-3d99-5597-21d498a477c6', '0d6f3891-f800-9f8f-edac-53cd51792f0c']);

        _promise.then(function (bodys) {
            console.log('body0 : [%s]', bodys['0c5e3ff0-1c87-3d99-5597-21d498a477c6']);
            console.log('body1 : [%s]', bodys['0d6f3891-f800-9f8f-edac-53cd51792f0c']);
            done();
        }, function (reason) {
            console.log(reason);
            done();
        });

        //done()
        //}, 1000);
    });
});

xdescribe('#getResByType', function() {
    it('Загрузка ресурсов по типу', function(done) {
        var _resManger = Main.Config.ResManager;

        var _interval =  setInterval(function() {
            clearInterval(_interval);

            var _promise = _resManger.getResByType('7f93991a-4da9-4892-79c2-35fe44e69083');

            _promise.then(function(resources) {
                console.log('body0 : [%s]', resources['0c5e3ff0-1c87-3d99-5597-21d498a477c6']);
                console.log('body1 : [%s]', resources['0d6f3891-f800-9f8f-edac-53cd51792f0c']);
                done();
            }, function(reason){
                console.log(reason);
                done();
            });

        }, 1000);
    });
});

xdescribe('#getResListByType', function() {
    it('Загрузка ресурсов по типу', function(done) {
        var _resManger = Main.Config.ResManager;

        var _interval =  setInterval(function() {
            clearInterval(_interval);

            var _promise = _resManger.getResListByType('7f93991a-4da9-4892-79c2-35fe44e69083');

            _promise.then(function(resources) {
                console.log('guid : [%s]', resources[0]);
                console.log('guid : [%s]', resources[1]);
                done();
            }, function(reason){
                console.log(reason);
                done();
            });

            //done()
        }, 1000);
    });
});

xdescribe('#createNewResource', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.createNewResource({name : 'Test', code : 'TEST', description : 'Descr', resGuid : 'e8f21877-f3ba-4508-89bf-270a35f0361c', resTypeId : 1}, function(result) {
            console.log(result.result);
            done();
        })
    });
});

xdescribe('#newResourceVersion', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.newResourceVersion('e8f21877-f3ba-4508-89bf-270a35f0361c', 'TEST', function(result) {
            console.log(result.result);
            done();
        });
    });
});

xdescribe('#createNewBuild', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.createNewBuild('Новый тестовый build', function(result) {
            console.log(result.result);
            done();
        })
    });
});

describe('#commitBuild', function() {
    it('создание Build-а', function(done) {
        var _resManger = Main.Config.ResManager;

        _resManger.commitBuild(function(result) {
            console.log(result.result);
            done();
        })
    });
});