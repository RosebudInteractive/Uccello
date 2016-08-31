var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var should  = require('chai').should();
var Types = require('./../common/types');

var TraceManager = require('./../manager');
var _parentDir = __dirname;
var _configFileName = _parentDir + '/testConfig.cfg';

before(function(){
    TraceManager.getInstance().loadFromFile(_configFileName);
});

describe('#main', function(){
    it('trace source', function(done){
       TraceManager.getInstance().createSource('mySource').then(function(source) {
           for (var i = 0; i < 10000; i++) {
               var _date = new Date();
               // var _promise = new Promise(function (resolve, reject) {
               //     if (i % 100 == 0) {
               //         reject(new Error('test error'))
               //     } else {
               //         resolve({number: i, field1: i.toString(), field2: _date, timeStamp: _date})
               //     }
               // });


               // source.trace({number : i, field1 : i.toString(), field2 : _date}, true)
               source.trace({eventType: Types.TraceEventType.Information}, function () {
                   return new Promise(function (resolve, reject) {
                       if (i % 100 == 0) {
                           reject(new Error('test error'))
                       } else {
                           resolve({number: i, field1: i.toString(), field2: _date, timeStamp: _date})
                       }
                   })
               }, true)
           }
       }).catch(function(reason) {
           done(reason)
       });

       var _interval = setInterval(function () {
           clearInterval(_interval);
           done();
       }, 5000)
    });
});