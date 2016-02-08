/**
 * Created by staloverov on 26.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


define([
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        './resUtils',
        './resVersions'
    ],

    function(Predicate, ResUtils, ResVersions) {

        return UccelloClass.extend({

            init: function (db, buildObj) {
                this.db = db;
                this.id = buildObj.id();
                this.buildNum = buildObj.buildNum();
                this.isConfirmed = buildObj.isConfirmed();
                this.description = buildObj.description();
                this.versionId = buildObj.versionId();
                this.resVersions = [];
                this.state = ResUtils.state.new;

                this.queryBuildResGuid = 'f447d844-9ad4-4a89-ad41-347427c17e3b';
                this.commitGuid = 'd53fa310-a5ce-4054-97e0-c894a03d3719';
            },

            isLoaded : function() {
                return this.state == ResUtils.state.loaded
            },

            addResVersion : function(resVersionId, transactionId) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    var _predicate = new Predicate(that.db, {});
                    _predicate.addCondition({field: "Id", op: "=", value: 0});
                    var _expression = { model: {name: "SysBuildRes"}, predicate: that.db.serialize(_predicate) };

                    that.db.getRoots([that.queryBuildResGuid], {rtype: "data", expr: _expression}, function (guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryBuildResGuid = _objectGuid;

                        var _options = {};
                        if (transactionId) {
                            _options.transactionId = transactionId;
                        }

                        that.db.getObj(_objectGuid).newObject({
                            fields: {
                                BuildId: that.id,
                                ResVerId: resVersionId
                            }
                        }, _options, function (result) {
                            if (result.result == 'OK') {
                                resolve()
                            } else {
                                reject(ResUtils.newDbError(result.message));
                            }
                        });
                    })
                }

            },

            loadResVersions : function(done) {
                this.resVersions.length = 0;
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "BuildId", op: "=", value: this.id});
                var _expression = { model: {name: "SysBuildRes"}, predicate: this.db.serialize(_predicate) };

                var that = this;
                this.db.getRoots([this.queryBuildResGuid], { rtype: "data", expr: _expression }, function(guids) {
                    var _objectGuid = guids.guids[0];
                    that.queryBuildResGuid = _objectGuid;

                    var _resVersionsId = [];
                    var _elements = that.db.getObj(_objectGuid).getCol('DataElements');
                    for (var i = 0; i < _elements.count(); i++) {
                        _resVersionsId.push(_elements.get(i).resVerId())
                    }

                    ResVersions.load(_resVersionsId, that.resVersions, function(){
                        that.state = ResUtils.state.loaded;
                        done();
                    });
                })
            },

            commit : function(transactionId) {
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
                            predicate: that.db.serialize(_predicate)
                        };

                        that.db.getRoots([that.commitGuid], {rtype: "data", expr: _expression}, function (guids) {
                            var _objectGuid = guids.guids[0];
                            that.commitGuid = _objectGuid;

                            var _options = {};
                            if (transactionId) {
                                _options.transactionId = transactionId;
                            }

                            var _obj = that.db.getObj(_objectGuid);
                            _obj.edit(function() {
                                var _build = _obj.getCol('DataElements').get(0);
                                _build.isConfirmed(true);
                                _obj.save(_options, function(result) {
                                    if (result.result == "OK") {
                                        resolve();
                                        that.isConfirmed = true;
                                        that.state = ResUtils.state.changed;
                                    } else {
                                        reject(ResUtils.newDbError(result.message))
                                    }
                                });
                            });
                        })
                    } else {
                        reject(ResUtils.newObjectError('No resources'))
                    }
                }
            }
        })
    }
);
