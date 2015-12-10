var fs = require('fs');
var Config = require('./config');
var Switch = require('./switch');
var Source = require('./source');
var ListenerFactory = require('./listenerFactory');

var _manager = null;
getInstance = function() {
    if (!_manager) {
        _manager = new Manager()
    }

    return _manager;
};

function Manager() {
    if (!(this instanceof Manager)) {
        throw new TypeError("Person constructor cannot be called as a function.");
    }

    this.listeners = new Map();
    this.sources = new Map();
    this.switches = new Map();
    this.config = null;
    this.configFileName = '';
}

Manager.prototype = {
    constructor: Manager,

    loadFromFile: function (fileName) {
        if ((fileName != '') && (fileName != this.configFileName)) {
            this.configFileName = fileName;
            this.loadConfig();
            this.addFileWatcher();
        }
    },

    loadConfig: function () {
        this.config = new Config(this.configFileName);
        this.applyConfig();
    },

    addFileWatcher: function () {
        if ((this.configFileName == '') || (!fs.existsSync(this.configFileName))) {
            return
        }

        var that = this;

        fs.watch(this.configFileName, function (event) {
            if (event == 'change') {
                that.loadConfig()
            }
        });
    },

    addListener: function (listener) {
        if (!this.listeners.has(listener.name)) {
            this.listeners.set(listener.name, listener);
        } else {
            throw new Error(format('Listener \"{0}\" already exists.', listener.name))
        }
    },

    addSource: function (source) {
        this.sources.set(source.name, source);
    },

    addSwitch: function (sourceSwitch) {
        this.switches.set(sourceSwitch.name, sourceSwitch);
    },

    applyConfig: function () {
        var that = this;

        this.config.listeners.forEach (function (listener) {
            // TODO : Тут должна быть проверка на уже существующие прослушки
            ListenerFactory.createListener(listener);
        });

        this.config.switches.forEach(function (_switch) {
            if (that.switches.has(_switch.name)) {
                that.switches.get(_switch.name).applyConfig(_switch)
            } else {
                new Switch(_switch.name)
            }
        });

        this.config.sources.forEach(function (source) {
            if (that.sources.has(source.name)) {
                that.sources.get(source.name).applyConfig(source)
            } else {
                new Source(source.name)
            }
        })
    },

    getSwitch: function (switchName) {
        return this.switches.get(switchName)
    },

    getListener: function (listenerName) {
        return this.listeners.get(listenerName)
    },

    createSource: function (sourceName) {
        if (this.sources.has(sourceName)) {
            return this.sources.get(sourceName)
        } else {
            return new Source(sourceName)
        }
    }
};

if (module) {module.exports.getInstance = getInstance}