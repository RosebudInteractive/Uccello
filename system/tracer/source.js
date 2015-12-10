/**
 * Created by staloverov on 25.11.2015.
 */
var Manager = require('./manager');
var Utils = require('./common/utils');
var Types = require('./common/types');

function Source(name) {
    if (!name) {
        throw new Error('Source name is undefined');
    }

    this.name = name;
    this.switch = null;
    this.autoFlush = false;
    this.aliases = new Map();
    this.listeners = new Map();

    this.applySettings = function(config) {
        if (!config) {return}
        this.autoFlush = config.autoFlush;
        this.switch = Manager.getInstance().getSwitch(config.switchName);

        var _aliasesConfig = Utils.deepCopy(config.aliases);
        this.buildAliases(_aliasesConfig, this.aliases);

        var _listenersConfig = Utils.deepCopy(config.listeners);
        this.loadListener(_listenersConfig);
    };

    // Todo : можно без this сделать
    this.buildAliases = function (aliasesConfig, aliasesMap) {
        if (!aliasesConfig) { return }

        aliasesConfig.forEach(function(alias) {
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
                default : { break }
            }
        });
    };

    this.loadListener = function (listenersConfig) {
        var that = this;
        var listener = null;

        listenersConfig.forEach(function(element) {

            listener = Manager.getInstance().getListener(element.name);
            if (listener) {
                var _listenerInfo = {
                    listener : listener,
                    aliases : new Map()
                };

                that.buildAliases(element.aliases, _listenerInfo.aliases);

                that.listeners.set(listener.name, _listenerInfo);
            }
        })
    };

    this.hasSwitch = function () {
        return this.switch ? true : false
    };

    this.buildTraceDataForListener = function (listenerInfo, data) {
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
                _result.set(_fieldName, Utils.deepCopy(data[_field]));
            }
        }

        return _result;
    };

    this.trace = function(data, withFlush) {
        if (!data) { return }

        if (!data.sourceName) {
            data.sourceName = this.name
        }

        var _needTrace = this.hasSwitch() && this.switch.shouldBeTrace(data.eventType) && (this.listeners.size > 0);

        if (_needTrace) {
            for (var _listenerInfo of this.listeners.values()) {
                var _traceData = this.buildTraceDataForListener(_listenerInfo, data);
                _listenerInfo.listener.trace(_traceData, this.autoFlush || withFlush);
            }

        }
    };

    Manager.getInstance().addSource(this);
    var _config = Manager.getInstance().config.getSource(this.name);
    this.applySettings(_config);
}

if (module) {
    module.exports = Source;
}