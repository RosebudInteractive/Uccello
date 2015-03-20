if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль контекста
 * @module VisualContext
 */
define(
    ['../controls/aComponent'],
    function(AComponent) {
					 
        var VisualContextInfo = AComponent.extend(/** @lends module:VisualContext.VisualContext.prototype */{

            className: "VisualContextInfo",
            classGuid: UCCELLO_CONFIG.classGuids.VisualContextInfo,
            metaFields: [
                {fname: "DataBase", ftype: "string"}, // runtime - гуид БД данных на сервере
				{fname: "Kind", ftype: "string"}, // , fdefault: "master" enum (master,slave
				{fname: "MasterGuid", ftype: "string"}, // УБРАТЬ? GUID MASTER DATABASE данных контекста (на севере) - READONLY для SLAVE
				{fname: "ContextGuid", ftype: "string"} // GUID контекста - можно будет удалить
            ],
            metaCols: [],

             /**
             * Инициализация объекта
             * @constructs
             * @param params {object} 
			 * @callback cb - коллбэк, который вызывается после отработки конструктора (асинхронный в случае slave)
             */
            init: function(cm, params,cb) {
                this._super(cm, params);
            },

            dataBase: function (value) {
                return this._genericSetter("DataBase", value);
            },
			
			kind: function (value) {
                return this._genericSetter("Kind", value);
            },
			
			masterGuid: function (value) {
                return this._genericSetter("MasterGuid", value, "MASTER");
            },

			contextGuid: function (value) {
                return this._genericSetter("ContextGuid", value, "MASTER");
            }
        });

        return VisualContextInfo;
    });