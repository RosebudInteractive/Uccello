if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ["../system/utils", "./processObject"],
    function (Utils, ProcessObject) {

        var ProcessDispatcher = UccelloClass.extend({

            init: function (params) {

                this._proxyWfe = params && params.proxyWfe ? params.proxyWfe : null;

                var globalObj = null;
                if (Utils.isNode())
                    globalObj = global;
                else
                    globalObj = window;

                if (globalObj) {
                    if (!globalObj.$process)
                        globalObj.$process = {};
                    globalObj.$process.processDispatcher = this;
                };
            },

            methodCallResolver: function (uobj, obj_method, args) {

                if (!this.dispMethodCallTable)
                    this._genDispMethodCallTable();

                var objTypeGuid = uobj.getTypeGuid();
                if (this._proxyWfe && this.dispMethodCallTable[objTypeGuid]
                    && this.dispMethodCallTable[objTypeGuid][obj_method]) {

                    // Последний аргумент д.б. callback !
                    if ((args.length < 1) || (typeof args[args.length - 1] !== "function"))
                        throw new Error("The last argument of the \"process dispathed\" function \"" + obj_method + "\" should be a callback !");

                    var callback = args.pop();
                    var procArgs = this.dispMethodCallTable[objTypeGuid][obj_method];
                    var objURI = "memdb://" + uobj.getDB().getGuid() + "." + uobj.getGuid();

                    this._methodCallViaProcess(procArgs, objURI, ProcessObject._methodPrefix + obj_method, args, callback);

                } else
                    uobj[obj_method].apply(uobj, args);
            },

            _methodCallViaProcess: function (procArgs, objURI, func, args, callback) {
                var self = this;

                function sendResponse(result) {
                    console.log("Start Process [" + result.processID + "] result: " + result.result);
                    if (result.result === "OK") {
                        var responceObj = {
                            processID: result.requestInfo.processID,
                            requestID: result.requestInfo.requestID,
                            tokenID: result.requestInfo.tokenID,
                            response: {
                                objURI: objURI,
                                func: func,
                                args: args
                            }
                        };

                        self._proxyWfe.submitResponseAndWait(responceObj, "Request2", 1000000, function (result) {
                            console.log("Submit Response: " + result.result);

                            if (result.result === "OK") {

                                var responceObj = {
                                    processID: result.requestInfo.processID,
                                    requestID: result.requestInfo.requestID,
                                    tokenID: result.requestInfo.tokenID,
                                    response: { result: true }
                                };

                                self._proxyWfe.submitResponse(responceObj, function (result) {
                                    console.log("Submit Response 2: " + result.result);
                                    if (callback)
                                        setTimeout(function () {
                                            callback(result);
                                        }, 0);

                                });
                            };
                        });
                    }
                };

                if (procArgs.isNewProcess)
                    this._proxyWfe.startProcessInstanceAndWait(procArgs.processDefGuid, procArgs.requestName, 100000, sendResponse);
                else
                    if (callback)
                        setTimeout(function () {
                            callback({});
                        }, 0);
            },

            _genDispMethodCallTable: function () {
                this.dispMethodCallTable = {};
                this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.Dataset] = {};
                this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.Dataset]["addObject"] = {
                    isNewProcess: true,
                    processDefGuid: "8349600e-3d0e-4d4e-90c8-93d42c443ab3",
                    requestName: "Request1",
                };
            }
        });
        return ProcessDispatcher;
    }
);