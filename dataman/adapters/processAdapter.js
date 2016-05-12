if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [/*'bluebird',*/ 'lodash', './testData'],
    function (/*Promise,*/ _, TestData) {

        var ADAPTERS = ["$testData", "processData", "requestData", , "processParams"];
        var PROCESS_DEF_TYPE = "08b97860-179a-4292-a48d-bfb9535115d3";

        var iProcessAdapter = {

            className: "IProcessAdapter",
            classGuid: UCCELLO_CONFIG.guids.iProcessAdapter,

            saveData: "function",
        };

        var ProcessAdapter = UccelloClass.extend({

            init: function (dataman, proxyWfe, router, controller, construct_holder, rpc, options) {

                this._proxyWfe = proxyWfe;
                this._router = router;
                this._controller = controller;
                this._constructHolder = construct_holder;
                this._options = _.cloneDeep(options || {});

                if (rpc && router) {
                    global.$processData = rpc._publ(this, iProcessAdapter); // Глобальная переменная для доступа к IProcessAdapter
                    router.add('iProcessAdapter', function (data, done) { done({ intf: iProcessAdapter }); });
                };
                if (dataman) {
                    ADAPTERS.forEach(function (adapter_name) {
                        dataman.regDataAdapter(adapter_name, this);
                    }, this);
                };
            },

            getGuid: function () {
                return UCCELLO_CONFIG.guids.iProcessAdapter;
            },

            requestData: function (guidRoot, expression, done) {

                function localCallBack(result) {
                    var res = {};
                    if (result.result === "OK") {
                        res = result.params;
                        if (guidRoot)
                            res.$sys.guid = guidRoot;
                    }
                    else
                        console.error("###ERROR: " + result.message);
                    if (done)
                        setTimeout(function () {
                            done(res);
                        }, 0);
                };

                function reqCallBack(result) {
                    var res = {};
                    if (result.result === "OK") {
                        res = result.params;
                        if (guidRoot)
                            res.$sys.guid = guidRoot;
                    }
                    else
                        console.error("###ERROR: " + result.message);
                    if (done)
                        setTimeout(function () {
                            done(res);
                        }, 0);
                };

                function varsCallBack(result) {
                    var res = {};
                    if (result.result === "OK") {
                        res = result.vars;
                        if (guidRoot)
                            res.$sys.guid = guidRoot;
                    }
                    else
                        console.error("###ERROR: " + result.message);
                    if (done)
                        setTimeout(function () {
                            done(res);
                        }, 0);
                };

                try {

                    switch (expression.adapter) {

                        case "processParams":
                            if (!(expression.params && expression.params.ProcessDefName))
                                throw new Error("ProcessAdapter::requestData : Prameter \"ProcessDefName\" is undefined!");
                            this._proxyWfe.getProcessDefParameters({ resName: expression.params.ProcessDefName, resType: PROCESS_DEF_TYPE }, localCallBack);
                            break;

                        //case "requestData":
                        //    if (!(expression.params && expression.params.RequestId))
                        //        throw new Error("ProcessAdapter::requestData : Prameter \"RequestId\" is undefined!");
                        //    this._proxyWfe.waitForRequest({ requestId: expression.params.RequestId }, reqCallBack);
                        //    break;

                        case "processData":
                            if (!(expression.params && expression.params.ProcessId))
                                throw new Error("ProcessAdapter::requestData : Prameter \"ProcessId\" is undefined!");
                            this._proxyWfe.getProcessVars(expression.params.ProcessId, varsCallBack);
                            break;

                        //case "processData":

                        //    var result = {
                        //        "$sys": {
                        //            "guid": "f00b5412-4dc6-a635-fe2b-2633a1d75ee4",
                        //            "typeGuid": "b8fd05dc-08de-479e-8557-dba372e2b4b6"
                        //        },
                        //        "ver": 2,
                        //        "fields": {
                        //            "Name": "Simple Task Definition",
                        //            "TaskNumber": "1185",
                        //            "Specification": "Simple Task Definition 1185",
                        //            "ObjId": 1185
                        //        },
                        //        "collections": {
                        //            "TaskStages": {
                        //                "0": {
                        //                    "$sys": {
                        //                        "guid": "4a7e903f-4990-238f-75af-74fabfcc51d6",
                        //                        "typeGuid": "c2f02b7a-1204-4dca-9ece-3400b4550c8d"
                        //                    },
                        //                    "ver": 2,
                        //                    "fields": {
                        //                        "Guid": "e2b8d193-7d89-a086-c01d-a69f472ccabf",
                        //                        "TaskDefStageId": 1,
                        //                        "StageCode": "task1",
                        //                        "StageState": 0
                        //                    },
                        //                    "collections": {
                        //                        "Incoming": {},
                        //                        "Outgoing": {},
                        //                        "Connectors": {},
                        //                        "Parameters": {},
                        //                        "Requests": {},
                        //                        "Responses": {}
                        //                    }
                        //                },
                        //                "1": {
                        //                    "$sys": {
                        //                        "guid": "6ba6dd1b-8137-cc76-4240-2fc016baad0f",
                        //                        "typeGuid": "c2f02b7a-1204-4dca-9ece-3400b4550c8d"
                        //                    },
                        //                    "ver": 2,
                        //                    "fields": {
                        //                        "Guid": "7cb27018-dc9e-1eba-4c9e-28587ae43111",
                        //                        "TaskDefStageId": 3,
                        //                        "StageCode": "task2",
                        //                        "StageState": 0
                        //                    },
                        //                    "collections": {
                        //                        "Incoming": {},
                        //                        "Outgoing": {},
                        //                        "Connectors": {},
                        //                        "Parameters": {},
                        //                        "Requests": {},
                        //                        "Responses": {}
                        //                    }
                        //                },
                        //                "2": {
                        //                    "$sys": {
                        //                        "guid": "dd1dfdf5-5a1a-190a-9716-f657ccf27fc1",
                        //                        "typeGuid": "c2f02b7a-1204-4dca-9ece-3400b4550c8d"
                        //                    },
                        //                    "ver": 2,
                        //                    "fields": {
                        //                        "Guid": "e350af85-07af-577c-8165-4f77d2bbc436",
                        //                        "TaskDefStageId": 2,
                        //                        "StageCode": "task3",
                        //                        "StageState": 0
                        //                    },
                        //                    "collections": {
                        //                        "Incoming": {},
                        //                        "Outgoing": {},
                        //                        "Connectors": {},
                        //                        "Parameters": {},
                        //                        "Requests": {},
                        //                        "Responses": {}
                        //                    }
                        //                }
                        //            }
                        //        }
                        //    };

                        //    if (guidRoot)
                        //        result.$sys.guid = guidRoot;
                        //    if (done)
                        //        setTimeout(function () {
                        //            done(result);
                        //        }, 0);
                        //    break;

                        case "requestData":
                            var result = {
                                "$sys": {
                                    "guid": "4552682f-b144-dfe1-e972-b893c1635d51",
                                    "typeGuid": "31809e1f-a2c2-4dbb-b653-51e8bdf950a2"
                                },
                                "fields": {},
                                "collections": {
                                    "AvailableNodes": {
                                        "0": {
                                            "$sys": {
                                                "guid": "6c58e405-75f4-a593-779d-8103623200fa",
                                                "typeGuid": "9232bbd5-e2f8-466a-877f-5bc6576b5d02"
                                            },
                                            "ver": 1,
                                            "fields": {
                                                "Name": "Node",
                                                "Value": "task1"
                                            },
                                            "collections": {}
                                        },
                                        "1": {
                                            "$sys": {
                                                "guid": "e270ec64-2943-4dd3-2e04-f3218ad66ed7",
                                                "typeGuid": "9232bbd5-e2f8-466a-877f-5bc6576b5d02"
                                            },
                                            "ver": 1,
                                            "fields": {
                                                "Name": "Node",
                                                "Value": "task2"
                                            },
                                            "collections": {}
                                        }
                                    }
                                }
                            };

                            if (guidRoot)
                                result.$sys.guid = guidRoot;
                            if (done)
                                setTimeout(function () {
                                    done(result);
                                }, 0);
                            break;

                        case "$testData":
                            var result = _.cloneDeep(TestData);
                            if (guidRoot)
                                result.$sys.guid = guidRoot;
                            if (done)
                                setTimeout(function () {
                                    done(result);
                                }, 0);
                            break;

                        default:
                            throw new Error("Unknow adapter type: \"" + expression.adapter + "\" !");
                    };
                }
                catch (err) {
                    console.error("###ERROR: " + err.message);
                    result = {};
                    if (done)
                        setTimeout(function () {
                            done(result);
                        }, 0);
                };
            },

            saveData: function (data_object, options, cb) {
                var result = { result: "OK" };
                var is_done = false;
                try {
                    if (options && options.expr && options.expr.adapter) {

                        switch (options.expr.adapter) {

                            case "processParams":
                                if (!(options.expr.params && options.expr.params.ProcessDefName))
                                    throw new Error("ProcessAdapter::saveData : Prameter \"ProcessDefName\" is undefined!");
                                is_done = true;
                                this._proxyWfe.startProcessInstanceAndWait(
                                    options.expr.params.ProcessDefName,
                                    {
                                        taskParams: data_object,
                                        requestName: 'TaskRequest',
                                        timeout: 0
                                    },
                                    function (result) {
                                        if (cb)
                                            setTimeout(function () {
                                                cb(result);
                                            }, 0);
                                    });
                                break;

                            case "requestData":
                                console.log("###PROCESSADAPTER::SAVEDATA");
                                console.log("DATA OBJECT: " + JSON.stringify(data_object));
                                console.log("OPTIONS: " + JSON.stringify(options));
                                console.log("###");
                                break;

                            case "$testData":
                                console.log("###PROCESSADAPTER::SAVEDATA");
                                console.log("DATA OBJECT: " + JSON.stringify(data_object));
                                console.log("OPTIONS: " + JSON.stringify(options));
                                console.log("###");
                                break;

                            default:
                                throw new Error("Unknow adapter type: \"" + options.expr.adapter + "\" !");
                        };
                    }
                    else
                        throw new Error("Unknown expression or adapter!");
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                };
                if (cb && (!is_done))
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            }

        });

        return ProcessAdapter;
    }
);