/**
 * @author
 * Created by staloverov on 20.07.2016.
 * @module ConsoleListener
 */
'use strict';

var Listener = require('./../listener');
var Types = require('./../common/types');

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