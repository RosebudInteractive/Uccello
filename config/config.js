if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require('../system/uccello-class');
}

/**
 * Config
 * @module Config
 */
define([], function () {

    var CommClientTypes = {
        AJAX: 1,
        WEB_SOCKET: 2,
        SOCKET_IO: 4
    };

    var CommServerTypes = {
        AJAX: 1,
        WEB_SOCKET: 2,
        SOCKET_IO: 4
    };

    var config = UccelloClass.extend({

        // расширяемый список контролов
        controls: [
            { className: 'UModule', isUccello: true, component: 'system/umodule', metaType: ['sys', 'client'] },
            { className: 'AComponent', isUccello: true, component: 'controls/aComponent', metaType: ['sys', 'content', 'client'] },
            { className: 'Session', isUccello: true, component: 'connection/session', metaType: ['sys'] },
            { className: 'VisualContext', isUccello: true, component: 'connection/vc', metaType: ['sys', 'client'] },
            { className: 'User', isUccello: true, component: 'connection/user', metaType: ['sys'] },
            { className: 'Connect', isUccello: true, component: 'connection/connect', metaType: ['sys'] },
            { className: 'UserInfo', isUccello: true, component: 'connection/userinfo', metaType: ['sys'] },
            { className: 'SessionInfo', isUccello: true, component: 'connection/sessioninfo', metaType: ['sys'] },
            { className: 'ConnectInfo', isUccello: true, component: 'connection/connectinfo', metaType: ['sys'] },
            { className: 'Vcresource', isUccello: true, component: 'connection/vcresource', metaType: ['sys', 'client'] },
            { className: 'ClientConnection', isUccello: true, component: 'connection/clientConnection', metaType: ['client'] },
            { className: 'AControl', isUccello: true, component: 'controls/aControl', metaType: ['content'] },
            { className: 'ADataControl', isUccello: true, component: 'controls/aDataControl', metaType: ['content'] },
            { className: 'ADataFieldControl', isUccello: true, component: 'controls/aDataFieldControl', metaType: ['content'] },
            { className: 'DataObject', isUccello: true, component: 'dataman/dataobject', metaType: ['content'] },
            { className: 'DataRoot', isUccello: true, component: 'dataman/dataRoot', metaType: ['content'] },
            { className: 'DataField', isUccello: true, component: 'controls/dataField', metaType: ['content'] },
            { className: 'IndexField', isUccello: true, component: 'memDB/indexField', metaType: ['sys', 'client', 'content'] },
            { className: 'CollectionIndex', isUccello: true, component: 'memDB/collectionIndex', metaType: ['sys', 'client', 'content'] },
            { className: 'Dataset', isUccello: true, component: 'controls/dataset', metaType: ['content'] },
            { className: 'ADataModel', isUccello: true, component: 'controls/aDataModel', metaType: ['content'] },
            { className: 'FormParam', isUccello: true, component: 'controls/formParam', metaType: ['content'] },
            { className: 'SubForm', isUccello: true, component: 'controls/subForm', metaType: ['content'] },
            { className: 'Container', isUccello: true, component: 'controls/container', viewset: false, metaType: ['content'] },
            { className: 'CContainer', isUccello: true, component: 'controls/cContainer', viewset: false, metaType: ['content'] },
            { className: 'HContainer', isUccello: true, component: 'controls/hContainer', viewset: false, metaType: ['content'] },
            { className: 'VContainer', isUccello: true, component: 'controls/vContainer', viewset: false, metaType: ['content'] },
            { className: 'GContainer', isUccello: true, component: 'controls/gContainer', viewset: false, metaType: ['content'] },
            { className: 'FContainer', isUccello: true, component: 'controls/fContainer', viewset: false, metaType: ['content'] },
            { className: 'GColumn', isUccello: true, component: 'controls/gColumn', viewset: false, metaType: ['content'] },
            { className: 'GRow', isUccello: true, component: 'controls/gRow', viewset: false, metaType: ['content'] },
            { className: 'GCell', isUccello: true, component: 'controls/gCell', viewset: false, metaType: ['content'] },
            { className: 'Button', isUccello: true, component: 'controls/button', viewset: false, metaType: ['content'] },
            { className: 'DataColumn', isUccello: true, component: 'controls/dataColumn', metaType: ['content'] },
            { className: 'DataGrid', isUccello: true, component: 'controls/dataGrid', viewset: false, metaType: ['content'] },
            { className: 'DataEdit', isUccello: true, component: 'controls/dataEdit', viewset: false, metaType: ['content'] },
            { className: 'Edit', isUccello: true, component: 'controls/edit', viewset: false, metaType: ['content'] },
            { className: 'Label', isUccello: true, component: 'controls/label', viewset: false, metaType: ['content'] },
            { className: 'Form', isUccello: true, component: 'controls/form', viewset: false, metaType: ['content'] },
            { className: 'MetaModelField', isUccello: true, component: 'metaData/metaModelField', metaType: ['sys', 'client'] },
            { className: 'MetaModel', isUccello: true, component: 'metaData/metaModel', metaType: ['sys', 'client'] },
            { className: 'MetaDataMgr', isUccello: true, component: 'metaData/metaDataMgr', metaType: ['sys', 'client'] },
        ],

        // остальные гуиды
        guids: {
            'sysDB': 'fb41702c-faba-b5c0-63a8-8d553bfe54a6',
            'guidServer': 'd3d7191b-3b4c-92cc-43d4-a84221eb35f5',
            'rootCompany': 'ab573a02-b888-b3b4-36a7-38629a5fe6b7',
            'rootTstCompany': '5f9e649d-43c4-d1e6-2778-ff4f58cd7c53',
            'rootContact': 'b49d39c9-b903-cccd-7d32-b84beb1b76dc',
            'rootTstContact': '3618f084-7f99-ebe9-3738-4af7cf53dc49',
            'rootContract': '8583ee1d-6936-19da-5ef0-9025fb7d1d8d',
            'rootAddress': 'edca46bc-3389-99a2-32c0-a59665fcb6a7',
            'rootLead': 'c170c217-e519-7c23-2811-ff75cd4bfe81',
            'rootIncomeplan': '8770f400-fd42-217c-90f5-507ca52943c2',
            'rootOpportunity': 'f988a1cb-4be0-06c3-4eaa-4ae8b554f6b3',
            'Interfsrv': 'ef9bfa83-8371-6aaa-b510-28cd83291ce9',
            'metaObjFieldsGuid': '0fa90328-4e86-eba7-b12b-4fff3a057533',
            'metaObjColsGuid': '99628583-1667-3341-78e0-fb2af29dbe8',
            'metaRootGuid': 'fc13e2b8-3600-b537-f9e5-654b7418c156',
            'metaObjGuid': '4dcd61c3-3594-7456-fd86-5a3527c5cdcc'
        },

        // гуиды классов учелло
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
            'Button':"af419748-7b25-1633-b0a9-d539cada8e0d",
            'DataGrid':"ff7830e2-7add-e65e-7ddf-caba8992d6d8",
            'UModule':"8fead303-a4e1-98bb-efb6-ee38ee021265",
            'VisualContext':"64827c89-e73e-215f-f71a-7f90627ae61d",
            'Vcresource':"870c63b5-7aed-bb44-3109-bb63a407988f",
            'UObject':"3b02ef32-83b7-e470-ec5c-f6605e46e9dc",
            'Container':"d9f2fe22-ba91-1638-0f64-fb15a5410d01",
            'CContainer':"1d95ab61-df00-aec8-eff5-0f90187891cf",
            'HContainer':"638c1e37-2105-9676-f3c9-dfc2746d1265",
            'VContainer':"a56e2e53-c72d-f014-d763-e096bfb51b8f",
            'GContainer':"26309035-7f47-422e-26c8-6c25a091c20e",
            'GColumn':"9d00a857-4a93-6b7a-9ef0-08b14dc81e54",
            'GRow':"157eb87c-3331-97cf-e307-a0c5311ba7d5",
            'GCell':"69087f9c-99ed-14f1-0fe7-05058a862af5",
            'FContainer':"902822d8-3079-f394-2eed-3ad9ac27b2f2",
            'DataObject':"edb1b63c-f72c-6f0a-b64c-3b34da7facdb",
            'MetaDataMgr':"ec139e1e-39d7-4ddd-8e31-c5d644403f41",
            'MetaModel':"183f6fb9-9f17-4955-a22c-4f03c4273413",
            'MetaModelField':"0997ccff-09ec-4978-b120-3ef7d6668bc2",
            'CollectionIndex':"43626e45-cfeb-406a-aca8-122a8bcbd5aa",
            'IndexField':"7806a983-c946-438f-95a4-71ab08e38074"
        },

        // изменяемые свойства
        controlsPath: '',
        uccelloPath: '',
        viewSet: null,
        commServerTypes: CommServerTypes,
        commClientTypes: CommClientTypes,
        webServer: {
            port:1325
        },
        webSocketServer: {
            port: 8081,
            type: CommServerTypes.AJAX + CommServerTypes.WEB_SOCKET
            //type: CommServerTypes.SOCKET_IO
        },
        webSocketClient: {
            type: CommClientTypes.WEB_SOCKET
            //type: CommClientTypes.SOCKET_IO
            //type: CommClientTypes.AJAX,
            //ajax: 
            //    {
            //        polling_timeout: 500
            //    }
        },

        logger: {
            file: '../logs/funcexec.csv',
            clearOnStart: true
        },

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
                    case 'guids': // запретить перезатирать
                    case 'classGuids':
                        break;
                    case 'webSocketServer': // разрешить изменять лишь порт
                        if ('port' in config.webSocketServer && config.webSocketServer.port)
                            this.webSocketServer.port = config.webSocketServer.port;
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