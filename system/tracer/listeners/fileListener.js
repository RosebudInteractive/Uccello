/**
 * Created by staloverov on 03.12.2015.
 */
var Listener = require('./../listener');
var fs = require('fs');
var FileHolder = require('./../fileHolder');
var Types = require('./../common/types');

function FileListener(name) {
    Listener.apply(this, arguments);

    this._buffer = '';
    this.fileHolder = null;
    this.createNewFile = false;
}

FileListener.prototype = Object.create(Listener.prototype);
FileListener.prototype.constructor = FileListener;

FileListener.prototype.applySettings = function () {
    Listener.prototype.applySettings.apply(this, arguments);

    this.fileHolder = new FileHolder();
    this.fileHolder.init(this.options);

    var that = this;
    this.fileHolder.on('beforeChangeName', function() {that.doBeforeChangeFileName()});
    this.fileHolder.on('nameChanged', function() {that.doOnChangeFileName()});

    if (this.createNewFile) {
        this.fileHolder.createNewFile();
        this.createNewFile = false;
    }
};

FileListener.prototype.clear = function () {
    Listener.prototype.clear.apply(this, arguments);
    this.createNewFile = true;
};

FileListener.prototype.doBeforeChangeFileName = function () {};

FileListener.prototype.doOnChangeFileName = function () {
    if (this.fileHolder.fileIsNew()) {
        var _header = this.getHeader();
        this.writeHeader(_header);
        this.fileHolder.increaseFileSize(_header);
    }
};

FileListener.prototype.writeHeader = function(header){};

FileListener.prototype.writeData = function (data) {
    var _traceString = '';
    var _field;

    var that = this;
    var _needWriteRecord = false;

    this.fields.forEach(function (field, fieldName) {
        _field = data.get(fieldName);
        if (_field) {
            _needWriteRecord = true;
            _traceString += that.quoteValue(_field);
        }
        _traceString += that.delimiter;
    });

    if (_needWriteRecord) {
        this._buffer = this._buffer + _traceString + '\n';
    }
};

FileListener.prototype.getHeader = function () {
    var _result = '';
    var that = this;

    this.fields.forEach(function (field) {
        if (!field.title) {
            _result += that.quoteValue(field.name)
        } else {
            _result += that.quoteValue(field.title)
        }
        _result += that.delimiter
    });
    _result += '\n';

    return _result;
};

FileListener.prototype.quoteValue = function(value) {
    if (this.options.delimiter.type === Types.DelimiterType.tab) {
        return value
    } else {
        return '"' + value.toString().replace(/"/g, '""') + '"';
    }
}

if (module) {module.exports = FileListener}
