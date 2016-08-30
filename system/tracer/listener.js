/**
 * @module Listener
 * @author
 * Created by staloverov on 20.11.2015.
 */
var Utils = require('./common/utils');
var Types = require('./common/types');

/**
 * @param name
 * @constructor
 */
function Listener(name) {
    if (!name) {
        throw new Error('Listener name is undefined');
    }

    this.name = name;
    this.filter = '';
    this.autoFlush = false;
    this.fields = new Map();
    this.options = {};
    this.isLoaded = false;
}

/**
 * Применить настройки
 * @param config
 */
Listener.prototype.applySettings = function (config) {
    if (!config || this.isEqual(config)) { return }

    if (this.isLoaded) {
        this.clear()
    };
    var that = this;

    config.fields.forEach(function (field) {
        that.fields.set(field.name, Utils.deepCopy(field));
    });

    for (var _option in config.options) {
        if (config.options.hasOwnProperty(_option)) {
            if (_option == 'autoFlush') {
                this.autoFlush = config.options[_option]
            } else {
                this.options[_option] = config.options[_option];
            }
        }
    }

    this.delimiter = this.getDelimiter();
    this.isLoaded = true;
};

/**
 * Очистить
 */
Listener.prototype.clear = function () {
    this.fields.clear();
    this.options = {};
};


Listener.prototype.isEqual = function(config) {
    var _fields = [...this.fields.values()];
    return (this.fields.size == config.fields.length)
        && (_fields.every(function (field, index) {
            return Utils.equal(field, config.fields[index])
        }))
        && (config.options !== undefined)
        && (Utils.equal(config.options.encoding, this.options.encoding))
        && (Utils.equal(config.options.delimiter, this.options.delimiter))
        && (Utils.equal(config.options.folder, this.options.folder))
        && (Utils.equal(config.options.filename, this.options.filename))
};

Listener.prototype.getDelimiter = function() {
    if (!this.options.delimiter) {
        return this._getDefaultDelimiter()
    }

    switch (this.options.delimiter.type) {
        case Types.DelimiterType.csv :
        {
            return ';'
        }
        case Types.DelimiterType.tab :
        {
            return '\t';
        }
        case Types.DelimiterType.other :
        {
            return this.options.delimiter.symbol
        }
        default :
        {
            return this._getDefaultDelimiter();
        }
    }
};

Listener.prototype._getDefaultDelimiter = function() {
    return ';'
};

Listener.prototype.writeData = function (data) {
    throw new Error('Trace data can be written by concrete listener')
};

Listener.prototype.flush = function () {};

/**
 * Записать данные трассировки
 * @param data
 * @param withFlush
 */
Listener.prototype.trace = function (data, withFlush) {
    this.writeData(data);
    if (this.autoFlush || withFlush) {
        this.flush();
    }
};

Listener.prototype.getFields = function() {
    return this.fields;
};

if (module) {module.exports = Listener}

