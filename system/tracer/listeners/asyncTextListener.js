/**
 * @author
 * Created by staloverov on 03.12.2015.
 * @module AsyncTextListener
 */
var FileListener = require('./fileListener');
var fs = require('fs');
var Types = require('./../common/types');

function AsyncTextListener(name) {
    FileListener.apply(this, arguments);

    this._stream = null;
    this._messageBuffer = [];
}

AsyncTextListener.prototype = Object.create(FileListener.prototype);
AsyncTextListener.prototype.constructor = AsyncTextListener;

AsyncTextListener.prototype.doOnChangeFileName = function () {
    this.openActualFile();
    FileListener.prototype.doOnChangeFileName.apply(this, arguments);
};

AsyncTextListener.prototype.doBeforeChangeFileName = function () {
    if (!this.fileHolder.isEmpty()) {
        this._stream.end();
    }
};

AsyncTextListener.prototype.openActualFile = function() {
    var _flags;
    if (this.fileHolder.openMode == Types.FileOpenMode.append) {
        _flags = 'a'
    } else {
        _flags = 'w'
    }

    this._stream = fs.createWriteStream(this.fileHolder.actualFileName, { flags : _flags, encoding : this.fileHolder.encoding });
};

AsyncTextListener.prototype.writeHeader = function(header){
    this._messageBuffer.unshift(header);
};

AsyncTextListener.prototype.writeData = function (data) {
    FileListener.prototype.writeData.apply(this, arguments);

    this._messageBuffer.push(this._buffer);
    this._buffer = '';

    this.saveToFile()
};

AsyncTextListener.prototype.flush = function () {
    // this._stream.end();
};


AsyncTextListener.prototype.saveToFile = function() {
    if (this._messageBuffer.length == 0) {
        return
    }

    if (this.fileHolder.actualFileName == '') {
        this.fileHolder.openNextFile('');
    }

    var that = this;

    write();

    function write() {
        var ok = true;
        do {
            var _data = that._messageBuffer.shift();

            if (!that.fileHolder.checkWriteData(_data)) {
                that.fileHolder.openNextFile(_data)
            }

            ok = that._stream.write(_data);

            that.fileHolder.increaseFileSize(_data);

            if (!ok) {
                that._stream.removeAllListeners('drain');
            }
        } while (that._messageBuffer.length > 0 && ok);

        if (that._messageBuffer.length > 0) {
            that._stream.once('drain', write);
        }
    }
};

if (module) {module.exports = AsyncTextListener}