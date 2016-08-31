/**
 * @author
 * Created by staloverov on 03.12.2015.
 * @module ListenerFactory
 */
var DelimitedTextListener = require('./listeners/delimitedTextListener');
var Manager = require('./manager');
var AsyncTextListener = require('./listeners/asyncTextListener');
var ConsoleListener = require('./listeners/consoleListener');

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

function Factory() {}

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