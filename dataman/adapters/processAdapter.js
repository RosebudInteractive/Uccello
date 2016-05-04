if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [/*'bluebird',*/ 'lodash', './testData'],
    function (/*Promise,*/ _, TestData) {

        var ADAPTERS = ["$testData", "processData", "requestData", , "processParams"];

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
                    //this._proxyWfe.getProcessDefParameters({ resName: "Simple Task Definition", resType: "08b97860-179a-4292-a48d-bfb9535115d3" }, localCallBack);
                    this._proxyWfe.getProcessDefParameters("16c5c8fe-d767-ef8d-b7d8-50b7eb36eb68", localCallBack);
                    
                    //var result = _.cloneDeep(TestData);
                    //if (guidRoot)
                    //    result.$sys.guid = guidRoot;
                    //if (done)
                    //    setTimeout(function () {
                    //        done(result);
                    //    }, 0);
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

                try {
                    console.log("###PROCESSADAPTER::SAVEDATA");
                    console.log("DATA OBJECT: " + JSON.stringify(data_object));
                    console.log("OPTIONS: " + JSON.stringify(options));
                    console.log("###");
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                };
                if (cb)
                    setTimeout(function () {
                        cb(result);
                    }, 0);
            }

        });

        return ProcessAdapter;
    }
);