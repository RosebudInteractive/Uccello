/**
 * Created by staloverov on 21.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        './resUtils',
        'crypto',
        './resVersions'
    ],
    function(Predicate, ResUtils, Crypto, ResVersions) {
        function Resource(resourceHeaderObj) {
            this.id = resourceHeaderObj.id();
            this.resGuid = resourceHeaderObj.resGuid();
            this.code = resourceHeaderObj.code();
            this.name = resourceHeaderObj.name();
            this.description = resourceHeaderObj.description();
            this.prodId = resourceHeaderObj.prodId();
            this.resTypeId = resourceHeaderObj.resTypeId();
            this.resBody = null;
            this.state = ResUtils.state.new;
        }


        return UccelloClass.extend({

            init: function (db, directories, builds) {
                this.db = db;
                this.resources = new Map();
                this.directories = directories;
                this.builds = builds;
                this.state = ResUtils.state.new;

                this.queryResGuid = '15e20587-8a45-4e01-a135-b85544d32749';
            },

            getObject: function (guid, callback) {
                if ((this.resources.has(guid)) && (this.resources.get(guid).state == ResUtils.state.loaded)) {
                    callback(this.resources.get(guid))
                } else {
                    this.queryResourceObj(guid, function (obj) {
                        callback(obj)
                    })
                }
            },

            getListByType: function (typeGuid) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    var _resTypeId = that.directories.getResType(typeGuid);

                    if (!_resTypeId) {
                        reject(ResUtils.newObjectError('No such resource type'))
                    } else {
                        var _loaded = getLoadedResources(_resTypeId.id);
                        loadMissingResources(_resTypeId.id, _loaded, function (missing) {
                            resolve(_loaded.concat(missing))
                        });
                    }
                }

                function loadMissingResources(resTypeId, loadedResources, callback) {
                    var _predicate = new Predicate(that.db, {});
                    _predicate.addCondition({field: "ResTypeId", op: "=", value: resTypeId});
                    if (loadedResources.length != 0) {
                        var _ids = getIdArray(loadedResources);
                        if (_ids.length == 1) {
                            _predicate.addCondition({field: "Id", op: "=", value: _ids[0]}, true);
                        } else {
                            _predicate.addCondition({field: "Id", op: "in", value: _ids}, true);
                        }
                    }
                    var _expression = {model: {name: "SysResource"}, predicate: that.db.serialize(_predicate)};

                    that.db.getRoots([that.queryResGuid], {rtype: "data", expr: _expression}, function (guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryResGuid = _objectGuid;

                        var _elements = that.db.getObj(_objectGuid).getCol('DataElements');

                        if (_elements.count() == 0) {
                            callback(null)
                        } else {
                            var _count = 0;
                            var _resultArray = [];
                            for (var i = 0; i < _elements.count(); i++) {
                                that.loadResourceBody(_elements.get(i), function (res) {
                                    _count++;
                                    _resultArray.push(res);
                                    if (_count == _elements.count()) {
                                        callback(_resultArray)
                                    }
                                });
                            }
                        }
                    });
                }

                function getLoadedResources(resTypeId) {
                    var _result = [];
                    that.resources.forEach(function (resource) {
                        if ((resource.resTypeId == resTypeId) && (resource.state == ResUtils.state.loaded)) {
                            _result.push(resource)
                        }
                    });

                    return _result
                }

                function getIdArray(resources) {
                    var _array = [];
                    resources.forEach(function (res) {
                        _array.push(res.id)
                    });

                    return _array;
                }
            },

            getBody: function (guid, callback) {
                if ((this.resources.has(guid)) && (this.resources.get(guid).state == ResUtils.state.loaded)) {
                    callback(this.resources.get(guid).resBody)
                } else {
                    this.queryResourceObj(guid, function (resource) {
                        callback(resource.resBody)
                    })
                }
            },

            queryResourceObj: function (resourceGuid, callback) {
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "ResGuid", op: "=", value: resourceGuid});
                var _expression = {
                    model: {name: "SysResource"},
                    predicate: this.db.serialize(_predicate)
                };

                var that = this;
                this.db.getRoots([this.queryResGuid], {rtype: "data", expr: _expression}, function (guids) {
                    var _objectGuid = guids.guids[0];
                    that.queryResGuid = _objectGuid;

                    var _elements = that.db.getObj(_objectGuid).getCol('DataElements');

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

            loadResourceBody: function (resourceObj, callback) {
                var _resource = new Resource(resourceObj);

                var that = this;
                this.builds.loadCurrentBuild(function (build) {
                    var _resVer = build.resVersions.find(function (resVer) {
                        return resVer.resId == _resource.id
                    });

                    if (_resVer) {
                        _resource.resBody = _resVer.resBody;
                        _resource.hash = _resVer.hash;
                        _resource.resVerNum = _resVer.resVer;
                        _resource.verDescription = _resVer.description;
                        _resource.verDescription = _resVer.description;
                    }

                    _resource.state = ResUtils.state.loaded;
                    that.resources.set(_resource.resGuid, _resource);
                    callback(_resource);
                });
            },

            createNew: function (resource) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    if (!resource.resGuid) {
                        createResource()
                    } else {
                        that.getObject(resource.resGuid, function (obj) {
                            if (!obj) {
                                createResource()
                            } else {
                                reject(ResUtils.newObjectError('Resource exists'))
                            }
                        })
                    }

                    function createResource() {
                        var _predicate = new Predicate(that.db, {});
                        _predicate.addCondition({field: "Id", op: "=", value: 0});
                        var _expression = {
                            model: {name: "SysResource"},
                            predicate: that.db.serialize(_predicate)
                        };

                        that.db.getRoots([that.queryResGuid], {rtype: "data", expr: _expression}, function (guids) {
                            var _objectGuid = guids.guids[0];
                            that.queryResGuid = _objectGuid;

                            that.db.getObj(_objectGuid).newObject({
                                fields: {
                                    Name: resource.name,
                                    Code: resource.code,
                                    Description: resource.description,
                                    ResGuid: resource.resGuid,
                                    ProdId: that.directories.getCurrentProduct().id,
                                    ResTypeId: resource.resTypeId
                                }
                            }, function (result) {
                                if (result.result == 'OK') {
                                    resolve(result.newObject)
                                } else {
                                    reject(ResUtils.newDbError(result.message))
                                }

                            });
                        })
                    }
                }
            },

            createNewVersion: function (resGuid, body) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    that.getObj(resGuid, function (obj) {
                        if (!obj) {
                            reject(ResUtils.newObjectError('No such resource'))
                        } else {
                            obj.resVerNum = (obj.resVerNum || 0);

                            var md5sum = Crypto.createHash('md5');
                            md5sum.update(body);
                            var _md5 = md5sum.digest('hex');

                            if (_md5 != obj.hash) {
                                var _fields = {
                                    ResVer: obj.resVerNum + 1,
                                    Hash: _md5,
                                    ResBody: body,
                                    Description: obj.verDescription,
                                    ResId: obj.id
                                };
                                ResVersions.createNew(_fields).then(
                                    function (resVersion) {
                                        that.state = ResUtils.state.changed;
                                        resolve(resVersion)
                                    },
                                    function (reason) {
                                        reject(reason)
                                    }
                                );
                            } else {
                                reject(ResVersions.newObjectError('No body different'))
                            }
                        }
                    });
                }
            }
        });
    }
);