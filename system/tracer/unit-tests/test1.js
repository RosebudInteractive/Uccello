/**
 * Created by staloverov on 19.07.2016.
 */
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var should  = require('chai').should();

var TraceManager = require('./../manager');
var _parentDir = __dirname;
var _configFileName = _parentDir + '/testConfig.cfg';

before(function(){
    TraceManager.getInstance().loadFromFile(_configFileName);
});

describe('#main', function(){
    it('trace source', function(done){
       TraceManager.getInstance().createSource('mySource1').then(function(source) {
           for (var i = 0; i < 10000; i++) {
               var _date = new Date();

               source.trace({number : i, field1 : i.toString(), field2 : _date})
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