/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


var _instance = null;

define([
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        './resUtils',
        './build'
    ],

    function(Predicate, ResUtils, Build) {
        var Builds = UccelloClass.extend({

            init: function (db, directories) {
                this.db = db;
                this.builds = [];
                this.directories = directories;
                this.state = ResUtils.state.new;
                this.current = null;

                this.queryBuildResGuid = 'eaec63f9-d15f-4e9d-8469-72ddca96cc16';
            },

            loadBuild : function(buildId, callback) {
                var _build = this.getById(buildId);
                var _needCreate = (!_build);
                //if (_build) {
                //    if (_build.isLoaded()) {
                //        callback(_build)
                //    } else {
                //        _build.loadResVersions(function() {
                //            callback(_build);
                //        });
                //    }
                //
                //} else {
                    var _predicate = new Predicate(this.db, {});
                    _predicate.addCondition({field: "Id", op: "=", value: buildId});
                    var _expression = {
                        model: {name: "SysBuild"},
                        predicate: this.db.serialize(_predicate)
                    };

                    var that = this;
                    this.db.getRoots([this.queryBuildResGuid], { rtype: "data", expr: _expression }, function(guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryBuildResGuid = _objectGuid;

                        var _elements = that.db.getObj(_objectGuid).getCol('DataElements');
                        if (_elements.count() == 0) {
                            callback(null)
                        } else {
                            if (_needCreate) {
                                _build = new Build(that.db, _elements.get(0));
                            } else {
                                _build.parseDbObject(_elements.get(0))
                            }

                            _build.loadResVersions(function() {
                                if (_needCreate) {
                                    that.builds.push(_build);
                                }
                                callback(_build);
                            });
                        }
                    })
                //}
            },

            loadCurrentBuild : function(callback) {
                //if ((this.current) && (this.current.id == this.directories.getCurrentVersion().currBuildId)) {
                //    callback(this.current)
                //} else {
                    var _currentVersion = this.directories.getCurrentVersion();
                    var that = this;

                    this.loadBuild(_currentVersion.currBuildId, function (build) {
                        that.current = build;
                        callback(build);
                    })
                //}
            },

            getById : function(id) {
                return this.builds.find(function(build) {
                    return build.id == id
                })
            },

            createNew : function(description, transactionId) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {

                    that.loadCurrentBuild(function (build) {
                        if (!build.isConfirmed) {
                            reject(ResUtils.newObjectError('Current build is unconfirmed'))
                        } else {
                            var _newDescr = (description || build.description);
                            var _newBuildNum = (build.buildNum || 0) + 1;

                            var _predicate = new Predicate(that.db, {});
                            _predicate.addCondition({field: "Id", op: "=", value: 0});
                            var _expression = {
                                model: {name: "SysBuild"},
                                predicate: that.db.serialize(_predicate)
                            };

                            that.db.getRoots([that.queryBuildResGuid], {rtype: "data", expr: _expression}, function (guids) {
                                var _objectGuid = guids.guids[0];
                                that.queryBuildResGuid = _objectGuid;

                                var _options = {};
                                if (transactionId) {
                                    _options.transactionId = transactionId;
                                }

                                that.db.getObj(_objectGuid).newObject({
                                    fields: {
                                        BuildNum: _newBuildNum,
                                        IsConfirmed: false,
                                        Description: _newDescr,
                                        VersionId: build.versionId
                                    }
                                }, _options, function (result) {
                                    if (result.result == 'OK') {
                                        var _newBuild = new Build(that.db, that.db.getObj(result.newObject));
                                        that.builds.push(_newBuild);
                                        resolve(_newBuild.id);
                                    } else {
                                        reject(ResUtils.newDbError(result.message));
                                    }
                                });
                            })
                        }
                    });

                }
            }

        });

        Builds.init = function(db, directories){
            _instance = new Builds(db, directories)
            return _instance;
        };

        function getInstance() {
            if (!_instance) {
                throw new Error('Build not initialized');
            }
            return _instance;
        }

        Builds.loadBuild = function(buildId, callback) {
            getInstance().loadBuild(buildId, callback);
        };

        return Builds;
    }
)
