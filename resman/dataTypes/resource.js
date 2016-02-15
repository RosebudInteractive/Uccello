if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../../system/uobject'],
    function (UObject) {
        var Resource = UObject.extend({

            className: "Resource",
            classGuid: UCCELLO_CONFIG.classGuids.Resource,
            metaFields: [
                { fname: "ResName", ftype: "string" },
                { fname: "_Counter", ftype: "int" }
            ],

            elemNamePrefix: "Element",

            resName: function (value) {
                return this._genericSetter("ResName", value);
            },

            getNextElemName: function (value) {
                var cnt = this._counter();
                cnt = cnt ? cnt : 0;
                return this.elemNamePrefix + this._counter(++cnt);
            },

            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this._elemsByName = {};
            },

            getResElemByName: function (name) {
                return this._elemsByName[name] ? this._elemsByName[name].resElemObj : null;
            },

            _counter: function (value) {
                return this._genericSetter("_Counter", value);
            },

            _addResElem: function (resElemObj) {
                var ResElemName = resElemObj.resElemName();
                if (this._elemsByName[ResElemName] !== undefined) {
                    var col = resElemObj.getParentCol();
                    if (col)
                        col._del(resElemObj);
                    throw new Error("\"" + ResElemName + "\" is already defined.");
                }
                var handler = {
                    type: 'mod%ResElemName',
                    subscriber: this,
                    callback: this._getOnResElemNameChangeProc(resElemObj)
                };
                this._elemsByName[ResElemName] = {
                    resElemObj: resElemObj,
                    handler: handler
                };
                resElemObj.event.on(handler);
            },

            _delResElem: function (resElemObj) {
                var obj = this._elemsByName[resElemObj.resElemName()];
                if (obj) {
                    delete this._elemsByName[resElemObj.resElemName()];
                    obj.resElemObj.event.on(obj.handler);
                };
            },

            _getOnResElemNameChangeProc: function (resElemObj) {
                var self = this;
                var oldResElemName = resElemObj.resElemName();

                return function (args) {
                    var ResElemName = resElemObj.resElemName();

                    if (ResElemName !== oldResElemName) {

                        if (self._elemsByName[ResElemName] !== undefined) {
                            resElemObj.set("ResElemName", oldResElemName);
                            throw new Error("Can't change resource element name from \"" +
                                oldResElemName + "\" to \"" + ResElemName + "\". \"" + ResElemName + "\" is already defined.");
                        };

                        var obj = self._elemsByName[oldResElemName];
                        delete self._elemsByName[oldResElemName];
                        self._elemsByName[ResElemName] = obj;

                        oldResElemName = ResElemName;
                    };
                };
            }

        });

        return Resource;
    }
);