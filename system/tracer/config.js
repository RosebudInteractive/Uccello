/**
 * Created by staloverov on 19.11.2015.
 */
var fs = require('fs');

function ListenerConfig() {
    this.type = '';
    this.name = '';
    this.fields = [];
    this.options = [];
}

function SourceConfig() {
    this.switchName = '';
}

function Config(configFileName) {
    if (configFileName != '') {
        if (fs.existsSync(configFileName)) {
            var _text = fs.readFileSync(configFileName);
        } else {
            throw new Error('Can not find file [%s]', configFileName);
        }

        var _prototype = JSON.parse(_text);
        Object.setPrototypeOf(this, _prototype);
    }

    if (!this.listeners) {this.listeners = []}
    if (!this.switches) {this.switches = []}
    if (!this.sources) {this.sources = []}

    this.getListener = function(name, type) {
        return this.listeners.find(function(element) {
            return ((element.name == name) && (element.type == type))
        });
    };

    this.getSource = function(name){
        return this.sources.find(function(element) {
            return element.name == name
        });
    };

    this.getSwitch = function(name) {
        return this.switches.find(function(element) {
            return element.name == name
        })
    }
}

if (module) {module.exports = Config}
