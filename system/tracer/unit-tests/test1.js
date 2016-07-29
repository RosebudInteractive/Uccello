/**
 * Created by staloverov on 19.07.2016.
 */
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var should  = require('chai').should();

var TraceManager = require('./../manager');
var  dateFormat = require('./../formatConvertors/dateConvertor');

var _parentDir = __dirname;
var _configFileName = _parentDir + '/testConfig.cfg';

before(function(){
    TraceManager.getInstance().loadFromFile(_configFileName);
});

describe('#main', function(){
    xit('trace source', function(done){
       // var _source =
       TraceManager.getInstance().createSource('mySource1').then(function(source) {
           for (var i = 0; i < 10000; i++) {
               source.trace({field1 : 'value : ' + i, field2 : new Date()})
           }
       }).catch(function(reason) {
           done(reason)
       });
       // var _source = TraceManager.getInstance().createSource('Error');


       var _interval = setInterval(function () {
           clearInterval(_interval);
           done();
       }, 5000)
    });

    it('dateFormat', function(){



        var now = (new Date());
        var _result = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");
        console.log(_result)
    })


});