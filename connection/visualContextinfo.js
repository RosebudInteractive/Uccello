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
                {fname: "DataBase", ftype: "string"}, // runtime
				{fname: "Kind", ftype: "string"}, // , fdefault: "master" enum (master,slave
				{fname: "MasterGuid", ftype: "string"},
				{fname: "ContextGuid", ftype: "string"}
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
                return this._genericSetter("MasterGuid", value);
            },

			contextGuid: function (value) {
                return this._genericSetter("ContextGuid", value);
            }
        });

        return VisualContextInfo;
    });