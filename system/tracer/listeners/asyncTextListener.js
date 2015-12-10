/**
 * Created by staloverov on 03.12.2015.
 */
var FileListener = require('./fileListener');
var fs = require('fs');
var Types = require('./../common/types');
var Stream = require('stream');

function StreamTextListener(name) {
    FileListener.apply(this, arguments);

    this._stream = null;
    this._messageBuffer = [];
}

StreamTextListener.prototype = Object.create(FileListener.prototype);
StreamTextListener.prototype.constructor = StreamTextListener;

StreamTextListener.prototype.doOnChangeFileName = function () {
    this.openActualFile();
    FileListener.prototype.doOnChangeFileName.apply(this, arguments);
};

StreamTextListener.prototype.doBeforeChangeFileName = function () {
    if (!this.fileHolder.isEmpty()) {
        this._stream.end();
    }
};

StreamTextListener.prototype.openActualFile = function() {
    var _flags;
    if (this.fileHolder.openMode == Types.FileOpenMode.append) {
        _flags = 'a'
    } else {
        _flags = 'w'
    }

    this._stream = fs.createWriteStream(this.fileHolder.actualFileName, { flags : _flags, encoding : this.fileHolder.encoding });
};

StreamTextListener.prototype.writeHeader = function(header){
    this._messageBuffer.unshift(header);
};

StreamTextListener.prototype.writeData = function (data) {
    FileListener.prototype.writeData.apply(this, arguments);

    this._messageBuffer.push(this._buffer);
    this._buffer = '';

    this.saveToFile()
};

StreamTextListener.prototype.flush = function () {
    this._stream.end();
};


StreamTextListener.prototype.saveToFile = function() {
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


//function saveToFile(readStream, writeStream) {
//    readStream.on('readable', writeChunk);
//
//    function writeChunk(){
//        var _chunk = readStream.read();
//
//        if (_chunk && !writeStream.write(_chunk)) {
//            readStream.removeListener('readable', writeChunk);
//
//            writeStream.once('drain', function () {
//                readStream.on('readable', writeChunk);
//                writeChunk();
//            });
//        }
//    }
//
//    readStream.on('end', function() {
//        writeStream.end();
//    });
//}

if (module) {module.exports = StreamTextListener}