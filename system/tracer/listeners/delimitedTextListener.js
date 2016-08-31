/**
 * @author
 * Created by staloverov on 27.11.2015.
 * @module DelimitedTextListener
 */
var FileListener = require('./fileListener');
var fs = require('fs');
//var Types = require('./../common/types');

function DelimitedTextListener(name) {
    FileListener.apply(this, arguments);
}

DelimitedTextListener.prototype = Object.create(FileListener.prototype);
DelimitedTextListener.prototype.constructor = DelimitedTextListener;

DelimitedTextListener.prototype.writeHeader = function(header){
    fs.writeFileSync(this.fileHolder.actualFileName, header , {encoding: this.fileHolder.encoding});
};

DelimitedTextListener.prototype.writeData = function (data) {
    FileListener.prototype.writeData.apply(this, arguments);
    this.flush()
};

DelimitedTextListener.prototype.flush = function () {
    if (!this.fileHolder.hasDataToFlush(this._buffer)) { return }

    if (!this.fileHolder.checkWriteData(this._buffer)) {
        this.fileHolder.openNextFile(this._buffer)
    }

    fs.appendFileSync(this.fileHolder.actualFileName, this._buffer, {encoding: this.fileHolder.encoding});

    this.fileHolder.increaseFileSize(this._buffer);
    this._buffer = '';
};

if (module) {module.exports = DelimitedTextListener}
