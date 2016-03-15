/**
 * Created by staloverov on 23.12.2015.
 */
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var should  = require('chai').should();
var Main = require("./main");
var Builder = require('./../resourceBuilder');
var fs = require('fs');

deleteFolderRecursive = function(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

var rmdirAsync = function(path, callback) {
    fs.readdir(path, function(err, files) {
        if(err) {
            // Pass the error on to callback
            callback(err, []);
            return;
        }
        var wait = files.length,
            count = 0,
            folderDone = function(err) {
                count++;
                // If we cleaned out all the files, continue
                if( count >= wait || err) {
                    fs.rmdir(path,callback);
                }
            };
        // Empty directory to bail early
        if(!wait) {
            folderDone();
            return;
        }

        // Remove one or more trailing slash to keep from doubling up
        path = path.replace(/\/+$/,"");
        files.forEach(function(file) {
            var curPath = path + "/" + file;
            fs.lstat(curPath, function(err, stats) {
                if( err ) {
                    callback(err, []);
                    return;
                }
                if( stats.isDirectory() ) {
                    rmdirAsync(curPath, folderDone);
                } else {
                    fs.unlink(curPath, folderDone);
                }
            });
        });
    });
};

var correctConfig = UCCELLO_CONFIG;

before(function() {
    Main.Config.init();
});

describe('#init', function(){

    beforeEach(function(){
        UCCELLO_CONFIG = {}
    });

    afterEach(function() {
        Builder.kill();
        UCCELLO_CONFIG = Main.Config.getConfig();
    });

    it('Не найдена секция ResourceBuilder', function(done){
        Builder.prepareFiles().then(
            function(){done(new Error('must be rejected'))},
            function(err){
                if (!err) {
                    done('No defined error')
                }
                err.message.should.be.equal('ResourceBuilder options not found');
                done();
            }
        );
    });

    it('Не найдена настройка Source directory', function(){
        UCCELLO_CONFIG.resourceBuilder = {};
        UCCELLO_CONFIG.resman = {};

        return Builder.prepareFiles().should.be.rejectedWith('ResourceBuilder : Source directory not found');
    });

    it('Не найдена настройка Destination directory', function(){
        UCCELLO_CONFIG.resourceBuilder = {};
        UCCELLO_CONFIG.resman = {sourceDir : [{path: './forms/', type: 'FRM'}]};
        UCCELLO_CONFIG.resourceBuilder.sourceDir = './emptyFolder';

        return Builder.prepareFiles().should.be.rejectedWith('ResourceBuilder : Destination directory not found');
    });

    it('Не найдена настройка ProductId', function(){
        UCCELLO_CONFIG.resourceBuilder = {};
        UCCELLO_CONFIG.resourceBuilder.sourceDir = './emptyFolder';
        UCCELLO_CONFIG.resourceBuilder.destDir = './testFolder';
        UCCELLO_CONFIG.resman = {sourceDir : [{path: './forms/', type: 'FRM'}]};

        return Builder.prepareFiles().should.be.rejectedWith('ResourceBuilder : ProductId not found');
    });

    it('Не найдена настройка CurrentBuildId', function() {
        UCCELLO_CONFIG.resourceBuilder = {};
        UCCELLO_CONFIG.resourceBuilder.sourceDir = './emptyFolder';
        UCCELLO_CONFIG.resourceBuilder.destDir = './testFolder';
        UCCELLO_CONFIG.resourceBuilder.productId = 2;
        UCCELLO_CONFIG.resman = {sourceDir : [{path: './forms/', type: 'FRM'}]};

        return Builder.prepareFiles().should.be.rejectedWith('ResourceBuilder : CurrentBuildId not found');
    });

    it('Не найдена секция Types', function(){
        UCCELLO_CONFIG.resourceBuilder = {};
        UCCELLO_CONFIG.resourceBuilder.sourceDir = './emptyFolder';
        UCCELLO_CONFIG.resourceBuilder.destDir = './testFolder';
        UCCELLO_CONFIG.resourceBuilder.productId = 2;
        UCCELLO_CONFIG.resourceBuilder.currBuildId = 2;
        UCCELLO_CONFIG.resman = {sourceDir : [{path: './forms/', type: 'FRM'}]};

        return Builder.prepareFiles().should.be.rejectedWith('ResourceBuilder : Resource types not found');
    });
});

describe('#Static method prepareFiles', function() {
    before(function(){
        UCCELLO_CONFIG = correctConfig;
    });

    beforeEach(function(done){
        if (fs.existsSync(UCCELLO_CONFIG.resourceBuilder.destDir)) {
            rmdirAsync(UCCELLO_CONFIG.resourceBuilder.destDir, done);
        } else {
            done()
        }
    });

    afterEach(function() {
        Builder.kill()
    });

    after(function(){
        deleteFolderRecursive('./emptyFolder');
    });

    it('Создать файлы', function () {
        return Builder.prepareFiles().then(
            function(){
                fs.readdir(UCCELLO_CONFIG.resourceBuilder.destDir, function(err, files)
                {
                    if (!err) {
                        files.length.should.be.equal(4);
                        files.forEach(function(fileName){
                            fs.statSync(UCCELLO_CONFIG.resourceBuilder.destDir + '/' + fileName).
                                size.should.be.greaterThan(0)
                        });
                    }
                });
            }
        );
    });

    it('Вернуть ошибку "Нет файлов"', function () {
        deleteFolderRecursive('./emptyFolder');
        fs.mkdirSync('./emptyFolder');
        UCCELLO_CONFIG.resman.sourceDir = [{path : './emptyFolder', type : 'FRM'}];

        return Builder.prepareFiles().should.be.rejectedWith('Resources built with errors')
    });
});
