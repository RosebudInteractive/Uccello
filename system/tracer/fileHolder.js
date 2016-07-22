/**
 * Created by staloverov on 07.12.2015.
 */

var Types = require('./common/types');
var fs = require('fs');
const EventEmitter = require('events');
const util = require('util');

function FileHolder() {
    this.limitType = Types.FileLimitType.unlimited;
    this.actualFileName = '';
    this._fileSize = 0;

    this._hasNumInFileName = false;
    this._hasDateInFileName = false;

    this._currentNumber = 0;
    this._lastTime = 0;

    this.encoding = 'utf8';
    EventEmitter.call(this);
}

util.inherits(FileHolder, EventEmitter);

FileHolder.prototype.init = function(config) {
    this.setFileLimit(config.cyclic);

    if ((!config.folder) || (!config.filename)) {
        throw new Error('Undefined log filename')
    } else {
        this.folder = config.folder;
        this.filename = config.filename
    }

    if (!fs.existsSync(this.folder)) {
        mkdir(this.folder)
    }

    if (!config.encoding) { this.encoding = 'utf8' } else { this.encoding = config.encoding }

    this._hasNumInFileName = this.filename.search('{num}') != -1;
    this._hasDateInFileName = this.filename.search('{date}') != -1;

    this._currentNumber = 0;
    this._lastTime = 0;

    this.actualFileName = '';
    this._fileSize = 0;

    if (!config.openMode) {
        this.openMode = Types.FileOpenMode.createNew;
    } else {
        this.openMode = config.openMode;
    }
};

FileHolder.prototype.setFileLimit = function(cyclic) {
    if ((!cyclic) || (!cyclic.limited)) {
        this.limitType = Types.FileLimitType.unlimited
    } else {
        this.limitType = cyclic.limited
    }

    switch (this.limitType) {
        case Types.FileLimitType.bySize : {
            this.maxFileSize = Types.convertToBytes(cyclic.size, cyclic.unit);
            break;
        }
        case Types.FileLimitType.byTime : {
            this.periodTime = cyclic.size;
            this.periodUnit = cyclic.unit;
            break;
        }
    }
};

FileHolder.prototype.getNewName = function() {
    var _fileName = this.filename;

    if (this._hasNumInFileName) {
        this._currentNumber++;
        _fileName = _fileName.replace('{num}', this._currentNumber.toString());
    }
    if (this._hasDateInFileName) {
        this._lastTime = (new Date).toLocaleString();
        var _date = this._lastTime.replace(/:/g, '_');
        _date = _date.replace(/ /g, '_');
        _date = _date.replace(/-/g, '_');
        _fileName = _fileName.replace('{date}', _date);
    }

    return this.folder + _fileName;
};

FileHolder.prototype.setName = function(newName) {
    if (newName != this.actualFileName) {
        this.emit('beforeChangeName');

        this.actualFileName = newName;
        this._fileSize = getActualFileSize(this.actualFileName, this.openMode);

        this.emit('nameChanged')
    }
};

FileHolder.prototype.fileIsNew = function() {
    return this._fileSize == 0;
};

FileHolder.prototype.isEmpty = function() {
    return this._fileSize == 0;
};

FileHolder.prototype.increaseFileSize = function(data) {
    this._fileSize += this.getByteSize(data);
};

FileHolder.prototype.getByteSize = function(data) {
    return getByteSize(data, this.encoding)
};

function getByteSize(data, encoding) {
    return Buffer.byteLength(data, encoding)
}

FileHolder.prototype.hasDataToFlush = function(data) {
    return this._fileSize + this.getByteSize(data) != 0
};

function checkFileSize(currentSize, maxSize, data, encoding) {
    var _dataSize = getByteSize(data, encoding);

    if (_dataSize > maxSize) {
        throw new Error('Log string bigger that file size limit')
    }

    return (currentSize + _dataSize) < maxSize;
}

function checkFileTime(lastTime, periodTime, periodUnit){
    var _maxTime = Types.addPeriodTo(lastTime, periodTime, periodUnit);
    return (_maxTime > new Date)
}

FileHolder.prototype.checkWriteData = function(data) {
    if (this.actualFileName == '') {
        this.openNextFile(data)
    }

    switch (this.limitType) {
        case Types.FileLimitType.bySize : {
            return checkFileSize(this._fileSize, this.maxFileSize, data, this.encoding);
        }
        case Types.FileLimitType.byTime : {
            return checkFileTime(this._lastTime, this.periodTime, this.periodUnit);
        }
        default : {
            return true;
        }
    }
};

FileHolder.prototype.openNextFile = function(data) {
    var _newFileName = this.getNewName();

    // Todo возможно стоит сделать проверку на одинаковые имена для всех openMode, иначе будет постоянно перезаписывать
    if ((this.openMode == Types.FileOpenMode.append) && (_newFileName == this.actualFileName)) {
        throw new Error('Wrong filename template [%s], need {num} or {date} in template', this.filename)
    }

    if (this.openMode == Types.FileLimitType.bySize) {
        var _goodFileName = false;
        do {
            var _newFileSize = getActualFileSize(_newFileName, this.openMode);
            _goodFileName = checkFileSize(_newFileSize, this.maxFileSize, data, this.encoding);
            // Todo : возможно зацикливание!!!! Нужен TryCount
        } while (_goodFileName);
    }

    this.setName(_newFileName);
};

function getActualFileSize(name, mode){
    if ((mode != Types.FileOpenMode.append) || !fs.existsSync(name)) {
        return 0;
    } else {
        var _stat = fs.statSync(name);
        return _stat.size;
    }
}

function mkdir(path, root) {

    var dirs = path.split('/'),
        dir = dirs.shift(),
        root = (root || '') + dir + '/';

    try { fs.mkdirSync(root); }
    catch (e) {
        //dir wasn't made, something went wrong
        if(!fs.statSync(root).isDirectory()) throw new Error(e);
    }

    return !dirs.length || mkdir(dirs.join('/'), root);
}

if (module) {module.exports = FileHolder}