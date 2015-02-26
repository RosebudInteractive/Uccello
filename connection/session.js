if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль Сессий
 * @module Session
 */
define(
    ['../controls/aComponent', '../system/event'],
    function(AComponent, Event) {

    var Session = AComponent.extend(/** @lends module:Session.Session.prototype */{

        className: "Session",
        classGuid: "70c9ac53-6fe5-18d1-7d64-45cfff65dbbb",
        metaFields: [
            {fname:"CreationTime", ftype:"timestamp"},
            {fname:"LastOpTime", ftype:"timestamp"},
            {fname:"DeviceName", ftype:"string"},
            {fname:"DeviceType", ftype:"string"},
            {fname:"DeviceColor", ftype:"string"},
            {fname:"ConnectCount", ftype:"int"}
        ],
        metaCols: [ {"cname": "Connects", "ctype": "control"} ],

        /**
         * Инициализация объекта
         * @constructs
         * @param params {object}
         */
        init: function(cm, params) {
            this._super(cm, params);

            if (params==undefined) return;
            this.pvt.event = new Event(this);
            //this.id = params.session;
            //this.user = params.user;
            this.connects = [];
			this.creationTime(Date.now());
			this.lastOpTime(Date.now());
            //this.creationTime = Date.now();
            //this.lastOpTime = Date.now();
        },

        /**
         * Получить ID сессии
         * @returns {string}
         */
		 // TODO заменить вызовы на проперти Id
        getId: function() {
            return this.id();
        },

        /**
         * Добавить коннект в данную сессию
         * @param conn {object} Объект Connect
         * @returns {object}
         */
        addConnect: function(conn) {

            // TODO выдает ошибку?
            //this.lastOpTime(Date.now());

            var that = this;

            // обработка события закрытия коннекта
            conn.event.on({
                type: 'socket.close',
                subscriber: this,
                callback: function(args){
                    that.getDB().getController().onDisconnect(args.connId);
                    that.removeConn(args.connId);
                    that.getObj().getCol("Connects")._del(conn.getObj());
                    var db = that.getObj().getDB();
                    db.getController().genDeltas(db.getGuid());
                }
            });

            // добавим ссылку на сессию
             conn.setSession(this);

            this.connects[conn.getId()] = conn;
            this.connectCount(this.countConnect());

            return true;
        },

        /**
         * Получить коннекты данной сессии
         * @returns {Array}
         */
        getConnects: function() {
            return this.connects;
        },

        /**
         * получить коннект с идентификатором id
         * @param id {number}
         * @returns {object}
         */
        getConnect: function(id) {
            if (this.connects[id])
                return this.connects[id];
            return null;
        },

        /**
         * Удалить коннект по ID
         * @param id {number} ID удаляемого коннекта
         * @returns {boolean}
         */
        removeConn: function (id) {
            this.lastOpTime = Date.now();
            if (this.connects[id])
                delete this.connects[id];
            this.connectCount(this.countConnect());
        },

        /**
         * Количество коннектов
         * @returns {number}
         */
        countConnect: function () {
            return Object.keys(this.connects).length
        },

        /**
         * Поиск коннекта по ID
         * @param id {string} ID коннекта
         * @returns {object|null}
         */
        findConnect: function (id) {
            if (this.connects[id])
                return this.connects[id];
            return null;
        },

		// TODO УБРАТЬ ИЛИ ПЕРЕДЕЛАТЬ?
        setData: function(data){
            this.data = data;
        },

        getData: function() {
            return this.data;
        },

        getUser: function() {
            return this.getParent();
        },

		/*
        setUser: function(user) {
            this.user = user;
        },*/

		// Properties
		
        creationTime: function(value) {
            return this._genericSetter("CreationTime",value);
        },

        lastOpTime: function(value) {
            return this._genericSetter("LastOpTime",value);
        },

        deviceName: function(value) {
            return this._genericSetter("DeviceName",value);
        },

        deviceType: function(value) {
            return this._genericSetter("DeviceType",value);
        },

        deviceColor: function(value) {
            return this._genericSetter("DeviceColor",value);
        },

        connectCount: function(value) {
            return this._genericSetter("ConnectCount",value);
        }
    });

    return Session;
});