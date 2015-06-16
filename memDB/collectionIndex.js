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
                //this._elidx = {};
                this._currentPos = -1;
                this._uptodate = false;
                this._currentFindPos = -1;
                this._isSortedSearch = false;
                this._searchKeys = {};
                this._fieldsIdx = {};
            },
            /**
             * ��������
             * @param value
             * @returns {*}
             */
            name: function(value) {
                return this._genericSetter("Name", value);
            },
            collectionName: function(value) {
                return this._genericSetter("CollectionName", value);
            },
            keepUpdated: function(value) {
                return this._genericSetter("KeepUpdated", value);
            },

            /**
             * ���������� �������
             */
            build: function() {
                this._checkFields();

                var col = this.getParent().getCol(this.collectionName());
                var colType = col.getColType();

                this._index = this._copyColElements();
                var that = this;
                this._index.sort(function(a, b) {
                    return that._sortFunc(a, b);
                });

                // �������� ����� �����
                var fieldsCol = this.getCol("IndexFields");
                for (var i = 0; i < fieldsCol.count(); i++) {
                    var idxField = fieldsCol.get(i);
                    this._fieldsIdx[idxField.fieldName()] = i;
                }


                //this._rebuildElIdx();

                if (this.keepUpdated()) {
                    col.on([{
                        type: 'add',
                        subscriber: this,
                        callback: this._onCollectionChanged
                    }, {
                        type: 'del',
                        subscriber: this,
                        callback: this._onCollectionChanged
                    }]);
                }
            },

            /**
             * ���������� ��������� ���������
             * @param eventArgs
             * @private
             */
            _onCollectionChanged: function(eventArgs) {
                if (eventArgs.type == "add") {
                    this._addToSortedArray(eventArgs.obj);
                } else {
                    this._deleteFromIndex(eventArgs.obj);
                }
                this._uptodate = false;
            },

            /**
             * ������� ������ �� �������
             * @param rec {MemObj}
             * @private
             */
            _deleteFromIndex: function(rec) {
                var idx = this._index.indexOf(rec);
                if (idx === -1) return;
                this._index.splice(idx, 1);
                //this._rebuildElIdx();
            },

            /**
             * ��������� ������� � ������������� ������
             * @param rec {MemObj}
             * @private
             */
            _addToSortedArray: function(rec) {
                var end = this._index.length - 1;
                var begin = 0;
                if (this._index.length == 0 || this._sortFunc(this._index[end], rec) <= 0) {
                    this._index.push(rec);
                } else {
                    if (this._sortFunc(this._index[0], rec) >= 0)
                        this._index.unshift(rec);
                    else
                        while (true) {
                            var pos = Math.floor((end - begin)/2) + begin;
                            var curRec = this._index[pos];
                            if (this._sortFunc(curRec, rec) <= 0) begin = pos;
                            if (this._sortFunc(curRec, rec) >= 0) end = pos;
                            if ((end - begin) == 0) {
                                this._index.splice(pos, 0, rec);
                                break;
                            } else if ((end - begin) == 1) {
                                this._index.splice(pos + 1, 0, rec);
                                break;
                            }
                        }
                }
                //this._rebuildElIdx();
            },

            /**
             * ������������� ������ �� Lid
             * @private
             */
            /*_rebuildElIdx: function() {
                this._elidx = {};
                for (var i = 0; i < this._index.length; i++) {
                    var cur = this._index[i];
                    this._elidx[cur.getLid()] = i;
                }
            },*/

            /**
             * �������� �������� ��������� � ������ �������
             * @returns {Array}
             * @private
             */
            _copyColElements: function() {
                var result = [];
                var col = this.getParent().getCol(this.collectionName());
                var colType = col.getColType();

                for (var i = 0, len = col.count(); i < len; i++)
                    result.push(col.get(i));

                return result;
            },

            /**
             * ���������� ���������� ���������
             * @returns {Number}
             */
            count: function() {
                return this._index.length;
            },

            /**
             * ��������� ������� ����� ������� � ��������� �������
             * @private
             */
            _checkFields: function() {
                var col = this.getParent().getCol(this.collectionName());
                var colType = col.getColType();
                // TODO ��������� ������������ �����
            },

            /**
             * ������� ����������
             * @param a {MemObj} - ������ �������
             * @param b {MemObj} - ������
             * @returns {number} - > 0 ���� a > b, < 0 ���� a < b, 0 ���� a = b
             * @private
             */
            _sortFunc: function(a, b) {
                var result = 0;

                var fieldsCol = this.getCol("IndexFields");
                // ���� �� ����� �������
                for (var i = 0, len = fieldsCol.count(); i < len; i++) {
                    var field = fieldsCol.get(0);
                    var fieldName = field.fieldName();
                    var ascendant = field.ascendant();
                    var order = (ascendant ? 1 : -1);
                    var res = a.cmpFldVals(fieldName, b);

                    // ���� �������� �����, �� ���������� ����. ����
                    if (res == 0) continue;
                    else return (res * order);
                }
                return result;
            },

            /**
             * ���������� ������ ������� �������
             * @returns {MemObj}
             */
            first: function() {
                if (this._index.length == 0)
                    return null;
                this._currentPos = 0;
                this._uptodate = true;
                return this._index[0];
            },

            /**
             * ���������� ��������� ������� �������
             * @returns {MemObj}
             */
            next: function () {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                this._currentPos++;
                if (this._currentPos >= this._index.length)
                    return null;
                return this._index[this._currentPos];
            },

            /**
             * ���������� ���������� ������� �������
             * @returns {MemObj}
             */
            prev: function () {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                this._currentPos--;
                if (this._currentPos < 0)
                    return null;
                return this._index[this._currentPos];
            },

            /**
             * ���������� ��������� ������� �������
             * @returns {MemObj}
             */
            last: function () {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                if (this._index.length == 0)
                    return null;
                this._currentPos = this._index.length - 1;
                return this._index[this._currentPos];
            },

            /**
             * ���������� ������� ������� �������
             * @returns {MemObj}
             */
            current: function () {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                return this._index[this._currentPos];
            },

            /**
             * ���������� ������� ������� �������
             * @returns {MemObj}
             */
            currIdx: function () {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                return this._currentPos;
            },

            /**
             * ���������� ������� � ��������� ������� ������� � ������������� ������ �� ���
             * @param idx {int} - �������
             * @returns {MemObj}
             */
            goto: function (idx) {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                if (idx < 0 || idx >= this._index.length)
                    return null;
                this._currentPos = idx;
                return this._index[this._currentPos];
            },

            /**
             * ���������� ������ ������� �������, ��������������� ���������� ������
             * @param keys {*} - ��������� ������ � ������� { key1: value1, key2: value2 }
             * @returns {MemObj}
             */
            findFirst: function(keys) {
                this._searchKeys = keys;
                this._currentFindPos = -1;
                // �������� ����� �� ����������� ����� �� �������������� �������
                var sortedSearch = true;
                var fieldsCol = this.getCol("IndexFields");

                for (var i = 0; i < fieldsCol.count(); i++) {
                    var idxField = fieldsCol.get(i);
                    if (idxField.fieldName() in keys) continue;
                    // ���� ���� �����������, �� ���� ��������� ��� �� ������� ��������� �����
                    for (var j = i + 1; j < fieldsCol.count(); j++) {
                        idxField = fieldsCol.get(j);
                        if (idxField.fieldName() in keys) {
                            sortedSearch = false;
                            break;
                        }
                    }
                    break;
                }

                if (sortedSearch) {
                    // ��������, ��� ��� ���������� �������� ������ � ����
                    for (var key in keys) {
                        if (key == "constructor") continue;
                        var found = false;
                        for (var j = 0; j < fieldsCol.count(); j++) {
                            var idxField = fieldsCol.get(j);
                            if (idxField.fieldName() == key) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            sortedSearch = false;
                            break;
                        }
                    }
                }

                this._isSortedSearch = sortedSearch;

                if (sortedSearch) {
                    var end = this._index.length - 1;
                    var begin = 0;
                    if (this._index.length == 0 || this._compareToKeys(this._index[end], keys) <= 0) {
                        return null;
                    } else {
                        if (this._compareToKeys(this._index[0], keys) >= 0)
                            return null;
                        else {
                            var curRec = null;
                            while (true) {
                                var pos = Math.floor((end - begin) / 2) + begin;
                                curRec = this._index[pos];
                                if (this._compareToKeys(curRec, keys) <= 0) begin = pos;
                                if (this._compareToKeys(curRec, keys) >= 0) end = pos;
                                if ((end - begin) == 0) {
                                    if (this._compareToKeys(curRec, keys) != 0)
                                        curRec = null;
                                    break;
                                } else if ((end - begin) == 1) {
                                    pos++;
                                    curRec = this._index[pos];
                                    if (this._compareToKeys(curRec, keys) != 0)
                                        curRec = null;
                                    break;
                                }
                            }
                            if (curRec != null)
                                this._currentFindPos = pos;
                            return curRec;
                        }
                    }
                    //this._rebuildElIdx();
                } else
                    return this._searchUnsorted(keys, 0, 1);
            },

            /**
             * ���������� ��������� ������� �������, ��������������� ���������� ������
             * @returns {MemObj}
             */
            findNext: function() {
                return this._searchUnsorted(this._searchKeys, this._currentFindPos + 1, 1);
            },

            /**
             * ���������� ���������� ������� �������, ��������������� ���������� ������
             * @returns {MemObj}
             */
            findPrev: function() {
                return this._searchUnsorted(keys, this._currentFindPos - 1, -1);
            },

            /**
             * ����� ��� ����� ����������. ����������� ���� � ��������� ������ �� ������ ������ ���� �������
             * @returns {MemObj}
             */
            _searchUnsorted: function(keys, pos, direction) {
                for (var i = pos; (direction > 0 ? (i < this._index.length) : i >= 0); i+= direction) {
                    var obj = this._index[i];
                    if (this._compareToKeys(obj, keys) == 0) {
                        this._currentFindPos = i;
                        return obj;
                    }
                }
                return null;
            },

            /**
             * ������� ��������� ������� � ���������� ������
             * @returns {number} - > 0 ���� a > b, < 0 ���� a < b, 0 ���� a = b
             */
            _compareToKeys: function(obj, keys) {
                var fieldsCol = this.getCol("IndexFields");
                for (var i = 0; i < fieldsCol.count(); i++) {
                    var idxField = fieldsCol.get(0);
                    if (idxField.fieldName() in keys) {
                        var order =idxField.ascendant() ? 1 : -1;
                        var res = obj.cmpFldVals(key, keys[key]);
                        if (res == 0) continue;
                        else return (order * res);
                    }
                }
                return 0;
            },

            /**
             * ���������� ���� ������� �� �����
             * @param name {string} - ��� ��������� ����
             * @returns {IndexField} - ���� �������
             * @private
             */
            _getIndexField: function(name) {
                if (name in this._fieldsIdx)
                {
                    var fieldsCol = this.getCol("IndexFields");
                    return fieldsCol.get(this._fieldsIdx[name]);
                }
                return null;
            }
        });
        return CollectionIndex;
    }
);