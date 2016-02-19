/**
 * Created by staloverov on 02.02.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

var _instance = null;

define(['fs', UCCELLO_CONFIG.uccelloPath + 'system/utils', 'crypto', './metaInfo', './sysResType'],
    function(fs, Utils, Crypto, MetaInfo, SysResType) {

        //const metaInfo = {
        //    SysResource : {
        //        ClassGuid : 'dc156f00-52bd-46ca-98e8-0ac6967ffd44',
        //        RootName : 'RootSysResource',
        //        RootGuid : '866db0f5-d312-4c10-9313-07d1c3fd352b',
        //        currentId : 0,
        //        getId : function(){
        //            this.currentId++;
        //            return this.currentId;
        //        }
        //    },
        //    SysResVer : {
        //        ClassGuid : 'a44a2754-a231-45e8-b483-afd57144a629',
        //        RootName : 'RootSysResVer',
        //        RootGuid : 'be4cc757-4cba-4046-8206-723618242f7c',
        //        currentId : 0,
        //        getId : function(){
        //            this.currentId++;
        //            return this.currentId;
        //        }
        //    },
        //    SysBuildRes : {
        //        ClassGuid : '039c1cb9-0fdf-49e9-8bb9-e720aa9fe9d1',
        //        RootName : 'RootSysBuildRes',
        //        RootGuid : 'e610fea3-5b38-44b5-aeab-e2d5fa084759',
        //        currentId : 0,
        //        getId : function(){
        //            this.currentId++;
        //            return this.currentId;
        //        }
        //    }
        //};

        function createSysResource() {
            return {
                "$sys": {
                    "guid": Utils.guid(), //"c170c217-e519-7c23-2811-ff75cd4bfe81",
                    "typeGuid": MetaInfo.SysResource.RootGuid //"866db0f5-d312-4c10-9313-07d1c3fd352b"
                },
                "fields": {
                    "Id": 1000,
                    "Name" : MetaInfo.SysResource.RootName //"RootSysResource"
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        function createSysResVer() {
            return {
                "$sys": {
                    "guid": Utils.guid(), //"c170c217-e519-7c23-2811-ff75cd4bfe81",
                    "typeGuid": MetaInfo.SysResVer.RootGuid,//"be4cc757-4cba-4046-8206-723618242f7c"
                },
                "fields": {
                    "Id": 1000,
                    "Name": MetaInfo.SysResVer.RootName //"RootSysResVer"
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        function createSysBuildRes() {
            return {
                "$sys": {
                    "guid": Utils.guid(), //"85dfcac5-e37a-4dd7-8f22-957c77251870",
                    "typeGuid": MetaInfo.SysBuildRes.RootGuid//"e610fea3-5b38-44b5-aeab-e2d5fa084759"
                },
                "fields": {
                    "Id": 1000,
                    "Name": MetaInfo.SysBuildRes.RootName //"RootSysBuildRes"
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        var Builder = UccelloClass.extend({
            init : function() {
                this.checkOptions();

                this.sourceDir = UCCELLO_CONFIG.resourceBuilder.sourceDir;
                this.outputDir = UCCELLO_CONFIG.resourceBuilder.destDir;
                this.productId = UCCELLO_CONFIG.resourceBuilder.productId;
                this.currBuildId = UCCELLO_CONFIG.resourceBuilder.currBuildId;

                this.sysResource = createSysResource();
                this.sysResVer = createSysResVer();
                this.sysBuildRes = createSysBuildRes();
                this.sysResType = new SysResType(UCCELLO_CONFIG.resourceBuilder.types);

                this.canBuildData = true;
            },

            checkOptions : function() {
                if (!UCCELLO_CONFIG.resourceBuilder) {
                    throw new Error('ResourceBuilder options not found')
                }

                if (!UCCELLO_CONFIG.resourceBuilder.sourceDir) {
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

            },

            addResource: function (resource, resType) {
                var that = this;

                function newResourceRecord() {
                    var _name = (resource.fields.dbgName || resource.fields.Name);
                    var _desc = (resource.fields.Title || resource.fields.Name);
                    return {
                        "$sys": {
                            "guid": Utils.guid(),
                            "typeGuid": MetaInfo.SysResource.ClassGuid
                        },
                        "fields": {
                            "Id": MetaInfo.SysResource.getId(),
                            "ResGuid": resource.$sys.guid,
                            "Code": _name.toUpperCase(),
                            "Name": resource.fields.Name,
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
            },

            addResVer: function (resource, resId, resType) {
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
                            "Description": resType.fields.Description + ' ' + (resource.fields.Title || resource.fields.Name),
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
            },

            addBuildRes : function (resVerId) {
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
            },

            createResources : function(fileList, resTypeCode){
                var that = this;

                return new Promise(function(resolve, reject){
                    var _resType = that.sysResType.getType(resTypeCode);
                    if (!_resType) {
                        reject(new Error('Can not find resource ' + resTypeCode))
                    } else {
                        fileList.forEach(function (fileName) {
                            //var _resource = require(that.sourceDir + fileName);
                            var _resource = JSON.parse(fs.readFileSync(fileName));
                            var _resId = that.addResource(_resource, _resType);
                            var _resVerId = that.addResVer(_resource, _resId, _resType);
                            that.addBuildRes(_resVerId);
                        });

                        resolve();
                    }
                })
            },

            prepare : function() {
                var that = this;

                return new Promise(function (resolve, reject){
                    if (that.canBuildData) {
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

                        that.sourceDir.forEach(function(element){

                            var _list = fs.readdirSync(element.path);

                            if (_list.length != 0) {
                                _list.forEach(function(fileName, index, array){
                                    array[index] = element.path + '/' + fileName;
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
            },

            saveFiles : function(done) {
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
        });

        function getInstance(){
            if (!_instance) {
                _instance = new Builder();
            }

            return _instance;
        }

        Builder.prepareFiles = function(){
            return new Promise(function(resolve, reject) {
                getInstance().prepare().then(resolve, reject);
            })

        };

        Builder.kill = function(){
            _instance = null;
        };

        return Builder;
    }
);