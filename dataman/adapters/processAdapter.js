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

                try {

                    switch (expression.adapter) {

                        case "processParams":
                            if (!(expression.params && expression.params.ProcessDefName))
                                throw new Error("ProcessAdapter::requestData : Prameter \"ProcessDefName\" is undefined!");
                            this._proxyWfe.getProcessDefParameters({ resName: expression.params.ProcessDefName, resType: PROCESS_DEF_TYPE }, localCallBack);
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