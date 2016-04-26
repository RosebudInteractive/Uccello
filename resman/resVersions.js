/**
 * Created by staloverov on 26.01.2016.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

var _instance = null;

define([UCCELLO_CONFIG.uccelloPath + '/predicate/predicate', './resUtils', 'crypto'],

    function(Predicate, ResUtils, Crypto) {

        function ResVersion(resVersionObj) {
            this.instanceGuid = resVersionObj.pvt.guid;
            this.guid = resVersionObj.parseGuid(resVersionObj.pvt.guid).guid;
            this.id = resVersionObj.id();
            this.resVer = resVersionObj.resVer();
            this.hash = resVersionObj.hash();
            this.resBody = resVersionObj.resBody();
            this.description = resVersionObj.description();
            this.resId = resVersionObj.resId();
        }

        var ResVersions = UccelloClass.extend({
            init: function (db) {
                this.db = db;
                this.queryGuid = '99abb520-3c5b-4c2c-a2fe-5aab01da7aa6';
                this.saveGuid = 'deba8d0a-c1e2-4619-9b0f-4c25846fc36f';
            }
        });

        ResVersions.init = function (db) {
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

        ResVersions.createNew = function (fields, transactionId) {
            var that = _instance;
            return new Promise(promiseBody);

            function promiseBody(resolve, reject) {

                var _predicate = new Predicate(that.db, {});
                _predicate.addCondition({field: "Id", op: "=", value: 0});

                var _model = {name: "SysResVer"};
                if ((fields) && (fields.ResBody)) {
                    var _resource = JSON.parse(fields.ResBody);
                    if (_resource.hasOwnProperty('getModelDescription')) {
                        _model = _resource.getModelDescription()
                    }
                }

                var _expression = {
                    model: _model,
                    predicate: that.db.serialize(_predicate)
                };

                that.db.getRoots([that.queryGuid], {rtype: "data", expr: _expression}, function (guids) {
                    var _objectGuid = guids.guids[0];
                    that.queryGuid = _objectGuid;

                    var _options = {};
                    if (transactionId) {
                        _options.transactionId = transactionId;
                    }

                    var _root = that.db.getObj(_objectGuid);
                    _root.edit(function(result){
                        if (result.result === 'OK') {
                            _root.newObject({fields: fields}, _options, function (result) {
                                if (result.result == 'OK') {
                                    var _resourceObject = _root.getDB().getObj(result.newObject);
                                    _saveObj(_resourceObject, _resource).
                                    then(function(){
                                       _root.save(_options, function(result){
                                           if (result.result == 'OK') {
                                               var _resVersion = new ResVersion(that.db.getObj(result.newObject));
                                               resolve(_resVersion);
                                           } else {
                                               reject(ResUtils.newDbError(result.message))
                                           }
                                       });
                                    }).
                                    catch(reject);
                                } else {
                                    reject(ResUtils.newDbError(result.message))
                                }
                            });
                        } else {
                            reject(ResUtils.newDbError(result.message))
                        }
                    });

                })
            }
        };

        ResVersions.saveResBody = function(resourceInstance, sysResVerObject, transactionId) {
            var that = _instance;
            return new Promise(function(resolve, reject){
                if (!(resourceInstance['getModelDescription'] && resourceInstance['onSave'])) {
                    reject(ResUtils.newObjectError('Resource can not be saved'))
                    //resolve()
                }

                var _predicate = new Predicate(that.db, {});
                _predicate.addCondition({field: "Id", op: "=", value: sysResVerObject.resVerId});
                var _expression = {
                    model: resourceInstance.getModelDescription(),
                    predicate: that.db.serialize(_predicate)
                };

                that.db.getRoots([that.saveGuid], {rtype: "data", expr: _expression}, function (guids) {
                    var _objectGuid = guids.guids[0];
                    that.saveGuid = _objectGuid;

                    var _options = {};
                    if (transactionId) {
                        _options.transactionId = transactionId;
                    }

                    var _root = that.db.getObj(_objectGuid);
                    var _resourceObj = _root.getCol("DataElements").get(0);

                    if (!_resourceObj) {
                        var _fields = {
                            $sys: {guid: sysResVerObject.verGuid},
                            fields: {
                                ResVer: sysResVerObject.resVerNum,
                                Hash: sysResVerObject.hash,
                                ResBody: sysResVerObject.resBody,
                                Description: sysResVerObject.verDescription,
                                ResId: sysResVerObject.id
                            }
                        };

                        _deleteInstance(sysResVerObject).
                        then(function () {_addResourceObject(_root, resourceInstance, _fields).then(resolve, reject)}
                        ).
                        catch(function(err) {
                            reject(err)
                        });
                    } else {
                        _editResourceObject(_resourceObj, resourceInstance).then(resolve, reject);
                    }
                })

            })

        };

        function _deleteInstance(sysResVerObject){
            var that = _instance;

            return new Promise(function(resolve, reject){

                var _predicate = new Predicate(that.db, {});
                _predicate.addCondition({field: "Guid", op: "=", value: sysResVerObject.verGuid});
                var _expression = {model: {name: "SysResVer"}, predicate: that.db.serialize(_predicate)};

                that.db.getRoots([that.queryGuid], {rtype: "data", expr: _expression}, function(guids) {
                    var _objectGuid = guids.guids[0];
                    that.queryGuid = _objectGuid;

                    var _root = that.db.getObj(_objectGuid);
                    if (_root.getCol('DataElements').count() > 0) {
                        var _instance = _root.getCol('DataElements').get(0).pvt.guid;
                        _root.deleteObject(_instance, {}, function (result) {
                            if (result.result == 'OK') {
                                resolve()
                            } else {
                                reject(new Error(result.message))
                            }
                        })
                    } else {
                        resolve()
                    }
                })
            })
        }

        function _editResourceObject(resourceObj, resourceInstance) {
            return new Promise(function (resolve, reject) {
                resourceObj.edit(function (result) {
                    if (result.result === 'OK') {
                        _saveObj(resourceObj, resourceInstance).
                        then(function(){
                            resourceObj.save({}, function (result) {
                                if (result.result === 'OK') {
                                    var _resVersion = new ResVersion(resourceObj);
                                    resolve(_resVersion);
                                } else {
                                    reject(ResUtils.newDbError(result.message))
                                }
                            })
                        }).
                        catch(reject)
                    } else {
                        reject(ResUtils.newDbError(result.message))
                    }
                });
            })
        }

        function _addResourceObject(root, resourceInstance, fields, options){
            return new Promise(function(resolve, reject) {
                root.edit(function(result){
                    if (result.result === 'OK') {
                        root.newObject(fields, options, function (result) {
                            if (result.result == 'OK') {
                                var _resourceObject = root.getDB().getObj(result.newObject);
                                _saveObj(_resourceObject, resourceInstance).
                                then(function(){
                                    root.save(options, function(result){
                                        if (result.result == 'OK') {
                                            var _resVersion = new ResVersion(_resourceObject);
                                            resolve(_resVersion);
                                        } else {
                                            reject(ResUtils.newDbError(result.message))
                                        }
                                    });
                                }).
                                catch(reject);
                            } else {
                                reject(ResUtils.newDbError(result.message))
                            }
                        });
                    } else {
                        reject(ResUtils.newDbError(result.message))
                    }
                });
            })
        }

        function _saveObj(resObject, resInstance){
            return new Promise(function(resolve, reject){
                resInstance.onSave(resObject).
                then(function(){
                    var _body = _getSerializedBody(resInstance);
                    resObject.resBody(_body);
                    resObject.hash(_getMD5(_body));
                    resolve()
                }).
                catch(reject)
            })
        }

        function _getSerializedBody(resObject){
            var _obj = _instance.db.serialize(resObject, true);
            if (!_obj){
                throw new Error('Can not serialize resource')
            } else {
                return JSON.stringify(_obj)
            }
        }

        function _getMD5(body){
            var md5sum = Crypto.createHash('md5');
            md5sum.update(body);
            return md5sum.digest('hex');
        }

        return ResVersions;
    }
);
