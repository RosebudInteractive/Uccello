/**
 * Created by staloverov on 23.12.2015.
 */
var should  = require('chai').should();
var expect = require('chai').expect;

var Main = require("./main");
var Builder = require('./../resourceBuilder');


before(function() {
    Main.Config.init();
});

describe('#init', function() {
    it('Прогрузить первоначальные данные', function(done) {
        Builder.prepareFiles(function(message) {
            console.log(message);
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