if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../../system/uobject'],
    function (UObject) {
        var ResElem = UObject.extend({

            className: "ResElem",
            classGuid: UCCELLO_CONFIG.classGuids.ResElem,
            metaFields: [
                { fname: "ResElemName", ftype: "string" }
            ],

            resElemName: function (value) {
                return this._genericSetter("ResElemName", value);
            },

            init: function (cm, params) {

                this._collection = null;
                this._collection_handler = null;
                this._collection_p_handler = null;
                UccelloClass.super.apply(this, [cm, params]);

            },

            onAddToCollection: function (collection, isParentAdded) {
                this._collection = collection;
                if (this._collection) {
                    var resource = this.getRoot();
                    if (resource && resource.isInstanceOf(UCCELLO_CONFIG.classGuids.Resource)) {
                        resource._addResElem(this);
                        this._collection_handler = {
                            type: 'del',
                            subscriber: this,
                            callback: this._onDeleteMySelf
                        };
                        this._collection_p_handler = {
                            type: 'delParent',
                            subscriber: this,
                            callback: this._onDeleteMySelf
                        };
                        this._collection.on(this._collection_handler);
                        this._collection.on(this._collection_p_handler);
                    }
                    else
                        throw new Error("Resource of resource element \"" + this.resElemName() + "\" is undefined or has wrong type.");

                };
            },

            _onDeleteMySelf: function (args) {
                var objDeleted = args.obj;
                if (this._collection && (this === objDeleted)) {
                    var resource = this.getRoot();
                    if (resource && resource.isInstanceOf(UCCELLO_CONFIG.classGuids.Resource)) {
                        resource._delResElem(this);
                        if (this._collection_handler)
                            this._collection.off(this._collection_handler);
                        if (this._collection_p_handler)
                            this._collection.off(this._collection_p_handler);
                        this._collection = null;
                        this._collection_handler = null;
                        this._collection_p_handler = null;
                    }
                    else
                        throw new Error("Resource of resource element \"" + this.resElemName() + "\" is undefined or has wrong type.");

                };
            },

        });

        return ResElem;
    }
);