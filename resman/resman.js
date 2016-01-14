if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [
        UCCELLO_CONFIG.uccelloPath + 'controls/controlMgr',
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate'
    ],
    function(ControlMgr ,Predicate) {

        function Product(productObj) {
            this.id = productObj.id();
            this.code = productObj.code();
            this.name = productObj.name();
            this.description = productObj.description();
            this.currVerId = productObj.currVerId();
        }

        function Version(versionObj) {
            this.id = versionObj.id();
            this.code = versionObj.code();
            this.name = versionObj.name();
            this.description = versionObj.description();
            this.prodId = versionObj.prodId();
            this.currBuildId = versionObj.currBuildId();
        }

        function Resource(resourceHeaderObj) {
            this.id = resourceHeaderObj.id();
            this.resGuid = resourceHeaderObj.resGuid();
            this.code = resourceHeaderObj.code();
            this.name = resourceHeaderObj.name();
            this.description = resourceHeaderObj.description();
            this.prodId = resourceHeaderObj.prodId();
            this.resTypeId = resourceHeaderObj.resTypId();
            this.resBody = null;
        }

        function ResVersion(resVersionObj) {
            this.id = resVersionObj.id();
            this.resVer = resVersionObj.resVer();
            this.hash = resVersionObj.hash();
            this.resBody = resVersionObj.resBody();
            this.description = resVersionObj.description();
            this.resId = resVersionObj.resId();
        }

        function ResType(resTypeObj) {
            this.id = resTypeObj.id();
            this.code = resTypeObj.code();
            this.name = resTypeObj.name();
            this.className = resTypeObj.className();
            this.resTypeGuid = resTypeObj.resTypeGuid();

        }

        var Resman = UccelloClass.extend({
            products : [],
            versions : [],


            resources : new Map(),
            buildResVersions : new Map(),

            resVersions : new Map(),
            resTypes : new Map(),

            init: function(controller, constructHolder, proxy, options){
                if ((options) && (options.hasOwnProperty('currProd'))) {
                    this.currentProductCode = options.currProd
                }

                var _dbParams = {
                    name: "ResourceManager",
                    kind: "master",
                    guid: "c76362cf-5f15-4aa4-8ee2-4a6e242dca51",
                    constructHolder: constructHolder
                };

                this.db = new ControlMgr({ controller: controller, dbparams: _dbParams },
                    null, null, null, proxy);

                this.loadProducts();

                this.pvt = {};
                this.pvt.controller = controller;
            },

            loadProducts: function () {
                var that = this;

                this.db.getRoots(["846ff96f-c85e-4ae3-afad-7d4fd7e78144"], { rtype: "data", expr: {model : { name: "SysProduct" }} }, function (guids) {
                    guids.guids.forEach(function(guid) {
                        var _elements = that.db.getObj(guid).getCol('DataElements');
                        for (var i = 0; i < _elements.count(); i++) {
                            that.products.push(new Product(_elements.get(i)))
                        }
                    })
                });

                this.db.getRoots(["81e37311-6be7-4fc2-a84a-77a28ee342d4"], { rtype: "data", expr: {model : { name: "SysVersion" }} }, function (guids) {
                    guids.guids.forEach(function(guid) {
                        var _elements = that.db.getObj(guid).getCol('DataElements');
                        for (var i = 0; i < _elements.count(); i++) {
                            that.versions.push(new Version(_elements.get(i)))
                        }
                    })
                });
            },

            getProductById : function(id) {
                return this.products.find(function(product) {
                    return product.id == id
                })
            },

            getVersionById : function(id) {
                return this.versions.find(function(version) {
                    return version.id == id
                })
            },

            queryResourceObj : function(resourceGuid, callback) {
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "ResGuid", op: "=", value: resourceGuid});
                var _expression = {
                    model: {name: "SysResource"},
                    predicate: this.db.serialize(_predicate)
                };

                var that = this;

                this.db.getRoots(["15e20587-8a45-4e01-a135-b85544d32749"], { rtype: "data", expr: _expression }, function (guids) {
                    var _elements = that.db.getObj(guids.guids[0]).getCol('DataElements');

                    if (_elements.count() == 0) {
                        callback(null)
                    }

                    if (_elements.count() > 1) {
                        throw new Error('duplicate resource')
                    }

                    that.loadResourceBody(_elements.get(0), callback);


                });
            },

            loadResourcesByType : function(resTypeId, callback) {
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "ResTypId", op: "=", value: resTypeId});
                var _expression = {
                    model: {name: "SysResource"},
                    predicate: this.db.serialize(_predicate)
                };

                var that = this;
                this.db.getRoots(["30893c22-e103-4771-b4c2-37d3c6593cae"], { rtype: "data", expr: _expression }, function(guids) {
                    var _elements = that.db.getObj(guids.guids[0]).getCol('DataElements');
                    var _resources = [];
                    var _count = 0;

                    if (_elements.count() > 0) {
                        _elements.forEach(function (element) {
                            if (that.resources.has(element.resGuid())) {
                                _count++;
                                _resources.push(that.resources.get(element.resGuid()));

                                if (_elements.length == _count) {
                                    callback(_resources)
                                }
                            } else {
                                that.loadResourceBody(element, function (resource) {
                                    _count++;
                                    if (resource) {
                                        _resources.push(resource);
                                    }

                                    if (_elements.length == _count) {
                                        callback(_resources)
                                    }
                                })
                            }
                        });
                    } else {
                        callback(_resources);
                    }
                })
            },

            loadResourceBody : function(resourceObj, callback){
                var _resource = new Resource(resourceObj);

                var _product = this.getProductById(_resource.prodId);
                if (!_product) {
                    throw Error('Undefined product')
                }

                var _version = this.getVersionById(_product.currVerId);
                if (!_version) {
                    throw Error('Undefined version')
                }

                var that = this;

                this.getResVersionsOfBuild(_version.currBuildId, function(buildResVersions) {
                    that.getResVersions(_resource.id, function(resVersions) {
                        var _resVer = resVersions.find(function(resVer){
                            var _id = buildResVersions.find(function(buildResVerId){
                                return buildResVerId == resVer.id
                            });
                            return !_id ? false : _id != 0;
                        });

                        if (_resVer) {
                            _resource.resBody = _resVer.resBody;
                        }

                        that.resources.set(_resource.resGuid, _resource);
                        callback(_resource);
                    })
                });
            },

            getResVersions : function(resourceId, callback) {
                if (this.resVersions.has(resourceId)) {
                    callback(this.resVersions.get(resourceId))
                } else {
                    this.queryResVersions(resourceId, callback)
                }
            },

            queryResVersions : function(resourceId, callback) {
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "ResId", op: "=", value: resourceId});
                var _expression = {
                    model: {name: "SysResVer"},
                    predicate: this.db.serialize(_predicate)
                };

                var that = this;
                this.db.getRoots(["f447d844-9ad4-4a89-ad41-347427c17e3b"], { rtype: "data", expr: _expression }, function(guids) {
                    var _elements = that.db.getObj(guids.guids[0]).getCol('DataElements');
                    var _resVersions = [];
                    for (var i = 0; i < _elements.count(); i++) {
                        _resVersions.push(new ResVersion(_elements.get(i)))
                    }

                    that.buildResVersions.set(resourceId, _resVersions);

                    callback(_resVersions);
                })
            },

            getResVersionsOfBuild : function(buildId, callback) {
                if (this.buildResVersions.has(buildId)) {
                    callback(this.buildResVersions.get(buildId))
                } else {
                    this.queryResVersionsOfBuild(buildId, callback)
                }
            },

            queryResVersionsOfBuild : function(buildId, callback) {
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "BuidId", op: "=", value: buildId});
                var _expression = {
                    model: {name: "SysBuildRes"},
                    predicate: this.db.serialize(_predicate)
                };

                var that = this;
                this.db.getRoots(["eaec63f9-d15f-4e9d-8469-72ddca96cc16"], { rtype: "data", expr: _expression }, function(guids) {
                    var _elements = that.db.getObj(guids.guids[0]).getCol('DataElements');
                    var _resVersions = [];
                    for (var i = 0; i < _elements.count(); i++) {
                        _resVersions.push(_elements.get(i).resVerId())
                    }

                    that.buildResVersions.set(buildId, _resVersions);

                    callback(_resVersions);
                })
            },

            /**
             * Загрузить ресурс
             * @returns {obj}
             */
            loadRes: function (guidRoot) {
                var gr = guidRoot.slice(0,36);
                var json = require(UCCELLO_CONFIG.dataPath + 'forms/'+gr+'.json');
                return json;
            },

            getResource : function(guid) {
                var that = this;
                return new Promise(function (resolve, reject) {
                    if (that.resources.has(guid)) {
                        resolve(that.resources.get(guid).resBody)
                    } else {
                        that.queryResourceObj(guid, function (obj) {
                            if (!obj) {
                                reject(new Error('Resource not found'))
                            } else {
                                resolve(obj.resBody)
                            }
                        })
                    }
                });
            },

            getResources : function(guids) {
                var that = this;
                return new Promise(function(resolve) {
                    var _resultArray = {};
                    _resultArray.count = 0;
                    guids.forEach(function(guid){
                        if (that.resources.has(guid)) {
                            var _resource = that.resources.get(guid);

                            _resultArray[_resource.resGuid] = _resource.resBody;
                            _resultArray.count++;
                            if (_resultArray.count == guids.length) {
                                resolve(_resultArray)
                            }
                        } else {
                            that.queryResourceObj(guid, function (obj) {
                                if (!obj) {
                                    _resultArray[guid] = null;
                                } else {
                                    _resultArray[guid] = obj.resBody;
                                }
                                _resultArray.count++;
                                if (_resultArray.count == guids.length) {
                                    resolve(_resultArray)
                                }
                            })
                        }
                    })
                })
            },

            getResType : function(typeGuid, callback) {
                if (this.resTypes.has(typeGuid)) {
                    callback(this.resTypes.get(typeGuid))
                } else {
                    this.queryResType(typeGuid, callback)
                }
            },

            queryResType : function(typeGuid, callback) {
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "ResTypeGuid", op: "=", value: typeGuid});
                var _expression = {
                    model: {name: "SysResType"},
                    predicate: this.db.serialize(_predicate)
                };

                var that = this;
                this.db.getRoots(["d53fa310-a5ce-4054-97e0-c894a03d3719"], { rtype: "data", expr: _expression }, function(guids) {
                    var _elements = that.db.getObj(guids.guids[0]).getCol('DataElements');
                    if (_elements.count() == 0) {
                        callback(null)
                    }

                    that.resTypes.push(_elements.get(0));

                    var _resType = new ResType(_elements.get(0));
                    that.resTypes.set(typeGuid, _resType);

                    callback(_resType);
                })
            },

            getResByType : function(typeGuid) {
                var that = this;
                return new Promise(function(resolve, reject) {
                    var _result = {};
                    that.getResType(typeGuid, function(resType) {
                        if (!resType) {
                            reject(new Error('Type not found'));
                        } else {
                            that.loadResourcesByType(resType.id, function(resources) {
                                resources.forEach(function(resource){
                                    _result[resource.resGuid] = resource.resBody
                                });
                                resolve(_result)
                            })
                        }
                    })

                });
                //if (this.resTypes.has(typeGuid))
            },

            getResListByType : function(typeGuid) {

            },

            createNewBuild : function () {

            },

            newResourceVersion : function(res) {

            },

            commitBuild : function() {}
        });
        return Resman;
    }
);