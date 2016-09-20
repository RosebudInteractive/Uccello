var DelimitedTextListener = require('./listeners/delimited-text-listener');
var Manager = require('./manager');
var AsyncTextListener = require('./listeners/async-text-listener');
var ConsoleListener = require('./listeners/console-listener');

var ListenerTypes = {
    'DelimitedTextListener' : DelimitedTextListener,
    'AsyncTextListener' : AsyncTextListener,
    'ConsoleListener' : ConsoleListener
};

function getListenerConstructor(listenerType) {
    if (ListenerTypes.hasOwnProperty(listenerType)) {
        return ListenerTypes[listenerType]
    } else {
        return null
    }
}

/**
 * Фабрика Listener-ов
 * @constructor
 * @memberof Tracer
 */
function Factory() {}

/**
 * Создание Listener-а по конфигурационным данным
 * @param {object} listenerInfo данные Listener-а
 * @param {string} listenerInfo.name имя Listener-а
 * @param {string} listenerInfo.type тип Listener-а
 * @return {Tracer.Listener}
 */
Factory.createListener = function(listenerInfo) {
    if ((!listenerInfo) || (!listenerInfo.type) || (!listenerInfo.name)) { return }
    var _constructor = getListenerConstructor(listenerInfo.type);
    if (!_constructor) {
        throw new Error('Unknown listener type [%s]', listenerInfo.type)
    }
    var _listener = new  _constructor(listenerInfo.name);
    _listener.applySettings(listenerInfo);
    Manager.getInstance().addListener(_listener);


    return _listener;
};

if (module) {module.exports = Factory}