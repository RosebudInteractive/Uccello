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
             * Свойства
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
             * Построение индекса
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

                // построим индех полей
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
             * Обработчик изменения коллекции
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
             * Удаляет объект из индекса
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
             * Вставляет элемент в сортированный список
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
             * Перестраивает индекс по Lid
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
             * Копирует элементы коллекции в массив индекса
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
             * Возвращает количество элементов
             * @returns {Number}
             */
            count: function() {
                return this._index.length;
            },

            /**
             * Проверяет наличие полей индекса в коллекции массива
             * @private
             */
            _checkFields: function() {
                var col = this.getParent().getCol(this.collectionName());
                var colType = col.getColType();
                // TODO проверить соответствие полей
            },

            /**
             * Функция сортировки
             * @param a {MemObj} - первый элемент
             * @param b {MemObj} - второй
             * @returns {number} - > 0 если a > b, < 0 если a < b, 0 если a = b
             * @private
             */
            _sortFunc: function(a, b) {
                var result = 0;

                var fieldsCol = this.getCol("IndexFields");
                // цикл по полям индекса
                for (var i = 0, len = fieldsCol.count(); i < len; i++) {
                    var field = fieldsCol.get(0);
                    var fieldName = field.fieldName();
                    var ascendant = field.ascendant();
                    var order = (ascendant ? 1 : -1);
                    var res = a.cmpFldVals(fieldName, b);

                    // Если значения равны, то сравниваем след. поле
                    if (res == 0) continue;
                    else return (res * order);
                }
                return result;
            },

            /**
             * Возвращает первый элемент индекса
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
             * Возвращает следующий элемент индекса
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
             * Возвращает предыдущий элемент индекса
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
             * Возвращает последний элемент индекса
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
             * Возвращает текущий элемент индекса
             * @returns {MemObj}
             */
            current: function () {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                return this._index[this._currentPos];
            },

            /**
             * Возвращает текущую позицию индекса
             * @returns {MemObj}
             */
            currIdx: function () {
                if (!this._uptodate)
                    throw "Collection was changed. Itteration is not valid";
                return this._currentPos;
            },

            /**
             * Возвращает элемент в указанной позиции индекса и устанавливает курсор на нее
             * @param idx {int} - позиция
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
             * Возвращает первый элемент индекса, соответствующий параметрам поиска
             * @param keys {*} - Параметры поиска в формате { key1: value1, key2: value2 }
             * @returns {MemObj}
             */
            findFirst: function(keys) {
                this._searchKeys = keys;
                this._currentFindPos = -1;
                // проверим можно ли производить поиск по сортированному массиву
                var sortedSearch = true;
                var fieldsCol = this.getCol("IndexFields");

                for (var i = 0; i < fieldsCol.count(); i++) {
                    var idxField = fieldsCol.get(i);
                    if (idxField.fieldName() in keys) continue;
                    // если поле отсутствует, то надо убедиться что не указано следующих полей
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
                    // Проверим, что все переданные значения входят в ключ
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
             * Возвращает следующий элемент индекса, соответствующий параметрам поиска
             * @returns {MemObj}
             */
            findNext: function() {
                return this._searchUnsorted(this._searchKeys, this._currentFindPos + 1, 1);
            },

            /**
             * Возвращает предыдущий элемент индекса, соответствующий параметрам поиска
             * @returns {MemObj}
             */
            findPrev: function() {
                return this._searchUnsorted(keys, this._currentFindPos - 1, -1);
            },

            /**
             * Поиск без учета сортировки. применяется если в критериях поиска не заданы первые поля индекса
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
             * Функция сравнения объекта с критериями поиска
             * @returns {number} - > 0 если a > b, < 0 если a < b, 0 если a = b
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
             * Возвращает поле индекса по имени
             * @param name {string} - имя ключевого поля
             * @returns {IndexField} - поле индекса
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