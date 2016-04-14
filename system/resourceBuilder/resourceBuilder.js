/**
 * Created by staloverov on 02.02.2016.
 */
'use strict';

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

var _instance = null;

define(['fs', UCCELLO_CONFIG.uccelloPath + 'system/utils', 'crypto', './metaInfo', './sysResType'],
    function(fs, Utils, Crypto, MetaInfo, SysResType) {

        function createSysResource() {
            return {
                "$sys": {
                    "guid": Utils.guid(),
                    "typeGuid": MetaInfo.SysResource.RootGuid
                },
                "fields": {
                    "Id": 1000,
                    "Name" : MetaInfo.SysResource.RootName
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        function createSysResVer() {
            return {
                "$sys": {
                    "guid": Utils.guid(),
                    "typeGuid": MetaInfo.SysResVer.RootGuid
                },
                "fields": {
                    "Id": 1000,
                    "Name": MetaInfo.SysResVer.RootName
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        function createSysBuildRes() {
            return {
                "$sys": {
                    "guid": Utils.guid(),
                    "typeGuid": MetaInfo.SysBuildRes.RootGuid
                },
                "fields": {
                    "Id": 1000,
                    "Name": MetaInfo.SysBuildRes.RootName
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        //var Builder = UccelloClass.extend({
        var _class = class Builder{
            constructor() {
                this.checkOptions();

                this.sourceDir = UCCELLO_CONFIG.resman.sourceDir;
                this.outputDir = UCCELLO_CONFIG.resourceBuilder.destDir;
                this.productId = UCCELLO_CONFIG.resourceBuilder.productId;
                this.currBuildId = UCCELLO_CONFIG.resourceBuilder.currBuildId;

                this.sysResource = createSysResource();
                this.sysResVer = createSysResVer();
                this.sysBuildRes = createSysBuildRes();
                this.sysResType = new SysResType(UCCELLO_CONFIG.resourceBuilder.types);

                this.canBuildData = true;
            }

            checkOptions() {
                if (!UCCELLO_CONFIG.resourceBuilder) {
                    throw new Error('ResourceBuilder options not found')
                }

                if ((!UCCELLO_CONFIG.resman) ||(!UCCELLO_CONFIG.resman.sourceDir)) {
                    throw new Error('ResourceBuilder : Source directory not found')
                }

                if (!UCCELLO_CONFIG.resourceBuilder.destDir) {
                    throw new Error('ResourceBuilder : Destination directory not found')
                }

                if (!UCCELLO_CONFIG.resourceBuilder.productId) {
                    throw new Error('ResourceBuilder : ProductId not found')
                }

                if (!UCCELLO_CONFIG.resourceBuilder.currBuildId) {
                    throw new Error('ResourceBuilder : CurrentBuildId not found')
                }

                if (!UCCELLO_CONFIG.resourceBuilder.types) {
                    throw new Error('ResourceBuilder : Resource types not found')
                }

            }

            addResource(resource, resType) {
                var that = this;

                function newResourceRecord() {
                    var _name = (resource.fields.ResName || 'Undefined');
                    var _desc = (resource.fields.Title || _name);
                    return {
                        "$sys": {
                            "guid": Utils.guid(),
                            "typeGuid": MetaInfo.SysResource.ClassGuid
                        },
                        "fields": {
                            "Id": MetaInfo.SysResource.getId(),
                            "ResGuid": resource.$sys.guid,
                            "Code": _name.toUpperCase(),
                            "Name": _name,
                            "Description": resType.fields.Description + ' ' + _desc,
                            "ProdId": that.productId,
                            "ResTypeId": resType.fields.Id
                        },
                        "collections": {}
                    }
                }

                var _resource = newResourceRecord();
                this.sysResource.collections.DataElements.push(
                    _resource
                );
                return _resource.fields.Id
            }

            addResVer(resource, resId, resType) {
                var _body = JSON.stringify(resource);
                var md5sum = Crypto.createHash('md5');
                md5sum.update(_body);
                var _md5 = md5sum.digest('hex');

                function newResVerRecord() {
                    return {
                        "$sys": {
                            "guid": Utils.guid(),
                            "typeGuid": MetaInfo.SysResVer.ClassGuid
                        },
                        "fields": {
                            "Id": MetaInfo.SysResVer.getId(),
                            "ResVer": 1,
                            "Hash": _md5,
                            "ResBody": _body,
                            "Description": resType.fields.Description + ' ' + (resource.fields.Title || resource.fields.ResName),
                            "ResId": resId
                        },
                        "collections": {}
                    }
                }

                var _resVer = newResVerRecord();
                this.sysResVer.collections.DataElements.push(
                    _resVer
                );

                return _resVer.fields.Id
            }

            addBuildRes(resVerId) {
                var that = this;

                function newBuildResRecord() {
                    return {
                        "$sys": {
                            "guid": Utils.guid(),
                            "typeGuid": MetaInfo.SysBuildRes.ClassGuid
                        },
                        "fields": {
                            "Id": MetaInfo.SysBuildRes.getId(),
                            "BuildId": that.currBuildId,
                            "ResVerId": resVerId
                        },
                        "collections": {}
                    }
                }

                var _buildRes = newBuildResRecord();
                this.sysBuildRes.collections.DataElements.push(
                    _buildRes
                );

                return _buildRes.fields.Id
            }

            createResources(fileList, resTypeCode){
                var that = this;

                return new Promise(function(resolve, reject){
                    var _resType = that.sysResType.getType(resTypeCode);
                    if (!_resType) {
                        reject(new Error('Can not find resource ' + resTypeCode))
                    } else {
                        fileList.forEach(function (fileName) {
                            try {
                                var _resource = JSON.parse(fs.readFileSync(fileName, {encoding: "utf8"}));
                                var _resId = that.addResource(_resource, _resType);
                                var _resVerId = that.addResVer(_resource, _resId, _resType);
                                that.addBuildRes(_resVerId);
                            } catch (err) {
                                reject(new Error("WARNING: Problem in file: \"" + fileName +
                                    "\" : " + err.message))
                            }
                        });

                        resolve();
                    }
                })
            }

            prepare(){
                var that = this;

                return new Promise(function (resolve, reject){
                    var _handledTypesCount = 0;
                    var _errors = [];

                    function checkDone() {
                        if (_handledTypesCount == that.sourceDir.length) {
                            that.saveFiles(function(){
                                if (_errors.length == 0) {
                                    resolve()
                                } else {
                                    var _err = new Error('Resources built with errors.');
                                    _err.details = _errors.slice();

                                    reject(_err);
                                }
                            });
                        }
                    }


                    if (that.canBuildData) {
                        that.sourceDir.forEach(function(element){

                            var _list = fs.readdirSync(element.path);

                            if (_list.length != 0) {
                                _list.forEach(function(fileName, index, array){
                                    array[index] = element.path + fileName;
                                });

                                that.createResources(_list, element.type).then(
                                    function() {
                                        _handledTypesCount++;
                                        checkDone();
                                    },
                                    function(err) {
                                        _handledTypesCount++;
                                        _errors.push(err.message);
                                        checkDone();
                                    }
                                )
                            } else {
                                _handledTypesCount++;
                                _errors.push('No files to build to resource in [' + element.path + ']');
                                checkDone();
                            }
                        });
                    }
                    else {
                        reject(new Error('Can not build resources'))
                    }
                })
            }

            saveFiles (done) {
                var _typesSaved = false;
                var _resSaved = false;
                var _verSaved = false;
                var _buildSaved = false;

                function checkDone() {
                    if ((_resSaved) && (_verSaved) && (_buildSaved) && (_typesSaved)) {
                        done()
                    }
                }

                if (!fs.existsSync(this.outputDir)) {
                    fs.mkdirSync(this.outputDir)
                }

                fs.writeFile(this.outputDir + 'SysResType.json', JSON.stringify(this.sysResType.object), function(err) {
                    if (err) throw err;
                    _typesSaved = true;
                    checkDone()
                });

                fs.writeFile(this.outputDir + 'SysResource.json', JSON.stringify(this.sysResource), function(err) {
                    if (err) throw err;
                    _resSaved = true;
                    checkDone()
                });

                fs.writeFile(this.outputDir + 'SysResVer.json', JSON.stringify(this.sysResVer), function(err) {
                    if (err) throw err;
                    _verSaved = true;
                    checkDone()
                });

                fs.writeFile(this.outputDir + 'SysBuildRes.json', JSON.stringify(this.sysBuildRes), function(err) {
                    if (err) throw err;
                    _buildSaved = true;
                    checkDone()
                });
            }

            generateSourceFiles(){
                var _count = 0;
                return new Promise(function(resolve, reject) {
                    UCCELLO_CONFIG.resman.sourceDir.forEach(function(source){
                        if (source.hasOwnProperty('generator')){
                            if (fs.existsSync(source.generator)) {
                                var _generator = require(source.generator)
                            } else {
                                reject(new Error('can not found generator for ' + source.type))
                            }

                            if (_generator.hasOwnProperty('generate')) {
                                _generator.generate(source.path).then(
                                    function(){
                                        _count++;
                                        if (_count == UCCELLO_CONFIG.resman.sourceDir.length) {
                                            resolve()
                                        }
                                    },
                                    reject)
                            } else {
                                reject(new Error('can not generate ' + source.type + ' resources'))
                            }
                        } else {
                            _count++;
                            if (_count == UCCELLO_CONFIG.resman.sourceDir.length) {
                                resolve()
                            }
                        }
                    })
                })
            }

            static prepareFiles(){
                return new Promise(function(resolve, reject) {
                    getInstance().generateSourceFiles().then(
                        function(){
                            getInstance().prepare().then(resolve, reject);
                        },
                        reject
                    );
                })

            };

            static kill(){
                _instance = null;
            };
        };

        function getInstance(){
            if (!_instance) {
                _instance = new _class();
            }

            return _instance;
        }

        return _class;
    }
);