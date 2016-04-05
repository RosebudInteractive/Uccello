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

                var result;

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

                    this._methodCallViaProcess(uobj, procArgs, objURI, ProcessObject._methodPrefix + obj_method, args, callback);

                } else
                    result = uobj[ProcessObject._methodPrefix + obj_method].apply(uobj, args);

                return result;
            },

            _methodCallViaProcess: function (uobj, procArgs, objURI, func, args, callback) {
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

                        self._proxyWfe.processResponse(responceObj, procArgs.timeout, function (result) {
                            console.log("Submit Response: " + result.result);

                            if (result.result === "OK") {

                                if (callback)
                                    setTimeout(function () {
                                        callback(result.responseResult);
                                    }, 0);
                            };
                        });
                    }
                };

                if (procArgs.isNewProcess)
                    this._proxyWfe.startProcessInstanceAndWait(procArgs.processDefName, procArgs.requestName, procArgs.processTimeout, sendResponse);
                else {
                    var res = { result: "ERROR" };
                    var isDone = true;

                    if (uobj instanceof ProcessObject) {
                        var processID = uobj.currentProcess();
                        if (processID && (processID !== "")) {
                            isDone = false;
                            this._proxyWfe.waitForRequest(processID, null, procArgs.requestName, procArgs.timeout, function (result) {
                                console.log("Got Request [" + procArgs.requestName + "] result: " + result.result);
                                isDone = true;
                                if (result.result === "OK") {
                                    isDone = false;
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
                                    self._proxyWfe.processResponse(responceObj, procArgs.timeout, function (result) {
                                        if (callback)
                                            setTimeout(function () {
                                                callback(result.responseResult);
                                            }, 0);
                                    });
                                } else
                                    res = result;

                                if (isDone && callback)
                                    setTimeout(function () {
                                        callback(res);
                                    }, 0);
                            });
                        } else
                            res.message = "Object is out of process context.";
                    }
                    else
                        res.message = "Object isn't an instance of \"ProcessObject\".";

                    if (isDone && callback)
                        setTimeout(function () {
                            callback(res);
                        }, 0);
                };
            },

            _genDispMethodCallTable: function () {
                this.dispMethodCallTable = {};

                // RootLead
                this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.RootLead] = {};
                // RootLead.newObject
                this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.RootLead]["newObject"] = {
                    isNewProcess: true,
                    //processDefGuid: "8349600e-3d0e-4d4e-90c8-93d42c443ab3",
                    processDefName: "First test process",
                    requestName: "ObjCreateRequest",
                    processTimeout: 10000,
                    timeout: 10000
                };

                // DataLead
                this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.DataLead] = {};
                // DataLead.edit
                //this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.DataLead]["edit"] = { // Метод "edit" (также как и "save", "cancel") перегружать через процесс нельзя !!!
                //    requestName: "ObjModifRequest",
                //    timeout: 10000
                //};
                // DataLead.convert
                //this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.DataLead]["convert"] = {
                //    requestName: "ObjModifRequest",
                //    timeout: 10000
                //};
                // DataLead.archive
                this.dispMethodCallTable[UCCELLO_CONFIG.classGuids.DataLead]["archive"] = {
                    requestName: "ObjModifRequest",
                    timeout: 10000
                };
            }
        });
        return ProcessDispatcher;
    }
);