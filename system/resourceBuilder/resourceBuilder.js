/**
 * Created by staloverov on 02.02.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

var _instance = null;

define(['fs', UCCELLO_CONFIG.uccelloPath + 'system/utils', 'crypto'],
    function(fs, Utils, Crypto) {

        const metaInfo = {
            SysResource : {
                ClassGuid : 'dc156f00-52bd-46ca-98e8-0ac6967ffd44',
                RootName : 'RootSysResource',
                RootGuid : '866db0f5-d312-4c10-9313-07d1c3fd352b',
                currentId : 0,
                getId : function(){
                    this.currentId++;
                    return this.currentId;
                }
            },
            SysResVer : {
                ClassGuid : 'a44a2754-a231-45e8-b483-afd57144a629',
                RootName : 'RootSysResVer',
                RootGuid : 'be4cc757-4cba-4046-8206-723618242f7c',
                currentId : 0,
                getId : function(){
                    this.currentId++;
                    return this.currentId;
                }
            },
            SysBuildRes : {
                ClassGuid : '039c1cb9-0fdf-49e9-8bb9-e720aa9fe9d1',
                RootName : 'RootSysBuildRes',
                RootGuid : 'e610fea3-5b38-44b5-aeab-e2d5fa084759',
                currentId : 0,
                getId : function(){
                    this.currentId++;
                    return this.currentId;
                }
            }
        };

        function createSysResource() {
            return {
                "$sys": {
                    "guid": Utils.guid(), //"c170c217-e519-7c23-2811-ff75cd4bfe81",
                    "typeGuid": metaInfo.SysResource.RootGuid //"866db0f5-d312-4c10-9313-07d1c3fd352b"
                },
                "fields": {
                    "Id": 1000,
                    "Name":metaInfo.SysResource.RootName //"RootSysResource"
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
                    "typeGuid": metaInfo.SysResVer.RootGuid,//"be4cc757-4cba-4046-8206-723618242f7c"
                },
                "fields": {
                    "Id": 1000,
                    "Name": metaInfo.SysResVer.RootName //"RootSysResVer"
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
                    "typeGuid": metaInfo.SysBuildRes.RootGuid//"e610fea3-5b38-44b5-aeab-e2d5fa084759"
                },
                "fields": {
                    "Id": 1000,
                    "Name": metaInfo.SysBuildRes.RootName //"RootSysBuildRes"
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        var Builder = UccelloClass.extend({
            init : function() {
                this.checkOptions();

                this.formDir = UCCELLO_CONFIG.resourceBuilder.sourceDir;
                this.outputDir = UCCELLO_CONFIG.resourceBuilder.destDir;
                this.resTypeId = UCCELLO_CONFIG.resourceBuilder.formResTypeId;
                this.productId = UCCELLO_CONFIG.resourceBuilder.productId;
                this.currBuildId = UCCELLO_CONFIG.resourceBuilder.currBuildId;

                this.sysResource = createSysResource();
                this.sysResVer = createSysResVer();
                this.sysBuildRes = createSysBuildRes();

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

                if (!UCCELLO_CONFIG.resourceBuilder.formResTypeId) {
                    throw new Error('ResourceBuilder : FormResTypeId not found')
                }

                if (!UCCELLO_CONFIG.resourceBuilder.productId) {
                    throw new Error('ResourceBuilder : ProductId not found')
                }

                if (!UCCELLO_CONFIG.resourceBuilder.currBuildId) {
                    throw new Error('ResourceBuilder : CurrentBuildId not found')
                }
            },

            addResource: function (form) {
                var that = this;

                function newResourceRecord() {
                    var _name = (form.fields.dbgName || form.fields.Name);
                    var _desc = (form.fields.Title || form.fields.Name);
                    return {
                        "$sys": {
                            "guid": Utils.guid(),
                            "typeGuid": metaInfo.SysResource.ClassGuid
                        },
                        "fields": {
                            "Id": metaInfo.SysResource.getId(),
                            "ResGuid": form.$sys.guid,
                            "Code": _name.toUpperCase(),
                            "Name": form.fields.Name,
                            "Description": 'форма ' + _desc,
                            "ProdId": that.productId,
                            "ResTypeId": that.resTypeId
                        },
                        "collections": {}
                    }
                }

                var _resource = newResourceRecord()
                this.sysResource.collections.DataElements.push(
                    _resource
                );
                return _resource.fields.Id
            },

            addResVer: function (form, resId) {
                var _body = JSON.stringify(form);
                var md5sum = Crypto.createHash('md5');
                md5sum.update(_body);
                var _md5 = md5sum.digest('hex');

                function newResVerRecord() {
                    return {
                        "$sys": {
                            "guid": Utils.guid(),
                            "typeGuid": metaInfo.SysResVer.ClassGuid
                        },
                        "fields": {
                            "Id": metaInfo.SysResVer.getId(),
                            "ResVer": 1,
                            "Hash": _md5,
                            "ResBody": _body,
                            "Description": 'форма ' + (form.fields.Title || form.fields.Name),
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
                            "typeGuid": metaInfo.SysBuildRes.ClassGuid
                        },
                        "fields": {
                            "Id": metaInfo.SysBuildRes.getId(),
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

            createResources : function(fileList, done){
                var that = this;
                fileList.forEach(function (fileName) {
                    try {
                        var _form = JSON.parse(fs.readFileSync(that.formDir + fileName, { encoding: "utf8" }));
                        var _resId = that.addResource(_form);
                        var _resVerId = that.addResVer(_form, _resId);
                        that.addBuildRes(_resVerId);
                    } catch (err) {
                        throw new Error("WARNING: Problem in file: \"" + that.formDir + fileName +
                            "\" : " + err.message);
                    }
                });

                done();
            },

            saveFiles : function(done) {
                var _resSaved = false;
                var _verSaved = false;
                var _buildSaved = false;

                function checkDone() {
                    if ((_resSaved) && (_verSaved) && (_buildSaved)) {
                        done()
                    }
                }

                if (!fs.existsSync(this.outputDir)) {
                    fs.mkdirSync(this.outputDir)
                }

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
            return new Promise(promiseBody);

            function promiseBody(resolve, reject){
                var that = getInstance();

                if (that.canBuildData) {
                    var _list = fs.readdirSync(that.formDir);
                    if (_list.length != 0) {
                        that.createResources(_list, function(){
                            that.saveFiles(function(){
                                resolve()
                            })
                        });
                    } else {
                        reject(new Error('No files to build into resource'))
                    }
                }
            }


        };

        Builder.kill = function(){
            _instance = null;
        };

        return Builder;
    }
);