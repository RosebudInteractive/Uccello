if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['../system/uobject'],
    function(UObject) {
        var CollectionIndex = UObject.extend({

            className: "CollectionIndex",
            classGuid: UCCELLO_CONFIG.classGuids.CollectionIndex,
            metaCols: [{"cname": "IndexFields", "ctype": "IndexField"}],
            metaFields: [
                {fname:"Name",ftype:"string"},
                {fname: "CollectionName", ftype: "string"},
                {fname: "KeepUpdated", ftype: "boolean"}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);

                this._index = [];
                this._currentPos = -1;

            },
            name: function(value) {
                return this._genericSetter("Name", value);
            },
            collectionName: function(value) {
                return this._genericSetter("CollectionName", value);
            },
            keepUpdated: function(value) {
                return this._genericSetter("KeepUpdated", value);
            },
            build: function() {
                this._checkFields();

                var col = this.getParent().getCol(this.collectionName());
                var colType = col.getColType();


            },
            count: function() {
                return this._index.length;
            },
            _checkFields: function() {
                var col = this.getParent().getCol(this.collectionName());
                var colType = col.getColType();
                // TODO проверить соответствие полей
            },

            _sortFunc: function(a, b) {
                var result = 0;

                var fieldsCol = this.getCol("IndexFields");
                // цикл по полям индекса
                for (var i = 0, len = fieldsCol.count(); i < len; i++) {
                    var field = fieldsCol.get(0);
                    var fieldName = field.fieldName();
                    var ascendant = field.ascendant();
                    var order = (ascendant ? 1 : -1);
                    var aVal = a[fieldName]();
                    var bVal = b[fieldName]();


                    // Если значения равны, то сравниваем след. поле
                    if (aVal == bVal) continue;
                    if (aVal < bVal) return -1 * order;
                    else return 1 * order;
                }
                return result;
            }

        });
        return CollectionIndex;
    }
);