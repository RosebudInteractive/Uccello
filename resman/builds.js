/**
 * Created by staloverov on 22.01.2016.
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

        function Build(buildObj) {
            this.id = buildObj.id();
            this.buildNum = buildObj.buildNum();
            this.isConfirmed = buildObj.isConfirmed();
            this.description = buildObj.description();
            this.versionId = buildObj.versionId();
            this.resVersions = [];
        }

        return UccelloClass.extend({

            init: function (db, directories) {
                this.db = db;
                this.builds = [];
                this.directories = directories;
                this.state = ResUtils.state.new;
                this.current = null;

                this.queryGuid = 'eaec63f9-d15f-4e9d-8469-72ddca96cc16';
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
                    this.db.getRoots([this.queryGuid], { rtype: "data", expr: _expression }, function(guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryGuid = _objectGuid;

                        var _elements = that.db.getObj(_objectGuid).getCol('DataElements');
                        if (_elements.count() == 0) {
                            callback(null)
                        } else
                        {
                            _build = new Build(that.db, _elements.get(0));
                            that.builds.push(_build);
                            _build.loadResources(function() {
                                callback(_build);
                            });
                        }
                    })
                }
            },

            loadCurrentBuild : function(callback) {
                if (!this.current) {
                    var _currentVersion = this.directories.getCurrentVersion();
                    var that = this;

                    this.loadBuild(_currentVersion.currBuildId, function (build) {
                        that.current = build;
                        callback(build);
                    })
                } else {
                    callback(this.current)
                }
            },

            getById : function(id) {
                return this.builds.find(function(build) {
                    return build.id == id
                })
            },

            commitCurrentBuild : function(callback) {

            }

        });
    }
)
