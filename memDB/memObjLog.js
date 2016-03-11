if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
	['./memVirtualLog'],
	function (MemVirtualLog) {
	    var MemObjLog = UccelloClass.extend({

	        init: function (obj, is_root_obj) {
	            this.pvt = {};

	            this.pvt.obj = null;
	            this._db = null;
	            if (!is_root_obj)
	                this._db = obj
	            else {
	                this.pvt.obj = obj;
	                this._db = obj.getDB();
	            };

	            this.pvt.log = [];
	            this.pvt.versions = {};
	            this.pvt.active = false;

	            this.pvt.newlog = true;  // новый корневой лог - до первой генерации дельты

	            this._virtualLogs = {};
	            this._objects = {};

	        },

	        truncate: function () {
	            this.pvt.log = [];
	        },

	        setActive: function (active) {
	            if (active) {
	                this.pvt.active = true;
	            }
	            else {
	                //this.truncate();
	                this.pvt.active = false;
	            }
	        },

	        getActive: function () {
	            return this.pvt.active;
	        },

	        getObj: function () {
	            return this.pvt.obj;
	        },

	        getDB: function () {
	            return this._db;
	        },

	        /**
             * Проиграть назад изменения по логу корневого объекта
			 * @param {number} version - номер версии, до которого нужно откатить
             */
	        undo: function (version) {
	            var ver1 = String(version + 1);
	            if (!(ver1 in this.pvt.versions)) return;
	            var log = this.pvt.log;
	            var db = this.getObj().getDB();
	            this.setActive(false);
	            for (var i = log.length - 1; i >= this.pvt.versions[version + 1]; i--) {
	                var c = log[i];
	                var s = c.obj.getGuid();
	                switch (c.type) {
	                    case "mp":
	                        for (var fld in c.flds)
	                            c.obj.set(fld, c.flds[fld].old);
	                        break;
	                    case "add": // удалить ранее добавленный объект
	                        var par = c.obj.getParent();
	                        par.getCol(c.colName)._del(c.obj);
	                        break;
	                    case "del":
	                        var o = db.getObj(c.guid);
	                        //var cb = db._cbGetNewObject(db.getObj(c.guid).getRoot().getGuid());
	                        //if (!cb) 
	                        cb = db.getDefaultCompCallback();
	                        if (cb)
	                            db.deserialize(c.delObj, { obj: o, colName: c.colName }, cb);
	                        else
	                            if (DEBUG) console.error("Can't restore object \"" + c.delObj.$sys.guid +
                                    "\" because callback function doesn't exist.");
	                        break;
	                }
	            }
	            this.setActive(true);
	        },

	        /**
             * сгенерировать "дельту" изменений по логу объекта
             */
	        genDelta: function () {
	            var delta = {};
	            var deltaIdx = {};
	            delta.items = [];

	            var log = this.pvt.log;
	            //if (log.length == 0) return null;
	            var obj = this.getObj();
	            var db = obj.getDB();

	            var sver = this.getObj().getRootVersion("sent"); // VER определяем с какой по какую версию делать лог
	            var ver = this.getObj().getRootVersion();

	            if (ver == sver) return null;
	            var k = 1;
	            while ((this.pvt.versions[sver + k] == undefined) && (sver + k <= ver)) k++;
	            if (this.pvt.versions[sver + k] == undefined) return null;

	            function next_delta_item(c) {
	                var res = {};
	                res.guid = c.obj.getGuid();
	                deltaIdx[s] = delta.items.length;
	                delta.items.push(res);
	                return res;
	            };

	            var start = this.pvt.versions[sver + k];
	            for (var i = start; i < log.length; i++) {
	                var c = log[i];
	                var s = c.obj.getGuid();
	                if (!(s in deltaIdx)) {
	                    var curd = next_delta_item(c);
	                    //var curd = {};
	                    //curd.guid = c.obj.getGuid();
	                    //deltaIdx[s] = delta.items.length;
	                    //delta.items.push(curd); 
	                    // TODO добавить элемент для идентификации
	                }
	                else
	                    curd = delta.items[deltaIdx[s]];

	                switch (c.type) {
	                    // изменение поля (свойства)
	                    case "mp":
	                        if (!("fields" in curd)) curd.fields = {};
	                        for (var fld in c.flds)
	                            curd.fields[fld] = c.flds[fld].new;
	                        break;
	                        // добавление объекта в иерархию
	                    case "add":
	                        if (curd.deleted) {
	                            //curd = next_delta_item(c);
	                            curd.replace = c.adObj;
	                            delete curd.deleted;
	                        }
	                        else
	                            curd.add = c.adObj;
	                        curd.parentGuid = c.guid;
	                        curd.parentColName = c.colName;
	                        curd.added = 1;
	                        break;
	                        // подписка на корневой элемент
	                    case "subscribe":
	                        if (!curd.newRoot) curd.newRoot = c.sobj; // сериализованное представление уже в логе, берем его
	                        // db.serialize(obj);

	                        if (!("subscribers" in delta)) delta.subscribers = {};
	                        if (c.subscriber) delta.subscribers[c.subscriber] = 1;
	                        break;
	                        // удаление объекта из иерархии
	                    case "del":
	                        if (curd.added) {
	                            //curd = next_delta_item(c);
	                            delete curd.added;
	                            delete curd.add;
	                            delete curd.replace;
	                        }
	                        //curd.del = c.delObj; // не нужно тело удаленного объекта тащить!!!
	                        curd.parentGuid = c.guid;
	                        curd.parentColName = c.colName;
	                        curd.deleted = 1;
	                        break;
	                }
	            }
	            delta.rootGuid = obj.getRoot().getGuid();

	            // записывем версию текущей транзакции в дельту
	            delta.ver = obj.getRootVersion();
	            //if (db.inTran()) delta.trGuid = db.getCurTranGuid();
	            //this.truncate();
	            return delta;
	        },

	        getListOfTypes: function (delta, list) {
	            var db = this.getObj().getDB();
	            var result = list ? list : { arrTypes: [] };
	            for (var i = 0; i < delta.items.length; i++) {
	                var c = delta.items[i];
	                if ("add" in c)
	                    db.getListOfTypes(c.add, result, true);
	            };
	            return result;
	        },

	        // применить "дельту" изменений к объекту
	        applyDelta: function (delta) {
	            this.setActive(false);
	            var db = this.getObj().getDB();
	            for (var i = 0; i < delta.items.length; i++) {
	                var c = delta.items[i];
	                if ("newRoot" in c)
	                    continue;
	                if ("deleted" in c) {
	                    var o = db.getObj(c.parentGuid);
	                    // TODO коллбэк на удаление 
	                    o.getCol(c.parentColName)._del(db.getObj(c.guid));
	                }
	                else {
	                    if ("add" in c) {
	                        var o = db.getObj(c.parentGuid);
	                        cb = db.getDefaultCompCallback();
	                        db.deserialize(c.add, { obj: o, colName: c.parentColName }, cb);

	                    }
	                    else
	                        if ("replace" in c) {
	                            var o = db.getObj(c.parentGuid);
	                            var index = o.getCol(c.parentColName)._del(db.getObj(c.guid));
	                            cb = db.getDefaultCompCallback();
	                            if (typeof (index) === "number") {
	                                if (!c.replace.$sys)
	                                    c.replace.$sys = {};
	                                c.replace.$sys.$collection_index = index;
	                            };
	                            db.deserialize(c.replace, { obj: o, colName: c.parentColName }, cb);

	                        };
	                    var o2 = db.getObj(c.guid);
	                    if (o2)
	                        for (var cf in c.fields) o2.set(cf, c.fields[cf], false, true);
	                }
	            }
	            this.setActive(true);
	        },

	        add: function (item) {
	            var p = this.pvt;
	            if (!(this.getActive()))
	                return;

	            var db = this.getDB();
	            if (this.getObj()) {
	                var ver = this.getObj().getCurVersion();

	                if (!(ver.toString() in p.versions))
	                    p.versions[ver] = p.log.length; // отмечаем место в логе, соответствующее началу этой версии
	            };
	            item.idx = db.getNewCounter();

	            p.log.push(item);				// добавить в лог корневого объекта
	            return p.log.length - 1;
	        },

	        createVirtualLog: function (subs_mode, obj) {
	            var result = new MemVirtualLog(subs_mode, this);
	            this._virtualLogs[result.getGuid()] = { log: result, objects: {} };
	            if (obj)
	                result.addObject(obj);
	            return result;
	        },

	        destroyVirtualLog: function (vlog) {
	            var log_guid = vlog.getGuid();
	            var log_data = this._virtualLogs[log_guid];
	            if (log_data) {
	                for (var obj_guid in log_data.objects) {
	                    var obj = log_data.objects[obj_guid];
	                    if (this._objects[obj_guid] && this._objects[obj_guid][log_guid]) {
	                        delete this._objects[obj_guid][log_guid];
	                        if (Object.keys(this._objects[obj_guid]).length === 0) {
	                            delete this._objects[obj_guid];
	                            obj._setLogObject(null);
	                        };
	                    };
	                };
	                delete this._virtualLogs[vlog.getGuid()];
	                if (Object.keys(this._virtualLogs).length === 0)
	                    this.truncate();
	            }
	            else
	                throw new Error("MemObjLog::destroyVirtualLog: Virtual log \"" + log_guid + "\" doesn't exist!");
	        },

	        objFieldModified: function (obj, field, oldValue, newValue) {
	            if (this.getActive()) {
	                var guid = obj.getGuid();
	                var o = { flds: {}, obj: obj, type: "mp" };
	                o.flds[field] = { old: oldValue, new: newValue };
	                var idx = this.add(o);
	                var logs = this._objects[guid];
	                if (logs) {
	                    for (var log in logs) {
	                        if (logs[log].log.getActive()) {
	                            logs[log].log._addItem(idx);
	                            var sum = logs[log].summary;
	                            if (!sum.fldLog[field]) {
	                                sum.fldLog[field] = oldValue;
	                                sum.isModified = true;
	                                sum.cntFldModif++;
                                };
	                        };
	                    };
	                };
	            };
	        },

	        objColModified: function (obj, op, colName, child_obj, obj_index) {
	            if (this.getActive()) {
	                var guid = obj.getGuid();
	                var o = null;
	                var idx = -1;
	                var logs = this._objects[guid];
	                switch (op) {

	                    case "add":
	                        var mg = obj.getGuid();
	                        var newObj = this._db.serialize(child_obj);
	                        var o = {
	                            adObj: newObj,
	                            obj: child_obj,
	                            colName: colName,
	                            guid: mg, type: "add",
	                            obj_index: obj_index,
	                            obj_guid: child_obj.getGuid()
	                        };
                            // Добавляем дочерний объект в логи родителя.
	                        for (var log in logs)
	                            if (logs[log].log.getSubscriptionMode() !== MemVirtualLog.SubscriptionMode.CurrentOnly)
	                                this._addObjectToVLog(child_obj, logs[log].log);
	                        break;

	                    case "del":
	                        var oldObj = this._db.serialize(child_obj);
	                        var o = {
	                            delObj: oldObj,
	                            obj: child_obj,
	                            colName: colName,
	                            guid: obj.getGuid(),
	                            type: "del",
	                            obj_index: obj_index,
	                            obj_guid: child_obj.getGuid()
	                        };
	                        // Удаляем объект (и его наследников) из всех логов.
	                        this._deleteObj(child_obj);
	                        break;

	                    case "mod":
	                        break;

	                    default:
	                        throw new Error("MemObjLog::objColModified: Unknown operation type: \"" + op + "\".");
	                };
	                if (o)
	                    idx = this.add(o);
	                if (logs) {
	                    for (var log in logs) {
	                        if (logs[log].log.getActive()) {
	                            if (idx >= 0)
	                                logs[log].log._addItem(idx);
	                            var sum = logs[log].summary;
	                            var curr_col_log = sum.colLog[colName];
	                            if (!curr_col_log) {
	                                curr_col_log = sum.colLog[colName] = {};
	                                curr_col_log.del = {};
	                                curr_col_log.add = {};
	                                curr_col_log.mod = {};
	                                sum.cntColModif++;
	                            };
	                            curr_col_log[op][child_obj.getGuid()] = child_obj;
	                            sum.isModified = true;
                            };
	                    };
	                };
	            };
	        },

	        _resetLog: function (vlog) {
	            var log_guid = vlog.getGuid();
	            var log_data = this._virtualLogs[log_guid];
	            if (log_data) {
	                for (var obj_guid in log_data.objects) {
	                    var obj = log_data.objects[obj_guid];
	                    if (this._objects[obj_guid] && this._objects[obj_guid][log_guid]) {
	                        this._objects[obj_guid][log_guid].summary = {
	                            fldLog: {},
	                            colLog: {},
	                            isModified: false,
	                            cntColModif: 0,
	                            cntFldModif: 0
	                        };
	                    };
	                };
	            }
	            else
	                throw new Error("MemObjLog::_resetLog: Virtual log \"" + log_guid + "\" doesn't exist!");
	        },

	        rollback: function (vlog) {
	            result = { result: "OK" };
	            var log_guid = vlog.getGuid();
	            var log_data = this._virtualLogs[log_guid];
	            if (log_data) {
	                var active_flag = log_data.log.getActive();
	                log_data.log.setActive(false);
	                try {
	                    var items = log_data.log._getHistory();
	                    for (var i = items.length - 1; i >= 0; i--) {
	                        var item = this.pvt.log[items[i]];
	                        switch (item.type) {

	                            case "mp":
	                                for (var cf in item.flds)
	                                    item.obj.set(cf, item.flds[cf].old, false, true);
	                                break;

	                            case "add":
	                                var parent = this._db.getObj(item.guid);
	                                if (parent) {
	                                    var col = parent.getCol(item.colName);
	                                    if (col) {
	                                        col._del(this._db.getObj(item.obj_guid));
                                        };
	                                };
	                                break;

	                            case "del":
	                                var parent = this._db.getObj(item.guid);
	                                if (parent) {
	                                    var col = parent.getCol(item.colName);
	                                    if (col) {
	                                        var cb = this._db.getDefaultCompCallback();
	                                        if (!item.delObj.$sys)
	                                            item.delObj.$sys = {};
	                                        item.delObj.$sys.$collection_index = item.obj_index;
	                                        col._add(item.obj, item.obj_index);
	                                        var rsObj = this._db.deserialize(item.delObj, { obj: parent, colName: item.colName }, cb);
	                                        var logs = this._objects[item.guid];
	                                        // Добавляем восстановленный объект в логи родителя.
	                                        for (var log in logs)
	                                            if (logs[log].log.getSubscriptionMode() !== MemVirtualLog.SubscriptionMode.CurrentOnly)
	                                                this._addObjectToVLog(rsObj, logs[log].log);
	                                        break;
                                        };
	                                };
	                                break;
	                        };
	                    };
	                } catch (err) {
	                    result = { result: "ERROR", message: err.message };
	                };
	                log_data.log.reset();
	                log_data.log.setActive(active_flag);
	            }
	            else
	                result = {
	                    result: "ERROR",
	                    message: "MemObjLog::rollback: Virtual log \"" + log_guid + "\" doesn't exist!"
	                };
	            return result;
	        },

	        isFldModified: function (fldName, obj, vlog) {
	            var result;
	            var obj_data = this._objects[obj.getGuid()];
	            if (obj_data) {
	                var log_data = obj_data[vlog.getGuid()].summary;
	                if (log_data) {
	                    result = fldName in log_data.fldLog;
	                }
	                else
	                    throw new Error("MemObjLog::isFldModified: Object \"" + obj.getGuid()
                            + "\" doesn't belong to virtual log \"" + vlog.getGuid() + "\"!");
	            }
	            else
	                throw new Error("MemObjLog::isFldModified: Object \"" + obj.getGuid() + "\" isn't logged!");
	            return result;
	        },

	        countModifiedFields: function (obj, vlog) {
	            var result;
	            var obj_data = this._objects[obj.getGuid()];
	            if (obj_data) {
	                var log_data = obj_data[vlog.getGuid()].summary;
	                if (log_data) {
	                    result = log_data.cntFldModif;
	                }
	                else
	                    throw new Error("MemObjLog::countModifiedFields: Object \"" + obj.getGuid()
                            + "\" doesn't belong to virtual log \"" + vlog.getGuid() + "\"!");
	            }
	            else
	                throw new Error("MemObjLog::countModifiedFields: Object \"" + obj.getGuid() + "\" isn't logged!");
	            return result;
	        },

	        getOldFldVal: function (fldName, obj, vlog) {
	            var result;
	            var obj_data = this._objects[obj.getGuid()];
	            if (obj_data) {
	                var log_data = obj_data[vlog.getGuid()].summary;
	                if (log_data) {
	                    result = log_data.fldLog[fldName];
	                }
	                else
	                    throw new Error("MemObjLog::getOldFldVal: Object \"" + obj.getGuid()
                            + "\" doesn't belong to virtual log \"" + vlog.getGuid() + "\"!");
	            }
	            else
	                throw new Error("MemObjLog::getOldFldVal: Object \"" + obj.getGuid() + "\" isn't logged!");
	            return result;
	        },

	        countModifiedCols: function (obj, vlog) {
	            var result;
	            var obj_data = this._objects[obj.getGuid()];
	            if (obj_data) {
	                var log_data = obj_data[vlog.getGuid()].summary;
	                if (log_data) {
	                    result = log_data.cntColModif;
	                }
	                else
	                    throw new Error("MemObjLog::countModifiedCols: Object \"" + obj.getGuid()
                            + "\" doesn't belong to virtual log \"" + vlog.getGuid() + "\"!");
	            }
	            else
	                throw new Error("MemObjLog::countModifiedCols: Object \"" + obj.getGuid() + "\" isn't logged!");
	            return result;
	        },

	        getLogCol: function (colName, obj, vlog) {
	            var result;
	            var obj_data = this._objects[obj.getGuid()];
	            if (obj_data) {
	                var log_data = obj_data[vlog.getGuid()].summary;
	                if (log_data) {
	                    result = log_data.colLog[colName];
	                }
	                else
	                    throw new Error("MemObjLog::getLogCol: Object \"" + obj.getGuid()
                            + "\" doesn't belong to virtual log \"" + vlog.getGuid() + "\"!");
	            }
	            else
	                throw new Error("MemObjLog::getLogCol: Object \"" + obj.getGuid() + "\" isn't logged!");
	            return result;
	        },

	        isDataModified: function (obj, vlog) {
	            var result;
	            var obj_data = this._objects[obj.getGuid()];
	            if (obj_data) {
	                var log_data = obj_data[vlog.getGuid()].summary;
	                if (log_data) {
	                    result = log_data.isModified;
	                }
	                else
	                    throw new Error("MemObjLog::isDataModified: Object \"" + obj.getGuid()
                            + "\" doesn't belong to virtual log \"" + vlog.getGuid() + "\"!");
	            }
	            else
	                throw new Error("MemObjLog::isDataModified: Object \"" + obj.getGuid() + "\" isn't logged!");
	            return result;
	        },

	        _deleteObj: function (obj) {
	            var self = this;
	            this._db._iterateChilds(obj, true, function (obj, lvl) {
	                var obj_guid = obj.getGuid();
	                var obj_rec = self._objects[obj_guid];
	                if (obj_rec) {
	                    for (var log in obj_rec) {
	                        delete self._virtualLogs[obj_rec[log].log.getGuid()].objects[obj_guid];
	                    }
	                };
	                delete self._objects[obj_guid];
	                obj._setLogObject(null);
	            });
	        },

	        _addSingleObj: function (obj, vlog_guid, vlog, vlog_obj) {
	            var obj_guid = obj.getGuid();
	            obj._setLogObject(this);
	            vlog_obj[obj_guid] = obj;
	            var obj_rec = this._objects[obj_guid];
	            if (!obj_rec) {
	                obj_rec = {};
	                this._objects[obj_guid] = obj_rec;
	            };
	            obj_rec[vlog_guid] = {
	                log: vlog,
	                summary: {
	                    fldLog: {},
	                    colLog: {},
	                    isModified: false,
	                    cntColModif: 0,
	                    cntFldModif: 0
	                }
	            };
	        },

	        _addObjectToVLog: function (obj, vlog) {
	            var vlog_guid = vlog.getGuid();
	            var curr_vlog = this._virtualLogs[vlog_guid];

	            if (curr_vlog.log === vlog) {
	                var subs_mode = vlog.getSubscriptionMode();
	                if (subs_mode === MemVirtualLog.SubscriptionMode.CurrentOnly) {
	                    this._addSingleObj(obj, vlog_guid, vlog, curr_vlog.objects);
	                }
	                else {
	                    var self = this;
	                    this._db._iterateChilds(obj, true, function (obj, lvl) {
	                        self._addSingleObj(obj, vlog_guid, vlog, curr_vlog.objects);
	                    });
	                };
	            }
	            else
	                throw new Error("MemObjLog::_addObjectToVLog: Incorrect or unregistered virtual log object!");
	        },

	    });
		return MemObjLog;
	}
);