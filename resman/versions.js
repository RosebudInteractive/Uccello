/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([
        './resUtils',
        'events',
        './version'
    ],

    function(ResUtils, EventEmitter, Version) {

        return UccelloClass.extend({

            init : function(db) {
                this.db = db;
                this.state = ResUtils.state.new;
                this.versions = [];
                this.current = null;
                this.events = new EventEmitter();

                this.queryBuildResGuid = '81e37311-6be7-4fc2-a84a-77a28ee342d4';
            },

            load : function(done) {
                if (this.isLoaded()) {
                    done()
                } else {
                    var that = this;

                    this.db.getRoots([this.queryBuildResGuid], { rtype: "data", expr: {model : { name: "SysVersion" }} }, function (guids) {
                        var _objectGuid = guids.guids[0];
                        that.queryBuildResGuid = _objectGuid;

                        var _elements = that.db.getObj(_objectGuid).getCol('DataElements');
                        for (var i = 0; i < _elements.count(); i++) {
                            that.versions.push(new Version(that.db, _elements.get(i)))
                        }

                        that.state = ResUtils.state.loaded;
                        done();
                    });
                }
            },

            isLoaded : function() {
                return this.state == ResUtils.state.loaded;
            },

            getById : function(id) {
                return this.versions.find(function(version) {
                    return version.id == id
                })
            },

            setCurrent : function(versionId) {
                if ((!this.current) || (this.current.id != versionId)) {
                    this.current = this.getById(versionId);
                    this.events.emit('changeCurrent')
                }
            }
        });
    }

);