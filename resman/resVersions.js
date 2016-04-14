/**
 * Created by staloverov on 26.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

var _instance = null;

define([UCCELLO_CONFIG.uccelloPath + '/predicate/predicate', './resUtils'],

    function(Predicate, ResUtils) {

        function ResVersion(resVersionObj) {
            this.id = resVersionObj.id();
            this.resVer = resVersionObj.resVer();
            this.hash = resVersionObj.hash();
            this.resBody = resVersionObj.resBody();
            this.description = resVersionObj.description();
            this.resId = resVersionObj.resId();
        }

        var  ResVersions = UccelloClass.extend({
            init: function (db) {
                this.db = db;
                this.queryGuid = '99abb520-3c5b-4c2c-a2fe-5aab01da7aa6';
            }
        });

        ResVersions.init = function(db) {
            if (!_instance) {
                _instance = new ResVersions(db)
            }
        };

        ResVersions.load = function (IdArray, resultArray, done) {
                if (IdArray.length == 0) {
                    done()
                } else {
                    var _predicate = new Predicate(_instance.db, {});
                    if (IdArray.length == 1) {
                        _predicate.addCondition({field: "Id", op: "=", value: IdArray[0]});
                    } else {
                        _predicate.addCondition({field: "Id", op: "in", value: IdArray});
                    }
                    var _expression = {model: {name: "SysResVer"}, predicate: _instance.db.serialize(_predicate)};

                    _instance.db.getRoots([_instance.queryGuid], {rtype: "data", expr: _expression}, function (guids) {
                        var _objectGuid = guids.guids[0];
                        _instance.queryGuid = _objectGuid;

                        var _elements = _instance.db.getObj(_objectGuid).getCol('DataElements');
                        for (var i = 0; i < _elements.count(); i++) {
                            resultArray.push(new ResVersion(_elements.get(i)));
                        }

                        done();
                    })
                }
            };

        ResVersions.createNew = function(fields, transactionId) {
            var that = _instance;
            return new Promise(promiseBody);

            function promiseBody(resolve, reject) {

                var _predicate = new Predicate(that.db, {});
                _predicate.addCondition({field: "Id", op: "=", value: 0});

                var _model = {name: "SysResVer"};
                if ((fields) && (fields.ResBody)){
                    var _resource = JSON.parse(fields.ResBody);
                    if (_resource.hasOwnProperty('getModelDescription')){
                        _model = _resource.getModelDescription()
                    }
                }


                var _expression = {
                    model: _model, //{name: "SysResVer"},
                    predicate: that.db.serialize(_predicate)
                };

                that.db.getRoots([that.queryGuid], { rtype: "data", expr: _expression }, function (guids) {
                    var _objectGuid = guids.guids[0];
                    that.queryGuid = _objectGuid;

                    var _options = {};
                    if (transactionId) {
                        _options.transactionId = transactionId;
                    }

                    that.db.getObj(_objectGuid).newObject({fields : fields}, _options, function (result) {
                        if (result.result == 'OK') {
                            if ((_resource) && (_resource.hasOwnProperty('onSave'))){
                                _resource.onSave(result.newObject)
                            }

                            var _resVersion = new ResVersion(that.db.getObj(result.newObject));
                            resolve(_resVersion);
                        } else {
                            reject(ResUtils.newDbError(result.message))
                        }
                    });
                })
            }
        };

        return ResVersions;
    }
);
