/**
 * Created by staloverov on 22.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


define(['./resUtils'],
    function(ResUtils) {

        function ResType(resTypeObj) {
            this.id = resTypeObj.id();
            this.code = resTypeObj.code();
            this.name = resTypeObj.name();
            //this.className = resTypeObj.className();
            this.resTypeGuid = resTypeObj.resTypeGuid();
        }

        return UccelloClass.extend({

            init : function(db) {
                this.db = db;
                this.state = ResUtils.state.new;
                this.types = [];
                this.queryBuildResGuid = 'd53fa310-a5ce-4054-97e0-c894a03d3719';
            },

            getByGuid : function(typeGuid) {
                return this.types.find(function(resType) {
                    return resType.resTypeGuid == typeGuid
                })
            },

            load : function(done) {
                var that = this;
                this.db.getRoots([this.queryBuildResGuid], {rtype: "data", expr: {model: {name: "SysResType"}}}, function(guids) {
                    var _root = that.db.getObj(guids.guids[0]);

                    var _elements = _root.getCol('DataElements');

                    for (var i = 0; i < _elements.count(); i++) {
                        var _resType = new ResType(_elements.get(i));
                        that.types.push(_resType);
                    }

                    that.state = ResUtils.state.loaded;
                    that.db._deleteRoot(_root);
                    done();
                })
            },

            isLoaded : function() {
                return this.state == ResUtils.state.loaded;
            }
        });
    }
);