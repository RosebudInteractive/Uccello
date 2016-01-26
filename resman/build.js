/**
 * Created by staloverov on 26.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


define([
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate',
        './resUtils'
    ],

    function(Predicate, ResUtils) {

        function ResVersion(resVersionObj) {
            this.id = resVersionObj.id();
            this.resVer = resVersionObj.resVer();
            this.hash = resVersionObj.hash();
            this.resBody = resVersionObj.resBody();
            this.description = resVersionObj.description();
            this.resId = resVersionObj.resId();
        }


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

                this.queryResVersionsGuid = 'f447d844-9ad4-4a89-ad41-347427c17e3b';
                this.commitGuid = 'd53fa310-a5ce-4054-97e0-c894a03d3719';
            },

            addResVersion : function(resVersionId) {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    var _predicate = new Predicate(that.db, {});
                    _predicate.addCondition({field: "Id", op: "=", value: 0});
                    var _expression = { model: {name: "SysBuildRes"}, predicate: that.db.serialize(_predicate) };

                    that.db.getRoots([this.queryResVersionsGuid], {rtype: "data", expr: _expression}, function (guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryResVersionsGuid = _objectGuid;

                        that.db.getObj(_objectGuid).newObject({
                            fields: {
                                BuildId: that.Id,
                                ResVerId: resVersionid
                            }
                        }, function (result) {
                            if (result.result == 'OK') {
                                that.resVersions.push(new ResVersion(that.db.getObj(result.newObject)));
                                resolve()
                            } else {
                                reject(new Error({reason : ResUtils.errorReasons.dbError, message : result.message}));
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
                this.db.getRoots([this.queryResVersionsGuid], { rtype: "data", expr: _expression }, function(guids) {
                    var _objectGuid = guids.guids[0];
                    that.queryResVersionsGuid = _objectGuid;

                    var _elements = that.db.getObj(_objectGuid).getCol('DataElements');
                    for (var i = 0; i < _elements.count(); i++) {
                        that.resVersions.push(new ResVersion(_elements.get(i)))
                    }

                    that.state = ResUtils.state.loaded;
                    done();
                })
            },

            commit : function() {
                var that = this;
                return new Promise(promiseBody);

                function promiseBody(resolve, reject) {
                    if (that.resVersions.length != 0) {
                        var _predicate = new Predicate(this.db, {});
                        _predicate.addCondition({field: "Id", op: "=", value: this.id});
                        var _expression = {
                            model: {name: "SysBuild"},
                            predicate: that.db.serialize(_predicate)
                        };

                        that.db.getRoots([that.commitGuid], {rtype: "data", expr: _expression}, function (guids) {
                            var _objectGuid = guids.guids[0];
                            that.commitGuid = _objectGuid;

                            var _obj = that.db.getObj(_objectGuid);
                            _obj.edit(function() {
                                var _build = _obj.getCol('DataElements').get(0);
                                _build.isConfirmed(true);
                                _obj.save(function(result) {
                                    if (result.result == "OK") {
                                        resolve(that.id)
                                    } else {
                                        reject(new Error({reason : ResUtils.errorReasons.dbError, message : result.message}))
                                    }
                                });
                            });
                        })
                    } else {
                        reject(new Error({reason : ResUtils.errorReasons.objectError, message : 'No resources'}))
                    }
                }
            }
        })
    }
);
