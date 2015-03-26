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
            {className:'SubForm', isUccello:true, component:'controls/subForm'},
            {className:'Container', isUccello:true, component:'controls/container', viewset:false},
            {className:'Form', isUccello:true, component:'controls/form', viewset:false},
            {className:'Button', isUccello:true, component:'controls/button', viewset:false},
            {className:'DataColumn', isUccello:true, component:'controls/dataColumn'},
            {className:'DataGrid', isUccello:true, component:'controls/dataGrid', viewset:false},
            {className:'DataEdit', isUccello:true, component:'controls/dataEdit', viewset:false},
            {className:'Edit', isUccello:true, component:'controls/edit', viewset:false},
            {className:'Label', isUccello:true, component:'controls/label', viewset:false}
        ],

        guids: {
            'sysDB': 'fb41702c-faba-b5c0-63a8-8d553bfe54a6'
        },

        classGuids: {
            'ClientConnection':"5f27198a-0dd2-81b1-3eeb-2834b93fb514",
            'Connect':'66105954-4149-1491-1425-eac17fbe5a72',
            'ConnectInfo':"42dbc6c0-f8e4-80a5-a95f-e43601cccc71",
            'Session':"70c9ac53-6fe5-18d1-7d64-45cfff65dbbb",
            'SessionInfo':"479c72e9-29d1-3d6b-b17b-f5bf02e52002",
            'User':"dccac4fc-c50b-ed17-6da7-1f6230b5b055",
            'UserInfo':"e14cad9b-3895-3dc9-91ef-1fb12c343f10",
            'AComponent':"5b8c93e7-350d-de2a-e2b4-1025a03b17db",
            'AControl':"c576cb6e-cdbc-50f4-91d1-4dc3b48b0b59",
            'ADataControl':"b2c132fd-c6bc-b3c7-d149-27a926916216",
            'ADataFieldControl':"00a12976-6fe3-6592-1984-635684b30885",
            'ADataModel':"5e89f6c7-ccc2-a850-2f67-b5f5f20c3d47",
            'DataField':"4bade3a6-4a25-3887-4868-9c3de4213729",
            'Dataset':"3f3341c7-2f06-8d9d-4099-1075c158aeee",
            'FormParam':"4943ce3e-a6cb-65f7-8805-ec339555a981",
            'SubForm':"d7785c24-0b96-76ee-46a7-b0103cda4aa0",
            'DataRoot':"87510077-53d2-00b3-0032-f1245ab1b74d",
            'Label':"32932036-3c90-eb8b-dd8d-4f19253fabed",
            'Form':"7f93991a-4da9-4892-79c2-35fe44e69083",
            'Edit':"f79d78eb-4315-5fac-06e0-d58d07572482",
            'DataEdit':"affff8b1-10b0-20a6-5bb5-a9d88334b48e",
            'DataColumn':"100f774a-bd84-8c46-c55d-ba5981c09db5",
            'Container':"1d95ab61-df00-aec8-eff5-0f90187891cf",
            'Button':"af419748-7b25-1633-b0a9-d539cada8e0d",
            'DataGrid':"ff7830e2-7add-e65e-7ddf-caba8992d6d8",
            'UModule':"8fead303-a4e1-98bb-efb6-ee38ee021265",
            'VisualContext':"64827c89-e73e-215f-f71a-7f90627ae61d"
        },

        controlsPath: '',
        uccelloPath: '',
        viewSet: null,
        webSocketServer: {port:8081},

        init: function(config) {
            for(var index in config) {
                switch (index) {
                    case 'controls':
                        var controlNames = {};
                        for(var i=0; i<this.controls.length; i++) {
                            controlNames[this.controls[i].className] = i;
                        }
                        for(var i=0; i<config[index].length; i++) {
                            if (controlNames[config[index][i].className]) {
                                if (config[index][i].viewset)
                                    this.controls[controlNames[config[index][i].className]].viewset = config[index][i].viewset;
                            } else {
                                this.controls.push(config[index][i]);
                                this.classGuids[config[index][i].className] = config[index][i].guid;
                            }
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