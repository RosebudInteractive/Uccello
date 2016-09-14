'use strict';

var Listener = require('./../listener');
var Types = require('./../common/types');

/**
 * Класс, отслеживающий события трассировки в источнике и сохраняющий результаты в файл
 * @extends Tracer.Listener
 * @memberof Tracer
 */
var ConsoleListener = class ConsoleListener extends Listener{
    writeData(data) {
        var _traceString = '';
        var _field;

        var that = this;
        this.fields.forEach(function (field, fieldName) {
            _field = data.get(fieldName);
            if (_field) {
                _traceString += _field;
            }
            _traceString += that.delimiter;
        });

        if ((data.eventType) && ((data.eventType == Types.TraceEventType.Error) || (data.eventType == Types.TraceEventType.Critical))){
            console.error(_traceString)
        } else {
            console.log(_traceString);
        }
    }

    _getDefaultDelimiter() {
        return ' '
    }
};

if (module) {module.exports = ConsoleListener}