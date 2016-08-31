/**
 * @author
 * Created by staloverov on 25.11.2015.
 */
'use strict';

var Manager = require('./manager');
var Utils = require('./common/utils');
var Types = require('./common/types');
var DateFormat = require('dateformat');
var NumberFormat = require('number-formatter');
var StringFormat = require('string-format');

var Source = class Source {
    constructor(name){
        if (!name) {
            throw new Error('Source name is undefined');
        }

        this.name = name;
        this.switch = null;
        this.autoFlush = false;
        this.aliases = new Map();
        this.listeners = new Map();

        Manager.getInstance().addSource(this);
        var _config = Manager.getInstance().config.getSource(this.name);
        this.applySettings(_config);
    }

    applySettings(config) {
        if ((!config) || this.isEqual(config)) {return}

        this.clear();
        this.autoFlush = config.autoFlush;
        this.switch = Manager.getInstance().getSwitch(config.switchName);

        var _aliasesConfig = Utils.deepCopy(config.aliases);
        _buildAliases(_aliasesConfig, this.aliases);

        var _listenersConfig = Utils.deepCopy(config.listeners);
        this.loadListener(_listenersConfig);
    }

    clear() {
        this.aliases.clear();
        this.listeners.clear();
    }

    isEqual(config) {
        return (config ? true : false)
            && (config.constructor.name == 'SourceConfig')
            && (this.name === config.name)
            && (this.switch ? true : false)
            && (this.switch.isEqual(config.switch))
            && (this.autoFlush === config.autoFlush)
            && (_isAliasesEqual(config.aliases, [...this.aliases.values()]))
            && (_isListenersEqual(config.listeners, this.listeners))
    }

    loadListener(listenersConfig) {
        var that = this;
        var listener = null;

        listenersConfig.forEach(function(element) {

            listener = Manager.getInstance().getListener(element.name);
            if (listener) {
                var _listenerInfo = {
                    listener : listener,
                    enable: element.enable !== undefined ? element.enable : true,
                    aliases : new Map()
                };

                _buildAliases(element.aliases, _listenerInfo.aliases);

                that.listeners.set(listener.name, _listenerInfo);
            }
        })
    }

    hasSwitch() {
        return this.switch ? true : false
    }

    buildTraceDataForListener(listenerInfo, data) {
        var _result = new Map();

        var _listenerFields = listenerInfo.listener.getFields();
        for (var _field in data) {
            if (!data.hasOwnProperty(_field)) { continue }

            var _fieldName = '';
            if (listenerInfo.aliases.has(_field)) {
                _fieldName =  listenerInfo.aliases.get(_field);
            } else {
                if (this.aliases.has(_field)) {
                    _fieldName = this.aliases.get(_field);
                } else {
                    _fieldName = _field;
                }
            }

            if (_listenerFields.has(_fieldName)) {
                var _value = Utils.deepCopy(data[_field]);

                var _fieldOptions = _listenerFields.get(_fieldName);
                if (_fieldOptions.hasOwnProperty('format')) {
                    _value = _tryFormat(_value, _fieldOptions.format)
                }

                _result.set(_fieldName, _value);
            }
        }

        return _result;
    }

    trace(data) {
        if (!data) {
            return
        }

        var _needTrace = this.hasSwitch() && this.switch.shouldBeTrace(data.eventType) && (this.listeners.size > 0);
        if (!_needTrace) {
            return
        }

        var _withFlush = this.autoFlush;

        if (arguments.length > 1) {
            if (arguments[1] && typeof arguments[1] == 'function') {
                if (arguments.length > 2) {
                    if (typeof arguments[2] == 'boolean') {
                        _withFlush = _withFlush || arguments[2]
                    }
                }

                let _promise = arguments[1]();
                if (_promise && typeof _promise.then == 'function'){
                    var that = this;
                    _promise.then(function(data){
                        that._internalTrace(data, _withFlush)
                    }).catch(function(reason){
                        console.error(StringFormat('Exception on get trace data "{0.message}"', reason))
                    });
                } else {
                    console.error('Promise for trace is not define')
                }

                return;
            } else if (typeof arguments[1] == 'boolean') {
                _withFlush = _withFlush || arguments[1]
            }
        }

        this._internalTrace(data, _withFlush);
    }

    _internalTrace(data, withFlush) {
        if (!data.sourceName) {
            data.sourceName = this.name;
        }

        var that = this;
        for (var _listenerInfo of that.listeners.values()) {
            var _traceData = that.buildTraceDataForListener(_listenerInfo, data);
            if (_listenerInfo.enable) {
                _listenerInfo.listener.trace(_traceData, withFlush);
            }
        }
    }
};

function _buildAliases (aliasesConfig, aliasesMap) {
    if (!aliasesConfig) {
        return
    }

    aliasesConfig.forEach(function (alias) {
        switch (alias.operation) {
            case Types.AliasOperation.add :
            {
                aliasesMap.set(alias.dataFieldName, alias.listenerFieldName);
                break;
            }
            case Types.AliasOperation.delete :
            {
                aliasesMap.delete(alias.dataFieldName);
                break;
            }
            case Types.AliasOperation.clear :
            {
                aliasesMap.clear();
                break;
            }
            default :
            {
                break
            }
        }
    });
}

function _tryFormat(data, format) {
    if (data instanceof Date) {
        return DateFormat(data, format)
    } else if (typeof data === 'number') {
        return NumberFormat(format, data)
    } else if (typeof data === 'string') {
        return StringFormat(format, data);
    } else {
        return data
    }
}

function _isAliasesEqual(source, dest) {
    return (source.length === dest.length)
        && (source.every(function(alias){
            let _alias = dest.find(function (element) {
                return element.name == alias.name
            });

            return (_alias ? true : false)
                && alias.operation === _alias.operation
                && alias.listenerFieldName === _alias.listenerFieldName
                && alias.dataFieldName === _alias.dataFieldName
        }))
}

function _isListenersEqual(source, dest) {
    return (source.length === dest.size)
        && (source.every(function(listener){
            let _listener = dest.get(listener.name);
            return (_listener ? true : false) && _isAliasesEqual(_listener.aliases, listener.aliases)
        }))

};

if (module) {
    module.exports = Source;
}