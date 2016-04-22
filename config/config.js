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
            { className: 'ResElem', isUccello: true, component: 'resman/dataTypes/resElem', metaType: ['sys', 'client'] },
            { className: 'Resource', isUccello: true, component: 'resman/dataTypes/resource', metaType: ['sys', 'client'] },
            { className: 'ResForm', isUccello: true, component: 'resman/dataTypes/resForm', metaType: ['sys', 'client'] },
            { className: 'AControl', isUccello: true, component: 'controls/aControl', metaType: ['content'] },
            { className: 'ADataControl', isUccello: true, component: 'controls/aDataControl', metaType: ['content'] },
            { className: 'ADataFieldControl', isUccello: true, component: 'controls/aDataFieldControl', metaType: ['content'] },
            { className: 'KeyValuePair', isUccello: true, component: 'common/keyValuePair', metaType: ['sys', 'client'] },
            { className: 'DataObject', isUccello: true, component: 'dataman/dataobject', metaType: ['content'] },
            { className: 'DataRoot', isUccello: true, component: 'dataman/dataRoot', metaType: ['content'] },
            { className: 'DataField', isUccello: true, component: 'controls/dataField', metaType: ['content'] },
            { className: 'IndexField', isUccello: true, component: 'memDB/indexField', metaType: ['sys', 'client', 'content'] },
            { className: 'CollectionIndex', isUccello: true, component: 'memDB/collectionIndex', metaType: ['sys', 'client', 'content'] },
            { className: 'DatasetOld', isUccello: true, component: 'controls/datasetOld', metaType: ['content'] },
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
            { className: 'TabContainer', isUccello: true, component: 'controls/tabContainer', viewset: false, metaType: ['content'] },
            { className: 'GColumn', isUccello: true, component: 'controls/gColumn', viewset: false, metaType: ['content'] },
            { className: 'GRow', isUccello: true, component: 'controls/gRow', viewset: false, metaType: ['content'] },
            { className: 'GCell', isUccello: true, component: 'controls/gCell', viewset: false, metaType: ['content'] },
            { className: 'Button', isUccello: true, component: 'controls/button', viewset: false, metaType: ['content'] },
            { className: 'DataColumn', isUccello: true, component: 'controls/dataColumn', metaType: ['content'] },
            { className: 'DataGrid', isUccello: true, component: 'controls/dataGrid', viewset: false, metaType: ['content'] },
            { className: 'DataEdit', isUccello: true, component: 'controls/dataEdit', viewset: false, metaType: ['content'] },
            { className: 'DataCombo', isUccello: true, component: 'controls/dataCombo', viewset: false, metaType: ['content'] },
            { className: 'DataCheckbox', isUccello: true, component: 'controls/dataCheckbox', viewset: false, metaType: ['content'] },
            { className: 'Edit', isUccello: true, component: 'controls/edit', viewset: false, metaType: ['content'] },
            { className: 'Label', isUccello: true, component: 'controls/label', viewset: false, metaType: ['content'] },
            { className: 'Form', isUccello: true, component: 'controls/form', viewset: false, metaType: ['content'] },
            { className: 'MetaModelField', isUccello: true, component: 'metaData/metaModelField', metaType: ['sys', 'client'] },
            { className: 'MetaLinkRef', isUccello: true, component: 'metaData/metaLinkRef', metaType: ['sys', 'client'] },
            { className: 'MetaModel', isUccello: true, component: 'metaData/metaModel', metaType: ['sys', 'client'] },
            { className: 'MetaModelRef', isUccello: true, component: 'metaData/metaModelRef', metaType: ['sys', 'client'] },
            { className: 'DbTreeModelRoot', isUccello: true, component: 'metaData/dbTreeModelRoot', metaType: ['sys', 'client'] },
            { className: 'DbTreeModel', isUccello: true, component: 'metaData/dbTreeModel', metaType: ['sys', 'client'] },
            { className: 'MemTreeModelRoot', isUccello: true, component: 'metaData/memTreeModelRoot', metaType: ['sys', 'client'] },
            { className: 'MemTreeModel', isUccello: true, component: 'metaData/memTreeModel', metaType: ['sys', 'client'] },
            { className: 'DataModel', isUccello: true, component: 'metaData/dataModel', metaType: ['sys', 'client'] },
            { className: 'MetaDataMgr', isUccello: true, component: 'metaData/metaDataMgr', metaType: ['sys', 'client'] },
            { className: 'Condition', isUccello: true, component: 'predicate/condition', metaType: ['sys', 'client'] },
            { className: 'Predicate', isUccello: true, component: 'predicate/predicate', metaType: ['sys', 'client'] },
            { className: 'Parameter', isUccello: true, component: 'predicate/parameter', metaType: ['sys', 'client'] },
            { className: 'RefParameter', isUccello: true, component: 'predicate/refParameter', metaType: ['sys', 'client'] },
            { className: 'StaticValue', isUccello: true, component: 'predicate/staticValue', metaType: ['sys', 'client'] },
            { className: 'DsAlias', isUccello: true, component: 'predicate/dsAlias', metaType: ['sys', 'client'] },
            { className: 'DsField', isUccello: true, component: 'predicate/dsField', metaType: ['sys', 'client'] },
            { className: 'Toolbar', isUccello: true, component: 'controls/toolbar', viewset: false, metaType: ['content'] },
            { className: 'ToolbarButton', isUccello: true, component: 'controls/toolbarButton', viewset: false, metaType: ['content'] },
            { className: 'ToolbarSeparator', isUccello: true, component: 'controls/toolbarSeparator', viewset: false, metaType: ['content'] },
            { className: 'LayersContainer', isUccello: true, component: 'controls/layersContainer', viewset: false, metaType: ['content'] },
            { className: 'DbNavigator', isUccello: true, component: 'lib/dbNavigator', viewset: false, metaType: ['content'] },
            { className: 'TreeViewItem', isUccello: true, component: 'controls/treeViewItem', viewset: false, metaType: ['content'] },
            { className: 'TreeView', isUccello: true, component: 'controls/treeView', viewset: false, metaType: ['content'] },
            { className: 'DbTreeViewItemType', isUccello: true, component: 'controls/dbTreeViewItemType', viewset: false, metaType: ['content'] },
            { className: 'DbTreeView', isUccello: true, component: 'controls/dbTreeView', viewset: false, metaType: ['content'] },
            { className: 'Layout', isUccello: true, component: 'controls/layout', viewset: false, metaType: ['content'] },
            { className: 'AdaptiveContainer', isUccello: true, component: 'controls/adaptiveContainer', viewset: false, metaType: ['content'] },
            { className: 'FormDesigner', isUccello: true, component: 'controls/formDesigner', viewset: false, metaType: ['content'] },
            { className: 'DesignerControl', isUccello: true, component: 'controls/designerControl', viewset: false, metaType: ['content'] }
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
            'rootLeadLog': 'bb48579c-808e-291e-0242-0facc4876051',
            'rootIncomeplan': '8770f400-fd42-217c-90f5-507ca52943c2',
            'rootOpportunity': 'f988a1cb-4be0-06c3-4eaa-4ae8b554f6b3',
            'Interfsrv': 'ef9bfa83-8371-6aaa-b510-28cd83291ce9',
            'metaObjFieldsGuid': '0fa90328-4e86-eba7-b12b-4fff3a057533',
            'metaObjColsGuid': '99628583-1667-3341-78e0-fb2af29dbe8',
            'metaRootGuid': 'fc13e2b8-3600-b537-f9e5-654b7418c156',
            'metaObjGuid': '4dcd61c3-3594-7456-fd86-5a3527c5cdcc',
            'dataObjectEngineGuid': 'e4c765e8-9ae0-45c3-a28d-863d7cb08706',
            'iDataObjectEngine': 'cfd5ae4d-5cf1-4fcf-9f5a-61c8b6499a08',
            'iProcessAdapter': '3ca4f812-b624-4dac-b7a1-67f8f4780f86'
        },

        // гуиды классов учелло
        classGuids: {
            'ClientConnection': "5f27198a-0dd2-81b1-3eeb-2834b93fb514",
            'Connect': '66105954-4149-1491-1425-eac17fbe5a72',
            'ConnectInfo': "42dbc6c0-f8e4-80a5-a95f-e43601cccc71",
            'Session': "70c9ac53-6fe5-18d1-7d64-45cfff65dbbb",
            'SessionInfo': "479c72e9-29d1-3d6b-b17b-f5bf02e52002",
            'User': "dccac4fc-c50b-ed17-6da7-1f6230b5b055",
            'UserInfo': "e14cad9b-3895-3dc9-91ef-1fb12c343f10",
            'ResElem': "c51c0058-e7b8-41e5-8542-a018b9153972",
            'Resource': "ab9acac0-4b43-420e-8e5c-ca7576c493d0",
            'ResForm': "10217b8e-b1f8-4221-a419-f20735219dd2",
            'AComponent': "5b8c93e7-350d-de2a-e2b4-1025a03b17db",
            'AControl': "c576cb6e-cdbc-50f4-91d1-4dc3b48b0b59",
            'ADataControl': "b2c132fd-c6bc-b3c7-d149-27a926916216",
            'ADataFieldControl': "00a12976-6fe3-6592-1984-635684b30885",
            'ADataModel': "5e89f6c7-ccc2-a850-2f67-b5f5f20c3d47",
            'DataField': "4bade3a6-4a25-3887-4868-9c3de4213729",
            'DatasetBase': "1e4e76aa-46f7-4e7e-8a89-10732d4f54cb",
            'Dataset': "4d862905-25d2-4bfd-bc1f-3e4d61f06008",
            'DatasetOld': "3f3341c7-2f06-8d9d-4099-1075c158aeee",
            'FormParam': "4943ce3e-a6cb-65f7-8805-ec339555a981",
            'SubForm': "d7785c24-0b96-76ee-46a7-b0103cda4aa0",
            'DataRoot': "87510077-53d2-00b3-0032-f1245ab1b74d",
            'Label': "32932036-3c90-eb8b-dd8d-4f19253fabed",
            'Form': "7f93991a-4da9-4892-79c2-35fe44e69083",
            'Edit': "f79d78eb-4315-5fac-06e0-d58d07572482",
            'DataEdit': "affff8b1-10b0-20a6-5bb5-a9d88334b48e",
            'DataCombo': "dc67f373-4a0c-5c22-f6fb-db321f6ed192",
            'DataCheckbox': "a9cce7c0-4336-e4f6-b831-ca0b05666d6a",
            'DataColumn': "100f774a-bd84-8c46-c55d-ba5981c09db5",
            'Button': "af419748-7b25-1633-b0a9-d539cada8e0d",
            'DataGrid': "ff7830e2-7add-e65e-7ddf-caba8992d6d8",
            'UModule': "8fead303-a4e1-98bb-efb6-ee38ee021265",
            'VisualContext': "64827c89-e73e-215f-f71a-7f90627ae61d",
            'Vcresource': "870c63b5-7aed-bb44-3109-bb63a407988f",
            'UObject': "3b02ef32-83b7-e470-ec5c-f6605e46e9dc",
            'Container': "d9f2fe22-ba91-1638-0f64-fb15a5410d01",
            'CContainer': "1d95ab61-df00-aec8-eff5-0f90187891cf",
            'HContainer': "638c1e37-2105-9676-f3c9-dfc2746d1265",
            'VContainer': "a56e2e53-c72d-f014-d763-e096bfb51b8f",
            'GContainer': "26309035-7f47-422e-26c8-6c25a091c20e",
            'GColumn': "9d00a857-4a93-6b7a-9ef0-08b14dc81e54",
            'GRow': "157eb87c-3331-97cf-e307-a0c5311ba7d5",
            'GCell': "69087f9c-99ed-14f1-0fe7-05058a862af5",
            'FContainer': "902822d8-3079-f394-2eed-3ad9ac27b2f2",
            'KeyValuePair': "87d383d3-a6ee-4d7c-aa20-00ea56ad7741",
            'DataObject': "edb1b63c-f72c-6f0a-b64c-3b34da7facdb",
            'DataObjectBase': "321ea6f6-30e0-4545-884e-12c33f620834",
            'MetaDataMgr': "ec139e1e-39d7-4ddd-8e31-c5d644403f41",
            'MetaModelRef': "35c82420-67e7-45cc-ae4b-ed35d3bcfda9",
            'MetaLinkRef': "0e7a1bf8-d94e-4447-ad75-c2a2c068c3dd",
            'MetaModel': "183f6fb9-9f17-4955-a22c-4f03c4273413",
            'MetaModelField': "0997ccff-09ec-4978-b120-3ef7d6668bc2",
            'BaseTreeModel': "c7ab1ce1-bb30-4cad-ae17-1fb6ca3d8cbd",
            'DbTreeModelRoot': "f0138eab-8a62-4cb8-b9f5-33917bec1f59",
            'DbTreeModel': "85f03964-5ea7-4743-9c8e-549110f1c154",
            'MemTreeModelRoot': "570c6b33-4ca2-49f8-a3fc-e5743402a2a1",
            'MemTreeModel': "adcd9519-ced3-449d-aa2c-67416bd5a334",
            'DataModel': "c0d078c7-1c7b-4fd1-a8b0-b9f09eea31f8",
            'BaseCondition': "baba000a-8706-4798-90bd-de1e4e98e671",
            'BaseValue': "836c924b-13dd-469c-94b7-bb350099ec50",
            'Condition': "c3fa769d-321e-4bf5-80de-5e979bc933eb",
            'BaseParameter': "890bb2e0-720f-406a-9081-410562c5bf3e",
            'Predicate': "bc76f187-982a-4f22-a2be-980a67bb5a69",
            'Parameter': "7981dc4d-3c4d-496a-9c0f-979d86a19181",
            'RefParameter': "7c0eb8fd-b9cc-4f52-8342-dee930e08745",
            'StaticValue': "b594d3c7-824f-4d42-833d-97dbd9258975",
            'DsAlias': "f63679b7-bf98-4ccb-8826-f4d365b3de8a",
            'DsField': "81ce1383-7e57-461b-9a36-ce82171bc1a7",
            'CollectionIndex': "43626e45-cfeb-406a-aca8-122a8bcbd5aa",
            'IndexField': "7806a983-c946-438f-95a4-71ab08e38074",
            'TabContainer': "3fd621ab-4b0a-038f-b617-88dc28a05a67",
            'ProcessObject': "8b8d0990-543c-40b1-8f04-7b7235938f65",
            'Toolbar': 'afc2da5a-ad87-4d0c-83dd-96df7ae1b3b6',
            'ToolbarButton': '6ddef43f-252a-46e3-bb68-2a5a52f0702e',
            'ToolbarSeparator': '050fd0ed-873a-4637-916b-145cb71e425f',
            'LayersContainer': '005f4241-7cb4-45ea-bf7d-5cb047eadac1',
            'DbNavigator': '38aec981-30ae-ec1d-8f8f-5004958b4cfa',
            'TreeView': '35400d0c-5465-00e8-c770-a1b04b4b8180',
            'TreeViewItem': '16eb3a02-7f2a-3001-096a-14c1b38586db',
            'DbTreeView': 'f91349d1-2254-cc67-07b3-792674725650',
            'DbTreeViewItemType': '024cdaa7-9e63-5cb1-65a1-caaec6b93140',
            'Layout': "8475e73d-06aa-4454-b02f-cf26a9cbabb6",
            'AdaptiveContainer': "d889ec6c-8083-4e53-815f-c135b1cab573",
            'FormDesigner': "08ee6c54-8e09-4c67-821b-3bcaf68971a9",
            'DesignerControl': "77fa5850-4d05-4757-96b4-9edfde2a4bb7",
            'ProcessDefinition' : "08b97860-179a-4292-a48d-bfb9535115d3"
        },

        REMOTE_RESULT: "XXX",

        // изменяемые свойства
        controlsPath: '',
        uccelloPath: '',
        viewSet: null,
        commServerTypes: CommServerTypes,
        commClientTypes: CommClientTypes,
        webServer: {
            port: 1325
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

        init: function (config) {
            for (var index in config) {
                switch (index) {
                    case 'controls':
                        var controlNames = {};
                        for (var i = 0; i < this.controls.length; i++) {
                            controlNames[this.controls[i].className] = i;
                        }
                        for (var i = 0; i < config[index].length; i++) {
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
                        break;

                    case 'classGuids':
                        for (var cName in config[index]) {
                            if (!this.classGuids[cName])
                                this.classGuids[cName] = config[index][cName];
                        };
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