if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['../system/uobject', './metaDefs'],
    function (UObject, Meta) {
        var MetaObjTree = UObject.extend({

            className: "MetaObjTree",
            classGuid: UCCELLO_CONFIG.classGuids.MetaObjTree,
            metaFields: [
                { fname: "Name", ftype: "string" },
                { fname: "TableName", ftype: "string" }
            ],

            metaCols: [
                { "cname": "Childs", "ctype": "MetaObjTreeElem" }
            ],

            name: function (value) {
                return this._genericSetter("Name", value);
            },

            tableName: function (value) {
                return this._genericSetter("TableName", value);
            },

            init: function (cm, params) {

                UccelloClass.super.apply(this, [cm, params]);
                this._childs = {};

                if (params) {
                    this._childsCol = this.getCol("Childs");
                    this._childsCol.on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddField
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteField
                    });

                    if (!this.getDB()._metaDataMgr)
                        new this.getDB().getMetaDataMgrConstructor(this.getDB(), {});
                };
            }
        });

        return MetaObjTree;
    }
);