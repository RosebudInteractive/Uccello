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
            {className:'DataControl', isUccello:true, component:'controls/aDataControl'},
            {className:'DataFieldControl', isUccello:true, component:'controls/aDataFieldControl'},
            {className:'DataRoot', isUccello:true, component:'dataman/dataRoot'},
            {className:'ADataModel', isUccello:true, component:'controls/aDataModel'},
            {className:'DataField', isUccello:true, component:'controls/dataField'},
            {className:'Dataset', isUccello:true, component:'controls/dataset'},
            {className:'FormParam', isUccello:true, component:'controls/formParam'},
            {className:'SubForm', isUccello:true, component:'controls/subForm'}
        ],

        classGuids: {
            'ClientConnection':"5f27198a-0dd2-81b1-3eeb-2834b93fb514",
            'Connect':'66105954-4149-1491-1425-eac17fbe5a72',
            'ConnectInfo':"42dbc6c0-f8e4-80a5-a95f-e43601cccc71",
            'Session':"70c9ac53-6fe5-18d1-7d64-45cfff65dbbb",
            'SessionInfo':"479c72e9-29d1-3d6b-b17b-f5bf02e52002",
            'User':"dccac4fc-c50b-ed17-6da7-1f6230b5b055",
            'UserInfo':"e14cad9b-3895-3dc9-91ef-1fb12c343f10",
            'VisualContext':"d5fbf382-8deb-36f0-8882-d69338c28b56",
            'VisualContextInfo':"a900a7c3-9648-7117-0b3a-ce0900f45987",
            'AComponent':"5b8c93e7-350d-de2a-e2b4-1025a03b17db",
            'AControl':"c576cb6e-cdbc-50f4-91d1-4dc3b48b0b59",
            'ADataControl':"b2c132fd-c6bc-b3c7-d149-27a926916216",
            'ADataFieldControl':"00a12976-6fe3-6592-1984-635684b30885",
            'ADataModel':"5e89f6c7-ccc2-a850-2f67-b5f5f20c3d47",
            'DataField':"4bade3a6-4a25-3887-4868-9c3de4213729",
            'Dataset':"3f3341c7-2f06-8d9d-4099-1075c158aeee",
            'FormParam':"4943ce3e-a6cb-65f7-8805-ec339555a981",
            'SubForm':"d7785c24-0b96-76ee-46a7-b0103cda4aa0",
            'DataRoot':"87510077-53d2-00b3-0032-f1245ab1b74d"
        },

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