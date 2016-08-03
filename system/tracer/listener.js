/**
 * Created by staloverov on 20.11.2015.
 */
var Utils = require('./common/utils');
var Types = require('./common/types');

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

Listener.prototype.clear = function () {
    this.fields.clear();
    this.options = {};
};

Listener.prototype.isEqual = function(config) {
    var _fields = [...this.fields.values()];
    return (this.fields.size == config.fields.length)
        && (_fields.every(function (field, index) {
            return (field.name === config.fields[index].name)
                && (field.title === config.fields[index].title)
        }))
}

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
    // var _traceString = '';
    // var _field;
    //
    // var that = this;
    //
    // this.fields.forEach(function (field, fieldName) {
    //     _field = data.get(fieldName);
    //     if (_field) {
    //         _traceString += _field;
    //     }
    //     _traceString += that.delimiter;
    // });
    //
    // console.log(_traceString);
    throw new Error('Trace data can be written by concrete listener')
};

Listener.prototype.flush = function () {};

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

