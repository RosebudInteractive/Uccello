/**
 * @module Config
 * Настройки трейсера
 * @author
 * Created by staloverov on 19.11.2015.
 */
'use strict';

var fs = require('fs');
var Utils = require('./common/utils');

/**
 * Class настройка listener-а
 */
var ListenerConfig = class ListenerConfig{
    /**
     * Создание инстанса
     * @param config
     * @returns {*}
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
     * @param config {ListenerConfig} Объект, с которым необходимо сравнить
     */
    isEqual(config) {
        return (this.type === config.type)
            && (this.name === config.name)
    }
};

/**
 * class
 * @type {SourceConfig}
 */
var SourceConfig = class SourceConfig {
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


    isEqual(config) {
        return (this.name === config.name)
    }
};

/**
 * class
 * @type {SwitchConfig}
 */
var SwitchConfig = class SwitchConfig {
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


    isEqual(config) {
        return (this.name === config.name)
    }
};


/**
 * Объект, представляющий собой настройки трейсера
 */
var Config = class Config{
    /**
     * Создает экземпляр настроек, загружая из файла
     * @param configFileName {string} полное имя файла настроек
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
     * Имя объекта
     * @type {string}
     * @readonly
     */
    get name() {
        return this._name;
    }

    /**
     * Возвращает настройки listener-а
     * @param name имя listener-а
     * @param type тип listener-а
     * @returns {@link ListenerConfig} экземпляр насторек listener-а
     */
    getListener(name, type) {
        return this.listeners.find(function(element) {
            return ((element.name == name) && (type ? (element.type == type) : true))
        });
    }

    /**
     * Проверяет наличие настроек для listener-а
     * @param name
     * @param type
     * @returns {boolean}
     */
    hasListener(name, type) {
        return this.getListener(name, type) ? true : false;
    }


    getSource(name) {
        return this.sources.find(function(element) {
            return element.name == name
        });
    }

    hasSource(name) {
        return this.getSource(name) ? true : false;
    }

    getSwitch(name) {
        return this.switches.find(function(element) {
            return element.name == name
        })
    }

    hasSwitch(name) {
        return this.getSwitch(name) ? true : false;
    }

    /**
     * Копирование
     * @param config
     * @private
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


    /**
     * Проверка равенства экземпляров объекта
     * @param config {Config} Объект, с которым необходимо сравнить
     */
    isEqual(config) {
        return false
    }
};


// function Config(configFileName) {
//     if (configFileName != '') {
//         if (fs.existsSync(configFileName)) {
//             var _text = fs.readFileSync(configFileName);
//
//             var _prototype = tryParseJSON(_text);
//             if (!_prototype) {
//                 console.error('Can not parse file [' + configFileName + ']');
//                 this.isLoaded = false;
//             } else {
//                 Object.setPrototypeOf(this, _prototype);
//                 this.isLoaded = true;
//             }
//         } else {
//             console.error('Can not find file [' + configFileName + ']');
//             this.isLoaded = false;
//         }
//     }
//
//     if (!this.listeners) {this.listeners = []}
//     if (!this.switches) {this.switches = []}
//     if (!this.sources) {this.sources = []}
//
//     this.getListener = function(name, type) {
//         return this.listeners.find(function(element) {
//             return ((element.name == name) && (element.type == type))
//         });
//     };
//
//     this.getSource = function(name){
//         return this.sources.find(function(element) {
//             return element.name == name
//         });
//     };
//
//     this.hasSource = function(name){
//         return this.getSource(name) ? true : false;
//     };
//
//     this.getSwitch = function(name) {
//         return this.switches.find(function(element) {
//             return element.name == name
//         })
//     }
// }

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
