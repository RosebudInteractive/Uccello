/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


define([
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        './resUtils',
        './build'
    ],

    function(Predicate, ResUtils, Build) {

        return UccelloClass.extend({

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
                if (_build) {
                    callback(_build)
                } else {
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
                            _build = new Build(that.db, _elements.get(0));
                            _build.loadResVersions(function() {
                                that.builds.push(_build);
                                callback(_build);
                            });
                        }
                    })
                }
            },

            loadCurrentBuild : function(callback) {
                if ((this.current) && (this.current.id == this.directories.getCurrentVersion().currBuildId)) {
                    callback(this.current)
                } else {
                    var _currentVersion = this.directories.getCurrentVersion();
                    var that = this;

                    this.loadBuild(_currentVersion.currBuildId, function (build) {
                        that.current = build;
                        callback(build);
                    })
                }
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

                                that.db.getObj(_objectGuid).newObject({
                                    fields: {
                                        BuildNum: _newBuildNum,
                                        IsConfirmed: false,
                                        Description: _newDescr,
                                        VersionId: build.versionId
                                    }
                                }, function (result) {
                                    if (result.result == 'OK') {
                                        var _newBuild = new Build(that.db.getObj(result.newObject));
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
    }
)
