if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [
        UCCELLO_CONFIG.uccelloPath + 'controls/controlMgr',
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate'
    ],
    function(ControlMgr,Predicate) {

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
            //this.className = resTypeObj.className();
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
                if ((options) && (options.hasOwnProperty('currProd')))  {
                    this.currentProductCode = options.currProd;
                    this.currentProduct = null;
                } else {
                    if (UCCELLO_CONFIG.resman.defaultProduct) {
                        this.currentProductCode = UCCELLO_CONFIG.resman.defaultProduct;
                        this.currentProduct = null;
                    }
                }

                var _dbParams = {
                    name: "ResourceManager",
                    kind: "master",
                    guid: "c76362cf-5f15-4aa4-8ee2-4a6e242dca51",
                    constructHolder: constructHolder
                };

                this.db = new ControlMgr({ controller: controller, dbparams: _dbParams },
                    null, null, null, proxy);
                // todo : убрать!!!
                this.dbLoaded = false;
                //this.loadProducts();

                this.pvt = {};
                this.pvt.controller = controller;
            },

            loadProducts: function (callback) {
                var _loaded = false;

                var that = this;

                this.db.getRoots(["846ff96f-c85e-4ae3-afad-7d4fd7e78144"], { rtype: "data", expr: {model : { name: "SysProduct" }} }, function (guids) {
                    guids.guids.forEach(function(guid) {
                        var _elements = that.db.getObj(guid).getCol('DataElements');
                        for (var i = 0; i < _elements.count(); i++) {
                            var _product = new Product(_elements.get(i));
                            that.products.push(_product);
                            if ((that.currentProductCode) && (_product.code == that.currentProductCode)) {
                                that.currentProduct = _product
                            }
                        }
                    });

                    if (!_loaded) {
                        _loaded = true
                    } else {
                        callback();
                    }
                });

                this.db.getRoots(["81e37311-6be7-4fc2-a84a-77a28ee342d4"], { rtype: "data", expr: {model : { name: "SysVersion" }} }, function (guids) {
                    guids.guids.forEach(function(guid) {
                        var _elements = that.db.getObj(guid).getCol('DataElements');
                        for (var i = 0; i < _elements.count(); i++) {
                            that.versions.push(new Version(_elements.get(i)))
                        }
                    });

                    if (!_loaded) {
                        _loaded = true
                    } else {
                        callback();
                    }
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

                // todo: использовать guid с ухом!
                this.db.getRoots(["15e20587-8a45-4e01-a135-b85544d32749"], { rtype: "data", expr: _expression }, function (guids) {
                    var _elements = that.db.getObj(guids.guids[0]).getCol('DataElements');

                    if (_elements.count() == 0) {
                        callback(null)
                    } else {

                        if (_elements.count() > 1) {
                            throw new Error('duplicate resource')
                        }

                        that.loadResourceBody(_elements.get(0), callback);
                    }
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
                        for (var i = 0; i < _elements.count(); i++) {
                            var _elem = _elements.get(i);

                            if (that.resources.has(_elem.resGuid())) {
                                _count++;
                                _resources.push(that.resources.get(_elem.resGuid()));

                                if (_elements.count() == _count) {
                                    callback(_resources)
                                }
                            } else {
                                that.loadResourceBody(_elem, function (resource) {
                                    _count++;
                                    if (resource) {
                                        _resources.push(resource);
                                    }

                                    if (_elements.count() == _count) {
                                        callback(_resources)
                                    }
                                })
                            }
                        }
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
            // todo : совместить с Proto1
            loadRes: function (guids, done) {
                if (UCCELLO_CONFIG.resman.useDb) {
                    var _promise = this.getResources(guids);
                    _promise.then(function(bodies){
                        var _array = [];
                        for (var body in bodies) {
                            if (bodies.hasOwnProperty(body) && (body != 'count')) {
                                _array.push(JSON.parse(bodies[body]))
                            }
                        }
                        done({ datas: _array })
                    })
                } else {
                    var _result = [];
                    guids.forEach(function(guid) {
                        var gr = guid.slice(0,36);
                        var json = require(UCCELLO_CONFIG.dataPath + 'forms/' + gr + '.json');
                        _result.push(json)
                    })
                    done({ datas: _result })
                }
            },

            getResourceObj : function(guid, callback) {
                if (this.resources.has(guid)) {
                    callback(this.resources.get(guid))
                } else {
                    this.queryResourceObj(guid, function (obj) {
                        callback(obj)
                    })
                }
            },

            getResource : function(guid) {
                var that = this;
                return new Promise(function (resolve, reject) {
                    if (!that.dbLoaded) {
                        that.loadProducts(promiseBody)
                    } else {
                        promiseBody()
                    }

                    function promiseBody(){
                        that.getResourceObj(guid, function (obj) {
                            if ((!obj) || (!obj.resBody)) {
                                reject(new Error('Resource not found'))
                            } else {
                                resolve(obj.resBody)
                            }
                        })
                    }
                })
            },

            getResources : function(guids) {
                var that = this;
                return new Promise(function(resolve) {
                    if (!that.dbLoaded) {
                        that.loadProducts(promiseBody)
                    } else {
                        promiseBody()
                    };

                    function promiseBody() {
                        var _resultObj = {};
                        _resultObj.count = 0;
                        guids.forEach(function (guid) {
                            if (that.resources.has(guid)) {
                                var _resource = that.resources.get(guid);

                                _resultObj[_resource.resGuid] = _resource.resBody;
                                _resultObj.count++;
                                if (_resultObj.count == guids.length) {
                                    resolve(_resultObj)
                                }
                            } else {
                                that.queryResourceObj(guid, function (obj) {
                                    if (!obj) {
                                        _resultObj[guid] = null;
                                    } else {
                                        _resultObj[guid] = obj.resBody;
                                    }
                                    _resultObj.count++;
                                    if (_resultObj.count == guids.length) {
                                        resolve(_resultObj)
                                    }
                                })
                            }
                        })
                    }
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
            },

            getResListByType : function(typeGuid) {
                var that = this;
                return new Promise(function(resolve, reject) {
                    var _result = [];
                    that.getResType(typeGuid, function(resType) {
                        if (!resType) {
                            reject(new Error('Type not found'));
                        } else {
                            that.loadResourcesByType(resType.id, function(resources) {
                                resources.forEach(function(resource){
                                    _result.push(resource.resGuid);
                                });
                                resolve(_result)
                            })
                        }
                    })

                });
            },

            createNewBuild : function () {

            },

            createNewResource : function(resource) {
                var that = this;

                function createResource() {
                    var _predicate = new Predicate(that.db, {});
                    _predicate.addCondition({field: "Id", op: "=", value: 0});
                    var _expression = {
                        model: {name: "SysResource"},
                        predicate: that.db.serialize(_predicate)
                    };

                    that.db.getRoots(["d53fa310-a5ce-4054-97e0-c894a03d3719"], { rtype: "data", expr: _expression }, function(guids) {
                        that.db.getObj(guids.guids[0]).newObject({
                            fields : {
                                Name: resource.name,
                                Code: resource.code,
                                Description: resource.description,
                                ResGuid: resource.resGuid,
                                ProdId: that.currentProduct.id,
                                ResTypId: resource.resTypeId
                            }
                        }, function(obj) {
                            obj.save()
                        });

                        //callback(_resource);
                    })
                }

                if (!resource.resGuid) {
                    createResource()
                } else {
                    this.getResourceObj(resource.resGuid, function(obj) {
                        if (!obj) {
                            createResource()
                        } else {
                            new Error('Resource exists');
                        }
                    })
                }

            },

            newResourceVersion : function(res) {

            },

            commitBuild : function() {

            }
        });

        return Resman;
    }
);