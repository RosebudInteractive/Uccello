/**
 * Created by staloverov on 26.11.2015.
 */
var Types = require('./common/types');
var Manager = require('./manager');

function Switch(name) {
    if (!name) {
        throw new Error('Switch name is undefined');
    }

    this.name = name;
    this.level = Types.TraceLevel.Off;

    this.applySettings = function(config) {
        if (!config) {return}

        this.level = config.level
    };

    this.isEqual = function(config) {
        return (config ? true : false)
            && (config.constructor.name == 'SwitchConfig')
            && (this.level === config.level)
    };

    this.shouldBeTrace = function(eventType) {
        switch (this.level) {
            case Types.TraceLevel.ActivityTracing :
            {
                return eventType in [
                        Types.TraceEventType.Stop,
                        Types.TraceEventType.Start,
                        Types.TraceEventType.Suspend,
                        Types.TraceEventType.Transfer,
                        Types.TraceEventType.Resume
                    ]
            }
            case Types.TraceLevel.All :
            {
                return true
            }
            case Types.TraceLevel.Critical :
            {
                return eventType == Types.TraceEventType.Critical
            }
            case Types.TraceLevel.Error :
            {
                return eventType in [
                        Types.TraceEventType.Critical,
                        Types.TraceEventType.Error
                    ]
            }
            case Types.TraceLevel.Information :
            {
                return eventType in [
                        Types.TraceEventType.Critical,
                        Types.TraceEventType.Error,
                        Types.TraceEventType.Warning,
                        Types.TraceEventType.Information
                    ]
            }
            case Types.TraceLevel.Off :
            {
                return false
            }
            case Types.TraceLevel.Verbose :
            {
                return eventType in [
                        Types.TraceEventType.Critical,
                        Types.TraceEventType.Error,
                        Types.TraceEventType.Warning,
                        Types.TraceEventType.Information,
                        Types.TraceEventType.Verbose
                    ]
            }
            case Types.TraceLevel.Warning :
            {
                return eventType in [
                        Types.TraceEventType.Critical,
                        Types.TraceEventType.Error,
                        Types.TraceEventType.Warning
                    ]
            }
            default :
            {
                return false
            }
        }
    };

    Manager.getInstance().addSwitch(this);
    var _config = Manager.getInstance().config.getSwitch(this.name);
    this.applySettings(_config);
}

if (module) {
    module.exports = Switch;
}