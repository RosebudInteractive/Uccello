/**
 * @module Tracer
 * Модуль трассировки кода
 */

var fs = require('fs');
var Config = require('./config');
var Switch = require('./switch');
var Source = require('./source');
var ListenerFactory = require('./listenerFactory');
var Util = require('util');

var _manager = null;
/** @static
 *  Метод доступа к экземпляру менеджера трейсера
 * @returns {@link Manager}
 */
getInstance = function() {
    if (!_manager) {
        _manager = new Manager()
    }

    return _manager;
};

/**
 * @class Manager
 * Позволяет управлять настройками трейсера
 */
function Manager() {
    if (!(this instanceof Manager)) {
        throw new TypeError("Person constructor cannot be called as a function.");
    }

    this.listeners = new Map();
    this.sources = new Map();
    this.switches = new Map();
    this.config = null;
    this.configFileName = '';
    this.watchTimeout = ((typeof(UCCELLO_CONFIG) !== "undefined") && (UCCELLO_CONFIG.trace) && (UCCELLO_CONFIG.trace.watchTimeout)) ? UCCELLO_CONFIG.trace.watchTimeout : 2000;
}

Manager.prototype = {
    constructor: Manager,

    /**
     * Метод загрузка из файла
     * @private
     */
    loadFromFile: function (fileName) {
        if ((fileName != '') && (fileName != this.configFileName)) {
            this.configFileName = fileName;
            this.loadConfig();
            this.addFileWatcher();
        }
    },

    loadConfig: function () {
        var _config  = new Config(this.configFileName);
        if (_config.isLoaded) {
            this.applyConfig(_config);
        }
    },

    addFileWatcher: function () {
        if ((this.configFileName == '') || (!fs.existsSync(this.configFileName))) {
            return
        }

        var that = this;
        var _watchTimer;

        fs.watch(this.configFileName, {persistent : true}, function (event) {
            if ((event == 'change') && (!_watchTimer)) {
                _watchTimer = setTimeout(function () {
                    that.clear();
                    that.loadConfig();
                    clearTimeout(_watchTimer);
                    _watchTimer = null;
                }, that.watchTimeout)
            }
        });
    },

    clear: function(){
        // this.listeners.clear();
        // this.sources.clear();
        // this.switches.clear();
    },

    addListener: function (listener) {
        if (!this.listeners.has(listener.name)) {
            this.listeners.set(listener.name, listener);
        } else {
            throw new Error(Util.format('Listener \"{0}\" already exists.', listener.name))
        }
    },

    addSource: function (source) {
        this.sources.set(source.name, source);
    },

    addSwitch: function (sourceSwitch) {
        this.switches.set(sourceSwitch.name, sourceSwitch);
    },

    _configListeners: function (config) {
        var that = this;

        for (var _listenerInfo of this.listeners.entries()) {
            var _type = _listenerInfo[1].constructor.name;
            var _name = _listenerInfo[0];
            if (!config.hasListener(_name, _type)) {
                that.listeners.set(_name, null);
                that.listeners.delete(_name);
            }
        }
        
        config.listeners.forEach (function (_listener) {
            if (that.listeners.has(_listener.name)) {
                that.listeners.get(_listener.name).applySettings(_listener)
            } else {
                ListenerFactory.createListener(_listener);
            }
        });
    },

    _configSwitches: function (config) {
        var that = this;

        for (var _switchName of this.switches.keys()) {
            if (!config.hasSwitch(_switchName)) {
                that.switches.set(_switchName, null);
                that.switches.delete(_switchName);
            }
        }
        
        config.switches.forEach(function (_switch) {
            if (that.switches.has(_switch.name)) {
                that.switches.get(_switch.name).applySettings(_switch)
            } else {
                new Switch(_switch.name)
            }
        });
    },

    _configSources: function (config) {
        var that = this;

        for (var _sourceName of this.sources.keys()) {
            if (!config.hasSource(_sourceName)) {
                that.sources.set(_sourceName, null);
                that.sources.delete(_sourceName);
            }
        }

        config.sources.forEach(function (source) {
            if (that.sources.has(source.name)) {
                that.sources.get(source.name).applySettings(source)
            } else {
                new Source(source.name)
            }
        })
    },
    
    applyConfig: function (config) {
        if (config.isEqual(this.config)) {
            return
        }

        this.config = config;

        this._configListeners(config);
        this._configSwitches(config);
        this._configSources(config);        
    },

    getSwitch: function (switchName) {
        return this.switches.get(switchName)
    },

    getListener: function (listenerName) {
        return this.listeners.get(listenerName)
    },

    createSource: function (sourceName) {
        var that = this;
        return new Promise(function(resolve, reject){
            if (that.sources.has(sourceName)) {
                resolve(that.sources.get(sourceName))
            } else {
                if (that.config.hasSource(sourceName)) {
                    resolve(new Source(sourceName))    
                } else {
                    reject(new Error('Can not find config for source ' + sourceName))    
                }
            }    
        });
        
    }
};

if (module) {module.exports.getInstance = getInstance}