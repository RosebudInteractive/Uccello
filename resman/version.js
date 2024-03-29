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
        './builds'
    ],

    function(Predicate, ResUtils, Builds) {
        return UccelloClass.extend({

            init : function(db, versionObj) {
                this.db = db;
                this.parseDbObject(versionObj);

                this.state = ResUtils.state.new;
                this.editQueryGuid = 'cbb11969-2478-4b6a-a012-d0c62c40a4e2';
            },

            parseDbObject: function (versionObj) {
                this.id = versionObj.id();
                this.code = versionObj.code();
                this.name = versionObj.name();
                this.description = versionObj.description();
                this.prodId = versionObj.prodId();
                this.currBuildId = versionObj.currBuildId();
                this.lastConfirmedBuildId = versionObj.lastConfirmedBuildId();
                this.state = ResUtils.state.loaded;
            },

            setLastConfirmedBuild : function(transactionId){
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    var _predicate = new Predicate(that.db, {});
                    _predicate.addCondition({field: "Id", op: "=", value: that.id});
                    var _expression = { model: {name: "SysVersion"}, predicate: that.db.serialize(_predicate, true) };

                    that.db.getRoots([that.editQueryGuid], {rtype: "data", expr: _expression}, function (guids) {
                        var _root = that.db.getObj(guids.guids[0]);

                        var _options = {};
                        if (transactionId) {
                            _options.transactionId = transactionId;
                        }

                        _root.edit(function() {
                            var _version = _root.getCol('DataElements').get(0);
                            _version.lastConfirmedBuildId(that.currBuildId);
                            that.state = ResUtils.state.changed;
                            _root.save(_options, function(result) {
                                if (result.result == "OK") {
                                    that.parseDbObject(_version);
                                    that.db._deleteRoot(_root);
                                    resolve()
                                } else {
                                    that.db._deleteRoot(_root);
                                    reject(ResUtils.newDbError(result.message))
                                }
                            });
                        });
                    })
                }
            },

            setCurrentBuild : function(buildId, transactionId) {
                var that = this;
                return new Promise(function(resolve, reject) {
                    Builds.loadBuild(buildId, function(build) {
                            if (!build) {
                                reject(ResUtils.newObjectError('Can not load build with id ' + buildId))
                            } else {
                                promiseBody(resolve, reject);
                            }
                        }
                    )
                });

                function promiseBody(resolve, reject) {
                    var _predicate = new Predicate(that.db, {});
                    _predicate.addCondition({field: "Id", op: "=", value: that.id});
                    var _expression = {model: {name: "SysVersion"}, predicate: that.db.serialize(_predicate, true)};

                    that.db.getRoots([that.editQueryGuid], {rtype: "data", expr: _expression}, function (guids) {
                        var _root = that.db.getObj(guids.guids[0]);

                        var _options = {};
                        if (transactionId) {
                            _options.transactionId = transactionId;
                        }

                        _root.edit(function () {
                            var _version = _root.getCol('DataElements').get(0);
                            _version.currBuildId(buildId);
                            that.state = ResUtils.state.changed;
                            _root.save(_options, function (result) {
                                if (result.result == "OK") {
                                    that.parseDbObject(_version);
                                    that.db._deleteRoot(_root);
                                    resolve()
                                } else {
                                    that.db._deleteRoot(_root);
                                    reject(ResUtils.newDbError(result.message));
                                }
                            });
                        });
                    })
                }
            },

            revertToLastConfirmedBuild : function() {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    if (!that.lastConfirmedBuildId) {
                        resolve()
                    } else {
                        that.setCurrentBuild(that.lastConfirmedBuildId).then(
                            function () {
                                resolve()
                            },
                            function (reason) {
                                reject(reason)
                            }
                        )
                    }
                }
            }
        })
    }
);


