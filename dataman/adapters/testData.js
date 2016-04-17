if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [],
    function () {
        return {
            "$sys": {
                "guid": "5417a514-d252-41e8-a49c-f8a4535babcc", 
                "typeGuid": "1821b56b-7446-4428-93b5-c121c265e4bc"
            }, 
            "fields": {
                "Name": "Пост Модерн Текнолоджи",
                "country": "Россия",
                "city": "Москва",
                "address": "Новослободская 73-1",
            }, 
            "collections": {
                "Contacts": [
                    {
                        "$sys": {
                            "guid": "8e9054be-e94f-4903-9120-ae7e4a1532fa", 
                            "typeGuid": "bcbd8862-7bdf-42c9-a4cb-634f8a6019a5"
                        }, 
                        "fields": {
                            "firstname": "Zhong-Dan",
                            "lastname": "LAN",
                            "birthdate": "2005-07-21 21:00:00",
                            "address": "(732) 668-1272",
                        }, 
                        "collections": {
                            "Addresses": [
                                {
                                    "$sys": {
                                        "guid": "9a48fd64-579f-431f-b4eb-418ce5ab87c4", 
                                        "typeGuid": "14134cb5-7caa-44e2-84ac-9d4c208772f8"
                                    }, 
                                    "fields": {
                                        "country": "USA",
                                        "city": "New York",
                                        "address": "12321-33",
                                    }, 
                                    "collections": {}
                                },
                                {
                                    "$sys": {
                                        "guid": "ab264d52-3ed5-40e9-9be7-091d9f0fbc9c", 
                                        "typeGuid": "14134cb5-7caa-44e2-84ac-9d4c208772f8"
                                    }, 
                                    "fields": {
                                        "country": "Russia",
                                        "city": "Moscow",
                                        "address": "Leningradsky 77/18",
                                    }, 
                                    "collections": {}
                                },
                            ]
                        }
                    },
                    {
                        "$sys": {
                            "guid": "bc553321-bce7-4e1d-806e-1af9a51fd6f0", 
                            "typeGuid": "bcbd8862-7bdf-42c9-a4cb-634f8a6019a5"
                        }, 
                        "fields": {
                            "firstname": "Vasyl",
                            "lastname": "Stakhyra",
                            "birthdate": "2005-07-21 21:00:00",
                            "address": "(201)251-0913",
                        }, 
                        "collections": {
                            "Addresses": []
                        }
                    },
                ],
                "Contracts": [
                    {
                        "$sys": {
                            "guid": "032970a4-6040-4930-b4ff-99c519fd5cdc", 
                            "typeGuid": "dd0addee-bf0f-458e-a360-dbfa1682e6a2"
                        }, 
                        "fields": {
                            "number": "46696-1",
                            "total": 4856568.0000,
                        }, 
                        "collections": {}
                    },
                    {
                        "$sys": {
                            "guid": "55720910-dbbd-4db0-901a-9475b278ff5f", 
                            "typeGuid": "dd0addee-bf0f-458e-a360-dbfa1682e6a2"
                        }, 
                        "fields": {
                            "number": "80661-1",
                            "total": 4749756.0000,
                        }, 
                        "collections": {}
                    },
                ]
            }
        };
    }
);