if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль Сессий
 * @module SessionInfo
 */
define(
    ['../controls/aComponent'],
    function(AComponent) {

    var SessionInfo = AComponent.extend(/** @lends module:SessionInfo.SessionInfo.prototype */{

        className: "SessionInfo",
        classGuid: "479c72e9-29d1-3d6b-b17b-f5bf02e52002",
        metaFields: [
            {fname:"CreationTime", ftype:"timestamp"},
            {fname:"LastOpTime", ftype:"timestamp"},
            {fname:"DeviceName", ftype:"string"},
            {fname:"DeviceType", ftype:"string"},
            {fname:"DeviceColor", ftype:"string"},
            {fname:"CountConnect", ftype:"int"},
            {fname:"SessionGuid", ftype:"string"}
        ],
        metaCols: [ {"cname": "Connects", "ctype": "control"} ],

        /**
         * Инициализация объекта
         * @constructs
         * @param cm {object}
         * @param params {object}
         */
        init: function(cm, params) {
            this._super(cm, params);
        },

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

        sessionGuid: function(value) {
            return this._genericSetter("SessionGuid",value);
        }
    });

    return SessionInfo;
});