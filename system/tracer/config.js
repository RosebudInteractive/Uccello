/**
 * Created by staloverov on 19.11.2015.
 */
'use strict';

var fs = require('fs');
var Utils = require('./common/utils');

var ListenerConfig = class ListenerConfig{
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

    isEqual(config) {
        return (this.type === config.type)
            && (this.name === config.name)
    }
};

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

var Config = class Config{
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

    getListener(name, type) {
        return this.listeners.find(function(element) {
            return ((element.name == name) && (type ? (element.type == type) : true))
        });
    }

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
