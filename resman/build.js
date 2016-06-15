/**
 * Created by staloverov on 26.01.2016.
 */
"use strict";

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    //var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


define([
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        './resUtils',
        './resVersions'
    ],

    function(Predicate, ResUtils, ResVersions) {
        return class Build{
        //return UccelloClass.extend({

            constructor(db, buildObj) {
                this.db = db;
                this.parseDbObject(buildObj);
                this.state = ResUtils.state.new;

                this.queryBuildResGuid = 'f447d844-9ad4-4a89-ad41-347427c17e3b';
                this.commitGuid = 'd53fa310-a5ce-4054-97e0-c894a03d3719';
            }

            parseDbObject(buildObj) {
                this.id = buildObj.id();
                this.buildNum = buildObj.buildNum();
                this.isConfirmed = buildObj.isConfirmed();
                this.description = buildObj.description();
                this.versionId = buildObj.versionId();
                this.resVersions = [];
                this.state = ResUtils.state.loaded;
            }

            isLoaded() {
                return this.state == ResUtils.state.loaded
            }

            addResVersion(resVersionId, transactionId) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    var _predicate = new Predicate(that.db, {});
                    _predicate.addCondition({field: "ResVerId", op: "=", value: resVersionId});
                    _predicate.addCondition({field: "BuildId", op: "=", value: that.id});
                    var _expression = { model: {name: "SysBuildRes"}, predicate: that.db.serialize(_predicate, true) };

                    that.db.getRoots([that.queryBuildResGuid], {rtype: "data", expr: _expression}, function (guids) {
                        var _root = that.db.getObj(guids.guids[0]);

                        if (_root.getCol('DataElements').count() > 0) {
                            that.db._deleteRoot(_root);
                            ResVersions.load(resVersionId, that.resVersions, function(){
                                that.state = ResUtils.state.loaded;
                                resolve();
                            });
                            // resolve();
                            return
                        }

                        var _options = {};
                        if (transactionId) {
                            _options.transactionId = transactionId;
                        }

                        _root.edit(function(result){
                            if (result.result === 'OK') {
                                _root.newObject({
                                    fields: {
                                        BuildId: that.id,
                                        ResVerId: resVersionId
                                    }
                                }, _options, function (result) {
                                    if (result.result == 'OK') {
                                        _root.save(_options, function (result) {
                                            that.db._deleteRoot(_root);
                                            if (result.result == 'OK') {
                                                ResVersions.load(resVersionId, that.resVersions, function(){
                                                    that.state = ResUtils.state.loaded;
                                                    resolve();
                                                });
                                                // resolve()
                                            } else {
                                                reject(ResUtils.newDbError(result.message));
                                            }
                                        })
                                    } else {
                                        that.db._deleteRoot(_root);
                                        reject(ResUtils.newDbError(result.message));
                                    }
                                })
                            } else {
                                that.db._deleteRoot(_root);
                                reject(ResUtils.newDbError(result.message));
                            }
                        });
                    })
                }

            }

            removeResVersion(resVersionId) {
                var _index = this.resVersions.findIndex(function(elem) {
                    return elem.id == resVersionId
                })

                if (_index != -1) {
                    this.resVersions.splice(_index, 1)
                }
            }

            loadResVersions(done) {
                this.resVersions.length = 0;
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "BuildId", op: "=", value: this.id});
                var _expression = { model: {name: "SysBuildRes"}, predicate: this.db.serialize(_predicate) };

                var that = this;
                this.db.getRoots([this.queryBuildResGuid], { rtype: "data", expr: _expression }, function(guids) {
                    var _root = that.db.getObj(guids.guids[0]);

                    var _resVersionsId = [];
                    var _elements = _root.getCol('DataElements');
                    for (var i = 0; i < _elements.count(); i++) {
                        _resVersionsId.push(_elements.get(i).resVerId())
                    }

                    that.db._deleteRoot(_root);

                    ResVersions.load(_resVersionsId, that.resVersions, function(){
                        that.state = ResUtils.state.loaded;
                        done();
                    });
                })
            }

            commit (transactionId) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    if (that.isConfirmed) {
                        resolve()
                    }

                    if (that.resVersions.length != 0) {
                        var _predicate = new Predicate(that.db, {});
                        _predicate.addCondition({field: "Id", op: "=", value: that.id});
                        var _expression = {
                            model: {name: "SysBuild"},
                            predicate: that.db.serialize(_predicate, true)
                        };

                        that.db.getRoots([that.commitGuid], {rtype: "data", expr: _expression}, function (guids) {
                            var _root = that.db.getObj(guids.guids[0]);

                            var _options = {};
                            if (transactionId) {
                                _options.transactionId = transactionId;
                            }

                            _root.edit(function() {
                                var _build = _root.getCol('DataElements').get(0);
                                _build.isConfirmed(true);
                                _root.save(_options, function(result) {
                                    that.db._deleteRoot(_root);

                                    if (result.result == "OK") {
                                        that.isConfirmed = true;
                                        that.state = ResUtils.state.changed;
                                        resolve();
                                    } else {
                                        reject(ResUtils.newDbError(result.message))
                                    }
                                });
                            });
                        })
                    } else {
                        that.db._deleteRoot(_root);
                        reject(ResUtils.newObjectError('No resources'))
                    }
                }
            }
        }
    }
);
