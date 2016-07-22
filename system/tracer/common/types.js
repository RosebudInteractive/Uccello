/**
 * Created by staloverov on 30.11.2015.
 */

var Types = {
    AliasOperation : {
        add : 'add',
        delete : 'delete',
        clear : 'clear'
    },

    DelimiterType : { csv : 'csv', tab : 'tab', other : 'other' },

    FileOpenMode : { createNew : 'createNew', append : 'append' , overwrite : 'overwrite' },
    FileLimitType : { unlimited : 'unlimited', bySize : 'bySize', byTime : 'byTime' },
    PeriodType : { minute : 'minute', hour : 'hour', day : 'day', month : 'month' },
    SizeType : { kb : 'Kb', mb : 'Mb', gb : 'Gb' },

    TraceLevel : {
        ActivityTracing: 'ActivityTracing',
        All: 'All',
        Critical: 'Critical',
        Error: 'Error',
        Information: 'Information',
        Off: 'Off',
        Verbose: 'Verbose',
        Warning: 'Warning'
    },

    TraceEventType : {
        Critical: 'Critical',
        Error: 'Error',
        Information: 'Information',
        Resume: 'Resume',
        Start: 'Start',
        Stop: 'Stop',
        Suspend: 'Suspend',
        Transfer: 'Transfer',
        Verbose: 'Verbose',
        Warning: 'Warning'
    }
};

Types.convertToBytes = function(size, unit) {
    switch (unit) {
        case (Types.SizeType.kb) :
        {
            return size * 1024
        }
        case (Types.SizeType.mb) : {
            return size * 1048576
        }
        case (Types.SizeType.gb) : {
            return size * 1073741824
        }
        default : {
            throw new Error('Unknown size unit [%s]', unit)
        }
    }
};

Types.addPeriodTo = function(currentDate, period, unit) {
    var _result = currentDate;
    switch (unit) {
        case (Types.PeriodType.minute) : {
            _result.setMinutes(currentDate.getMinutes() + 1);
            break;
        }
        case (Types.PeriodType.hour) : {
            _result.setHours(currentDate.getHours() + 1);
            break;
        }
        case (Types.PeriodType.day) :
        {
            _result.setDate(currentDate.getDay() + 1);
            break;
        }
        case (Types.PeriodType.month) :
        {
            _result.setMonth(currentDate.getMonth() + 1);
            break;
        }
        default : {break}
    }
    return _result;
};

if (module) {module.exports = Types}