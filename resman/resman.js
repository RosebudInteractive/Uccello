if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [
        UCCELLO_CONFIG.uccelloPath + 'controls/controlMgr',
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',

        './directories',
        './builds',
        './resources',
        './resUtils',
        './resVersions'
    ],
    function(ControlMgr, Predicate, Directories, Builds, Resources, ResUtils, ResVersions) {

        var Resman = UccelloClass.extend({

            init: function (controller, constructHolder, proxy, options) {
                this.pvt = {};
                this.pvt.controller = controller;

                if ((options) && (options.hasOwnProperty('currProd'))) {
                    this.currentProductCode = options.currProd;
                } else {
                    if (UCCELLO_CONFIG.resman.defaultProduct) {
                        this.currentProductCode = UCCELLO_CONFIG.resman.defaultProduct;
                    }
                }

                var _dbParams = {
                    name: "ResourceManager",
                    kind: "master",
                    guid: "c76362cf-5f15-4aa4-8ee2-4a6e242dca51",
                    constructHolder: constructHolder
                };

                this.db = new ControlMgr({controller: controller, dbparams: _dbParams},
                    null, null, null, proxy);

                this.directories = new Directories(this.db);
                this.builds = new Builds(this.db, this.directories);
                this.resources = new Resources(this.db, this.directories, this.builds);
                this.resVersions = ResVersions.init(this.db);
            },

            loadDirectories: function (done) {
                var that = this;

                this.directories.load(function () {
                    that.directories.setCurrentProduct(that.currentProductCode);
                    done();
                });
            },

            /**
             * Загрузить ресурс
             * @returns {obj}
             */
            // todo : совместить с Proto1
            loadRes: function (guids, done) {
                if (UCCELLO_CONFIG.resman.useDb) {
                    var _promise = this.getResources(guids);
                    _promise.then(function (bodies) {
                        var _array = [];
                        for (var body in bodies) {
                            if (bodies.hasOwnProperty(body) && (body != 'count')) {
                                _array.push(JSON.parse(bodies[body]))
                            }
                        }
                        done({datas: _array})
                    })
                } else {
                    var _result = [];
                    guids.forEach(function (guid) {
                        var gr = guid.slice(0, 36);
                        var json = require(UCCELLO_CONFIG.dataPath + 'forms/' + gr + '.json');
                        _result.push(json)
                    });
                    done({datas: _result})
                }
            },

            getResource: function (guid) {
                var that = this;
                return new Promise(function (resolve, reject) {
                    that.loadDirectories(promiseBody);

                    function promiseBody() {
                        that.resources.getBody(guid, function(body) {
                            if (!body) {
                                reject(new Error({reason : ResUtils.errorReasons.dbError, message : 'Resource Not Found'}))
                            } else {
                                resolve(body)
                            }
                        });

                    }
                })
            },

            getResources: function (guids) {
                var that = this;
                return new Promise(function (resolve) {
                    that.loadDirectories(promiseBody);

                    function promiseBody() {
                        var _resultObj = {};
                        var _count = 0;
                        guids.forEach(function (guid) {
                            that.resources.getBody(guid, function(body) {
                                _resultObj[guid] = body;
                                _count++;

                                if (_count == guids.length) {
                                    resolve(_resultObj)
                                }
                            });
                        })
                    }
                })
            },

            getResByType: function (typeGuid) {
                var that = this;
                return new Promise(function (resolve, reject) {
                    that.loadDirectories(promiseBody);

                    function promiseBody() {
                        var _result = {};
                        that.resources.getListByType(typeGuid).then(
                            function(resources){
                                resources.forEach(function (resource) {
                                    _result[resource.resGuid] = resource.resBody
                                });
                                resolve(_result)
                            },
                            function(reason){
                                reject(reason)
                            }
                        );
                    }
                });
            },

            getResListByType: function (typeGuid) {
                var that = this;
                return new Promise(function (resolve, reject) {
                    that.loadDirectories(promiseBody);

                    function promiseBody() {
                        var _result = [];
                        that.resources.getListByType(typeGuid).then(
                            function(resources){
                                resources.forEach(function (resource) {
                                    _result.push(resource.resGuid)
                                });
                                resolve(_result)
                            },
                            function(reason){
                                reject(reason)
                            }
                        );


                    }
                });
            },

            createNewResource: function (resource, callback) {
                var that = this;
                this.loadDirectories(function() {
                    that.resources.createNew(resource).then(
                        function (resourcesGuid) {
                            callback({result : 'OK', resourcesGuid : resourcesGuid})
                        },
                        function (reason) {
                            callback({result : 'ERROR', message : reason.message})
                        }
                    );
                });
            },

            commit : function(transactionId){
                $data.tranCommit(transactionId, function (result) {
                    if (result.result !== "OK") {
                        throw new Error(result.message);
                    } else {
                        //console.log("Transaction finished!");
                    }
                });
            },

            rollback : function(transactionId){
                $data.tranRollback(transactionId, function (result) {
                    if (result.result !== "OK") {
                        throw new Error(result.message);
                    } else {
                        //console.log("Transaction finished!");
                    }
                });
            },

            newResourceVersion: function (resGuid, body, callback) {
                var that = this;
                this.loadDirectories(function() {
                    that.builds.loadCurrentBuild(function (build) {
                        if (!build.isConfirmed) {
                            $data.tranStart({}, function (result) {
                                if (result.result === "OK") {
                                    var _transactionId = result.transactionId;
                                    that.resources.createNewVersion(resGuid, body, _transactionId).then(
                                        function (resVersion) {
                                            build.addResVersion(resVersion.id, _transactionId).then(
                                                function () {
                                                    that.commit(_transactionId);
                                                    callback({result : 'OK', resVersionId : resVersion.id})
                                                },
                                                function (reason) {
                                                    that.rollback(_transactionId);
                                                    callback({result : 'ERROR', message : reason.message})
                                                }
                                            )
                                        },
                                        function (reason) {
                                            that.rollback(_transactionId);
                                            callback({result : 'ERROR', message : reason.message})
                                        }
                                    );
                                } else {
                                    callback({result : 'ERROR', message : result.message})
                                }
                            })
                        } else {
                            throw new Error('Current build is confirmed')
                        }
                    });
                });
            },

            createNewBuild: function (description, callback) {
                var that = this;
                $data.tranStart({}, function(result){
                    if (result.result === "OK") {
                        var _transactionId = result.transactionId;

                        that.builds.createNew(description, _transactionId).then(
                            function(buildId){
                                that.directories.getCurrentVersion().setCurrentBuild(buildId, _transactionId).then(
                                    function () {
                                        that.commit(_transactionId);
                                        callback({result : 'OK', resVersionId : resVersion.id})
                                    },
                                    function (reason) {
                                        that.rollback(_transactionId);
                                        callback({result : 'ERROR', message : reason.message})
                                    }
                                )
                            },
                            function (reason) {
                                that.rollback(_transactionId);
                                callback({result : 'ERROR', message : reason.message})
                            }
                        );

                    } else {
                        callback({result : 'ERROR', message : result.message})
                    }
                });
            },

            commitBuild: function (callback) {
                var that = this;

                $data.tranStart({}, function(result){
                    if (result.result === "OK") {
                        var _transactionId = result.transactionId;

                        var _promise = that.builds.current.commit();
                        _promise.then(
                            function(){
                                that.directories.getCurrentVersion().setLastConfirmedBuild().then(
                                    function () {
                                        that.commit(_transactionId);
                                        callback({result : 'OK'})
                                    },
                                    function (reason) {
                                        that.rollback(_transactionId);
                                        callback({result : 'ERROR', message : reason.message})
                                    }
                                )
                            },
                            function(error) {
                                switch (error.reason) {
                                    case ResUtils.errorReasons.dbError : {
                                        that.rollback(_transactionId);
                                        callback({result : 'ERROR', message : error.message});
                                        break;
                                    }
                                    case ResUtils.errorReasons.objectError : {
                                        that.directories.getCurrentVersion().revertToLastConfirmedBuild().then(
                                            function () {
                                                that.commit(_transactionId);
                                                callback({result : 'OK'})
                                            },
                                            function (reason) {
                                                that.rollback(_transactionId);
                                                callback({result : 'ERROR', message : reason.message})
                                            }
                                        );
                                        break;
                                    }
                                    default :  {
                                        that.rollback(_transactionId);
                                        callback({result : 'ERROR', message : error.message});
                                        break;
                                    }
                                }
                            }
                        );
                    } else {
                        callback({result : 'ERROR', message : result.message})
                    }
                })
            }
        });

        return Resman;
    }
);