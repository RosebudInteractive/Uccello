/**
 * Created by staloverov on 21.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define([
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate'
    ],
    function(Predicate) {
        function Resource(resourceHeaderObj) {
            this.id = resourceHeaderObj.id();
            this.resGuid = resourceHeaderObj.resGuid();
            this.code = resourceHeaderObj.code();
            this.name = resourceHeaderObj.name();
            this.description = resourceHeaderObj.description();
            this.prodId = resourceHeaderObj.prodId();
            this.resTypeId = resourceHeaderObj.resTypeId();
            this.resBody = null;
        }


        var Resources = UccelloClass.extend({

            init : function(db) {
                this.db = db;
                this.resources = new Map();
                this.state = ResUtils.state.new;

                this.queryGuid = '15e20587-8a45-4e01-a135-b85544d32749';
            },

            getObject : function(guid, callback) {
                if (this.resources.has(guid)) {
                    callback(this.resources.get(guid))
                } else {
                    this.queryResourceObj(guid, function (obj) {
                        callback(obj)
                    })
                }
            },

            getBody : function(guid, callback) {

            },

            queryResourceObj : function(resourceGuid, callback) {
                var _predicate = new Predicate(this.db, {});
                _predicate.addCondition({field: "ResGuid", op: "=", value: resourceGuid});
                var _expression = {
                    model: {name: "SysResource"},
                    predicate: this.db.serialize(_predicate)
                };

                var that = this;
                this.db.getRoots([this.queryGuid], { rtype: "data", expr: _expression }, function (guids) {
                    var _objectGuid = guids.guids[0];
                    that.queryGuid = _objectGuid;

                    var _elements = that.db.getObj(_objectGuid).getCol('DataElements');

                    if (_elements.count() == 0) {
                        callback(null)
                    } else {
                        if (_elements.count() > 1) {
                            throw new Error('duplicate resource')
                        }

                        that.loadResourceBody(_elements.get(0), callback);
                    }
                });
            },

            loadResourceBody : function(resourceObj, callback){
                var _resource = new Resource(resourceObj);

                var _product = this.products.getById(_resource.prodId);
                if (!_product) {
                    throw Error('Undefined product')
                }

                var _version = this.versions.getById(_product.currVerId);
                if (!_version) {
                    throw Error('Undefined version')
                }

                var that = this;

                this.getResVersionsOfBuild(_version.currBuildId, function(buildResVersions) {
                    that.getResVersions(_resource.id, function(resVersions) {
                        var _resVer = resVersions.find(function(resVer){
                            var _id = buildResVersions.find(function(buildResVerId){
                                return buildResVerId == resVer.id
                            });
                            return !_id ? false : _id != 0;
                        });

                        if (_resVer) {
                            _resource.resBody = _resVer.resBody;
                            _resource.hash = _resVer.hash;
                            _resource.resVerNum = _resVer.resVer;
                            _resource.verDescription = _resVer.description;
                        }

                        that.resources.set(_resource.resGuid, _resource);
                        callback(_resource);
                    })
                });
            },


        });

        return Resources;
    }

);
