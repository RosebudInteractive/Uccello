if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль Логирования
 * @module Logger
 */
define(function() {

    var Logger = UccelloClass.extend(/** @lends module:Logger.Logger.prototype */{

        /**
         * Инициализация объекта
         * @constructs
         */
        init: function(options) {
            this.logs = [];

            if (!options) options = {};
            this.options = {};
            this.options.autoWrite = options.autoWrite || false;
            this.options.file = options.file || 'logs/log.xml';

            if (this.options.autoWrite) {
                var that = this;
                setInterval(function(){
                    that.saveLog();
                }, 10*3600*1000);
            }
        },

        /**
         * Добавить в лог
         * @param log {object}
         */
        addLog: function(log) {
            if (log) {
                log.timestamp = Date.now();
                this.logs.push(log);
            }
        },

        /**
         * Получить лог
         * @returns {Array}
         */
        getLogs: function() {
            return this.logs;
        },


        /**
         * Сохранить лог в файл
         */
        saveLog: function() {
            var fs = require('fs');
            var js2xmlparser = require("js2xmlparser");
            var log = js2xmlparser("log", {row:this.logs});
            var that = this;
            fs.appendFile(this.options.file, log, function (err) {
                if (DEBUG) console.log('err', err);
                if (err) throw err;
                that.logs = [];
            });
        }

    });

    return Logger;
});