if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Config
 * @module Config
 */
define([], function() {

    var config = Class.extend({

        controls: [
            {className:'DataControl', isUccello:true, component:'controls/aDataControl', guid:'2c132fd-c6bc-b3c7-d149-27a926916216'},
            {className:'DataFieldControl', isUccello:true, component:'controls/aDataFieldControl', guid:'2c132fd-c6bc-b3c7-d149-27a926916216'},
            {className:'DataRoot', isUccello:true, component:'dataman/dataRoot', guid:'87510077-53d2-00b3-0032-f1245ab1b74d'},
            {className:'ADataModel', isUccello:true, component:'controls/aDataModel', guid:'5e89f6c7-ccc2-a850-2f67-b5f5f20c3d47'},
            {className:'DataField', isUccello:true, component:'controls/dataField', guid:'4bade3a6-4a25-3887-4868-9c3de4213729'},
            {className:'Dataset', isUccello:true, component:'controls/dataset', guid:'3f3341c7-2f06-8d9d-4099-1075c158aeee'},
            {className:'FormParam', isUccello:true, component:'controls/formParam', guid:'4943ce3e-a6cb-65f7-8805-ec339555a981'},
            {className:'SubForm', isUccello:true, component:'controls/subForm', guid:'d7785c24-0b96-76ee-46a7-b0103cda4aa0'}
        ],
        controlsPath: '',
        uccelloPath: '',

        init: function(config) {
            for(var index in config) {
                switch (index) {
                    case 'controls':
                        for(var i=0; i<config[index].length; i++) {
                            this.controls.push(config[index][i]);
                        }
                        break;
                    default:
                        this[index] = config[index];
                        break;
                }
            }
        }
    });

    return config;
});