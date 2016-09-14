'use strict';
var fs = require('fs');
var Utils = require('./common/utils');

/**
 * Настройки listener-а
 * @memberof Tracer
 */
var ListenerConfig = class ListenerConfig{
    /**
     * Создание инстанса
     * @param config JSON-представление объекта
     * @returns {Tracer.ListenerConfig}
     */
    static create(config){
        if ((!config.type) || (!config.name)) {
            console.error('Incorrect listener config')
        } else {
            var _instance = new ListenerConfig();
            var _config = Utils.deepCopy(config);
            Object.setPrototypeOf(_config, _instance);
            return _config;
        }
    }

    /**
     * Проверка равенства экземпляров объекта
     * @param config {Tracer.ListenerConfig} Объект, с которым необходимо сравнить
     */
    isEqual(config) {
        return (this.type === config.type)
            && (this.name === config.name)
    }

    /**
     * Имя Listener-а, указанное в конфигурации
     * @type {string}
     */
    get name() {
        return this.name
    }

    set name(value) {
        this.name = value
    }

    /**
     * Тип Listener-а, указанный в конфигурации
     * @type {string}
     */
    get type() {
        return this.type
    }

    set type(value) {
        this.type = value
    }
};

/**
 * Настройки source-а
 * @memberof Tracer
 */
var SourceConfig = class SourceConfig {

    /**
     * Создание инстанса
     * @param config JSON-представление объекта
     * @returns {Tracer.SourceConfig}
     */
    static create(config){
        if (!config.name) {
            console.error('Incorrect Source config')
        } else {
            var _instance = new SourceConfig();
            var _config = Utils.deepCopy(config);
            Object.setPrototypeOf(_config, _instance);
            return _config;
        }
    }

    /**
     * Проверка равенства экземпляров объекта
     * @param config {Tracer.SourceConfig} Объект, с которым необходимо сравнить
     */
    isEqual(config) {
        return (this.name === config.name)
    }
};


/**
 * Настройа переключателя Tracer-а
 * @memberof Tracer
 */
var SwitchConfig = class SwitchConfig{
    /**
     * Создание инстанса
     * @param config JSON-представление объекта
     * @returns {Tracer.SwitchConfig}
     */
    static create(config){
        if (!config.name) {
            console.error('Incorrect Switch config')
        } else {
            var _instance = new SwitchConfig();
            var _config = Utils.deepCopy(config);
            Object.setPrototypeOf(_config, _instance);
            return _config;
        }
    }

    /**
     * Проверка равенства экземпляров объекта
     * @param config {Tracer.SwitchConfig} Объект, с которым необходимо сравнить
     */
    isEqual(config) {
        return (this.name === config.name)
    }
};

/**
 * Класс настроек Tracer-а
 * @memberof Tracer
 */
var Config = class Config{
    /**
     * Создание настроек происходит из файла
     * @param {string} configFileName имя файла
     */
    constructor(configFileName){
        this.listeners = [];
        this.switches = [];
        this.sources = [];

        if (configFileName != '') {
            if (fs.existsSync(configFileName)) {
                var _text = fs.readFileSync(configFileName);
            } else {
                console.error('Can not find file [' + configFileName + ']');
                this.isLoaded = false;
                return
            }

            var _config = tryParseJSON(_text);
            if (!_config) {
                console.error('Can not parse file [' + configFileName + ']');
                this.isLoaded = false;
            } else {
                this._copyData(_config);
                this.isLoaded = true;
            }
        }
    }

    /**
     * Получить настройки для Listener-а
     * @param {string} name Имя Listener-а
     * @param {string} type Тип Listener-а
     * @returns {Tracer.ListenerConfig}
     */
    getListener(name, type) {
        return this.listeners.find(function(element) {
            return ((element.name == name) && (type ? (element.type == type) : true))
        });
    }

    /**
     * Проверка существования настроек для Listener-а
     * @param {string} name Имя Listener-а
     * @param {string} type Тип Listener-а
     * @returns {boolean}
     */
    hasListener(name, type) {
        return this.getListener(name, type) ? true : false;
    }

    /**
     * Получить настройки для Source-а
     * @param {string} name Имя Source-а
     * @returns {Tracer.SourceConfig}
     */
    getSource(name) {
        return this.sources.find(function(element) {
            return element.name == name
        });
    }

    /**
     * Провеверка существования настроек для Source-а
     * @param {string} name Имя Source-а
     * @returns {boolean}
     */
    hasSource(name) {
        return this.getSource(name) ? true : false;
    }

    /**
     * Получить настройки для Switch-а
     * @param {string} name Имя Switch-а
     * @returns {Tracer.SwitchConfig}
     */
    getSwitch(name) {
        return this.switches.find(function(element) {
            return element.name == name
        })
    }

    /**
     * Провеверка существования настроек для переключателя
     * @param {string} name Имя Switch-а
     * @returns {boolean}
     */
    hasSwitch(name) {
        return this.getSwitch(name) ? true : false;
    }

    /**
     * Копирование данных из настроек в соответсвующие объекты-настройки
     * @private
     * @param {object} config JSON-представление настроек
     */
    _copyData(config){
        var that = this;

        config.listeners.forEach(function(listener){
            var _listener = ListenerConfig.create(listener);
            if (_listener) {
                that.listeners.push(_listener);
            }
        });

        config.switches.forEach(function(switch_){
            var _switch = SwitchConfig.create(switch_);
            if (_switch) {
                that.switches.push(_switch);
            }
        });

        config.sources.forEach(function(source){
            var _source = SourceConfig.create(source);
            if (_source) {
                that.sources.push(_source);
            }
        });
    }

    isEqual(config) {
        return false
    }
};


function tryParseJSON(value) {
    // Todo : можно переделать на Promise
    try {
        var _object = JSON.parse(value);
        if (_object && typeof _object === "object") {
            return _object;
        }
    }
    catch (e) { }

    return null;
}

if (module) {module.exports = Config}
