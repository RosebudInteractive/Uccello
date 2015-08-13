if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./channel'],
    function (Channel) {
        
        var CommunicationClient = {};
        
        CommunicationClient.AJAX = 1;
        CommunicationClient.WEB_SOCKET = 2;
        CommunicationClient.SOCKET_IO = 4;

        var CONN_TRY_INTERVAL = 1000;
        var CONN_TRY_MAX = Infinity;
        var QUEUE_OUT_MAXLEN = 100;
        
        var GETID_TRY_INTERVAL = 1000;
        var GETID_TRY_MAX = 10;
        
        var WS_CLOSE_SUCCESS_CODE = 1000;
        
        var AJAX_WAIT_TIMEOUT = 4000;
        var AJAX_POLLING_TIMEOUT = 1000;

        var MAX_NOT_CONFIRMED_LEN = 100;

        var IO_LOG_FLAG = false;

        CommunicationClient.Client = UccelloClass.extend({
            
            init: function (options_param) {
                
                this._io_log_flag = (options_param && options_param.io_log_flag) ? options_param.io_log_flag : IO_LOG_FLAG;

                var options = { ajax: {} };
                if (typeof (options_param) !== "undefined"){
                    options = options_param;
                    if (typeof (options.ajax) === "undefined") {
                        options.ajax = {};
                    };
                };

                this._clientType = options.type &&
                    (((options.type & CommunicationClient.WEB_SOCKET) != 0) ? options.type :
                        ((options.type & CommunicationClient.SOCKET_IO) != 0) ? options.type :
                            CommunicationClient.AJAX);
                
                this._conn_try_interval = options.conn_try_interval ?
                    options.conn_try_interval : CONN_TRY_INTERVAL;

                this._conn_try_max = options.conn_try_max ?
                    options.conn_try_max : CONN_TRY_MAX;
                
                this._queue_out_maxlen = options.queue_out_maxlen ?
                    options.queue_out_maxlen : QUEUE_OUT_MAXLEN;
                
                this._getid_try_interval = options.getid_try_interval ?
                    options.getid_try_interval : GETID_TRY_INTERVAL;
                
                this._getid_try_max = options.getid_try_max ?
                    options.getid_try_max : GETID_TRY_MAX;
                
                this._ajax_wait_timeout = options.ajax.wait_timeout ?
                    options.ajax.wait_timeout : AJAX_WAIT_TIMEOUT;
                
                this._ajax_polling_timeout = options.ajax.polling_timeout ?
                    options.ajax.polling_timeout : AJAX_POLLING_TIMEOUT;
                
                this._channells = [];
                this._currChId = 0;
                this._isNode = typeof exports !== 'undefined' && this.exports !== exports;

                if (this._clientType == CommunicationClient.WEB_SOCKET) {
                    if(this._isNode)
                        this._WebSocket = require("ws");
                    else
                        this._WebSocket = WebSocket;
                };

            },
            
            newChannel: function (url, handlers) {
                
                var chStateData = {};
                
                chStateData.chType = this._clientType;
                chStateData.url = url;
                chStateData.inpQueue = [];
                chStateData.outQueue = [];
                chStateData.msgId = 0;
                chStateData.commObj = this._getCommunicationObj(chStateData);
                chStateData.sendAll = this._getSendAllFunction(chStateData);
                chStateData.channel = new Channel(++this._currChId, handlers, chStateData.commObj);
                chStateData.stream = null;
                chStateData.idx = this._channells.length;
                chStateData.clientId = null;

                chStateData.notConfirmedArr = [];
                chStateData.notConfirmedObj = {};
                chStateData.notConfirmedCnt = 0;
                chStateData.msgSocketId = 0;
                chStateData.needToResend = false;

                chStateData.state = {
                    errors: 0,
                    conn_errors: 0,
                    getId_trials: 0,
                    connected: false,
                    connTimerId: null,
                    getIdTimerId: null,
                    clientId: null,
                    prevClientId: null,
                    lastMsg: null,
                    isClosed: false,
                    sendTimerId: null
                };
                
                this._channells.push(chStateData);
                
                try {
                    this._getConnectFunction(chStateData)();
                } catch (err) {
                    this._channells.pop();
                    throw err;
                };

                return chStateData.channel;
            },
            
            _getConnectFunction: function (chStateData) {
                var self = this;
                
                return function () {
                    
                    var isFatalPB = false; // Fatal communication PB
                    var errMsgFatal = "";
                    
                    var old_stream = chStateData.stream;
                    chStateData.stream = null;
                    chStateData.state.connected = false;
                    chStateData.state.connTimerId = null;
                    chStateData.state.getId_trials = 0;
                    chStateData.isBlocked = false;

                    if (chStateData.chType == CommunicationClient.WEB_SOCKET) {
                        var ws = null;
                        try {
                            self._ws_close_silent(old_stream, false);

                            ws = new self._WebSocket(chStateData.url);
                            chStateData.stream = ws;

                            ws.onerror = self._getErrorProcessor(chStateData);
                            ws.onopen = self._getWSOpenProcessor(chStateData);
                            ws.onmessage = self._getWSMsgProcessor(chStateData);
                            ws.onclose = self._getWSCloseProcessor(chStateData);

                        }
                        catch (err) {

                            isFatalPB = true;
                            errMsgFatal = "###Fatal WS Error: " + err;
                            if (DEBUG) console.log(errMsgFatal);
                            throw err;

                        };
                    } else
                        if (chStateData.chType == CommunicationClient.SOCKET_IO) {
                            var ws = null;
                            try {

                                self._ws_close_silent(old_stream, true);

                                ws = io(chStateData.url,
                                    {
                                        reconnectionDelay: self._conn_try_interval,
                                        reconnectionAttempts: self._conn_try_max
                                    });

                                chStateData.stream = ws;

                                ws.on("error", self._getErrorProcessor(chStateData));
                                ws.on("connect", self._getWSOpenProcessor(chStateData));
                                ws.on("message", self._getWSMsgProcessor(chStateData));
                                ws.on("disconnect", self._getWSCloseProcessor(chStateData));

                            }
                            catch (err) {

                                isFatalPB = true;
                                errMsgFatal = "###Fatal WS Error: " + err;
                                if (DEBUG) console.log(errMsgFatal);
                                throw err;

                            };
                        } else {
                            chStateData.stream = {}; // Ajax handlers
                            chStateData.stream.isWaiting = false;
                            chStateData.stream.onError = self._getErrorProcessor(chStateData);
                            chStateData.stream.onMessage = self._getAjaxMsgProcessor(chStateData);
                            chStateData.stream.onComplete = self._getAjaxCompleteProcessor(chStateData);
                            chStateData.stream.setPollingTimer = self._getPollingTimer(chStateData);
                            chStateData.stream.pollingTimerId = null;

                            // clear messages queue
                            if (chStateData.outQueue.length > 0)
                                chStateData.outQueue = [];
                            chStateData.state.lastMsg = null;

                            self._requestId(chStateData);
                        };
                    
                    if (isFatalPB) {
                        throw new Error(errMsgFatal);
                    };
                };
            },
            
            _getPollingTimer: function (chStateData){
                var self = this;
                return function () {
                    if (chStateData.state.clientId !== null) {
                        if ((! chStateData.stream.isWaiting) && (! chStateData.state.isClosed)) {
                            var cmd = {};
                            cmd._cmd_ = "poll";
                            chStateData.commObj.send(cmd);
                        };
                        chStateData.stream.pollingTimerId =
                            setTimeout(chStateData.stream.setPollingTimer, self._ajax_polling_timeout);
                    };
                };
            },

            _sendAjaxMsg: function (msg, chStateData){
                chStateData.stream.isWaiting = true;
                $.ajax({
                    type: 'POST',
                    timeout: this._ajax_wait_timeout,
                    url: chStateData.url,
                    dataType: 'json',
                    contentType: "application/json",
                    cache: false,
                    data: JSON.stringify(msg),
                    success: chStateData.stream.onMessage,
                    error: chStateData.stream.onError,
                    complete: chStateData.stream.onComplete
                });
            },

            _getSendAllFunction: function (chStateData) {
                var self = this;
                return function () {
                    chStateData.commObj.send(null, false, false, true);
                    chStateData.state.sendTimerId = null;
                };
            },

            _getCommunicationObj: function (chStateData) {
                var result = {};
                var self = this;

                result.send = function (message, is_special_request, is_urgent_request, is_send_all) {
                    
                    if (chStateData.state.isClosed)
                        return;

                    var msg_to_send;
                    var is_special = (typeof (is_special_request) !== "undefined") && is_special_request;
                    var is_urgent = (typeof (is_urgent_request) !== "undefined") && is_urgent_request;
                    var send_all = ((typeof (is_send_all) !== "undefined") && is_send_all) || is_special;

                    if ((chStateData.outQueue.length < self._queue_out_maxlen) || (message === null)) {
                        if (message !== null)
                            if (is_urgent)
                                chStateData.outQueue.unshift(message);
                            else
                                chStateData.outQueue.push(message);
                    } else
                        if (DEBUG) console.log("The length of the output queue has reached its maximum: " +
                            self._queue_out_maxlen + ". The message has been ignored.");

                    if ((!send_all) && (chStateData.state.sendTimerId === null) &&
                            (chStateData.outQueue.length > 0)) {
                        chStateData.state.sendTimerId = setTimeout(chStateData.sendAll, 0);
                    };

                    var can_send = send_all &&
                        (chStateData.stream !== null) &&
                        (chStateData.state.connected || (chStateData.chType == CommunicationClient.AJAX)) &&
                        ((chStateData.state.clientId !== null) || is_special) &&
                        ((chStateData.chType == CommunicationClient.WEB_SOCKET)
                            || (chStateData.chType == CommunicationClient.SOCKET_IO)
                            || (!chStateData.stream.isWaiting)) &&
                        (chStateData.outQueue.length > 0);
                    
                    if (can_send) {
                        
                        msg_to_send = chStateData.outQueue;
                        chStateData.outQueue = []; // clear output message queue

                        chStateData.state.lastMsg = msg_to_send;
                        
                        if (chStateData.chType == CommunicationClient.WEB_SOCKET) {
                            if (DEBUG || self._io_log_flag) console.log("###io WS output msg: " + JSON.stringify(msg_to_send));
                            chStateData.stream.send(JSON.stringify(msg_to_send));
                        } else {
                            if (chStateData.chType == CommunicationClient.SOCKET_IO) {

                                function process_ack(ack) {
                                    if (DEBUG) console.log("###SOCKET.IO ack: " + JSON.stringify(ack));
                                    if (ack.msgId in chStateData.notConfirmedObj) {
                                        var idx = chStateData.notConfirmedObj[String(ack.msgId)];
                                        if (idx < chStateData.notConfirmedArr.length) {
                                            chStateData.notConfirmedArr.splice(idx, 1);
                                            for (var key in chStateData.notConfirmedObj) {
                                                if (chStateData.notConfirmedObj[key] > idx)
                                                    chStateData.notConfirmedObj[key]--;
                                            };
                                        };
                                        delete chStateData.notConfirmedObj[ack.msgId];
                                        chStateData.notConfirmedCnt--;
                                    };
                                };

                                chStateData.notConfirmedCnt++;
                                var msgId = ++chStateData.msgSocketId;
                                msg_to_send = { msgId: msgId, data: msg_to_send };

                                if (chStateData.notConfirmedArr.length >= MAX_NOT_CONFIRMED_LEN) {
                                    var msg = chStateData.notConfirmedArr.shift();
                                    if (msg.msgId in chStateData.notConfirmedObj) {
                                        delete chStateData.notConfirmedObj[msg.msgId];
                                        for (var key in chStateData.notConfirmedObj) {
                                            chStateData.notConfirmedObj[key]--;
                                        };
                                    };
                                };
                                chStateData.notConfirmedObj[msgId] = chStateData.notConfirmedArr.length;
                                chStateData.notConfirmedArr.push(msg_to_send);

                                //if (DEBUG) console.log("###io SOCKET.IO output msg: " + JSON.stringify(msg_to_send));
                                if (chStateData.needToResend) {
                                    chStateData.needToResend = false;
                                    for (var i = 0; i < chStateData.notConfirmedArr.length; i++) {
                                        chStateData.stream.emit("message", JSON.stringify(chStateData.notConfirmedArr[i]), process_ack);
                                    };
                                }
                                else
                                    chStateData.stream.emit("message", JSON.stringify(msg_to_send), process_ack);
                            } else {
                                var msg = msg_to_send;
                                if (chStateData.state.clientId !== null) {
                                    msg = {};
                                    msg._id_ = chStateData.state.clientId;
                                    msg.data = msg_to_send;
                                };
                                //if (DEBUG) console.log("###io AJAX output msg: " + JSON.stringify(msg.data));
                                self._sendAjaxMsg(msg, chStateData);
                            };
                        };
                    };
                };
                
                result.isConnected = function () {
                    var result = false;
                    if ((chStateData.chType == CommunicationClient.WEB_SOCKET) && (chStateData.stream !== null))
                        result = chStateData.stream.readyState == 1;
                    return result;
                };
                
                result.isEnabled = function () {
                    return Window.WebSocket;
                };
                
                result.getMsgId = function () {
                    return ++chStateData.msgId;
                };

                result.shutdown = function () {

                    if (chStateData.channel !== null)
                        chStateData.channel.close(event);

                    var cmd = {};
                    cmd._cmd_ = "close";
                    chStateData.commObj.send(cmd);
                    if ((chStateData.chType == CommunicationClient.WEB_SOCKET) ||
                        (chStateData.chType == CommunicationClient.SOCKET_IO)) {
                        self._ws_close_silent(chStateData.stream, chStateData.chType == CommunicationClient.SOCKET_IO);
                        chStateData.stream = null;
                    };
                    chStateData.state.isClosed = true;
                };

                return result;
            },
            
            _getProtocolName: function(chType){
                var protocol_name = "AJAX";
                if (chType == CommunicationClient.WEB_SOCKET) {
                    protocol_name = "WS";
                } else
                    if (chType == CommunicationClient.SOCKET_IO) {
                        protocol_name = "Socket.IO";
                    };
                return protocol_name;
            },

            _getErrorProcessor: function (chStateData) {
                var self = this;
                return function (error) {
                    
                    if (! chStateData.state.connected) {
                        
                        var protocol_name = self._getProtocolName(chStateData.chType);
                        if ((chStateData.chType == CommunicationClient.WEB_SOCKET) ||
                                (chStateData.chType == CommunicationClient.SOCKET_IO)) {
                            self._ws_close_silent(chStateData.stream, chStateData.chType == CommunicationClient.SOCKET_IO);
                        };
                        
                        chStateData.state.conn_errors++;
                        
                        var msg = protocol_name + " Error: Connection to \"" +
                                chStateData.url + "\" failed (trial " + chStateData.state.conn_errors +
                                " of " + self._conn_try_max + ").";
                        
                        if (chStateData.state.conn_errors < self._conn_try_max) {
                            if (DEBUG) console.log(msg + " Trying to connect...");
                            if (chStateData.state.connTimerId === null)
                                chStateData.state.connTimerId = setTimeout(self._getConnectFunction(chStateData), self._conn_try_interval);
                        }
                        else
                            if (DEBUG) console.log(msg);
                    } else {
                        // Failed while sending messages
                        self._processErrInMsg(chStateData);
                    };
                }
            },

            _processErrInMsg: function (chStateData) {
                if (chStateData.state.connected) {
                    chStateData.state.errors++;
                    if (chStateData.state.lastMsg !== null) {
                        if (chStateData.state.lastMsg instanceof Array) {
                            for (var i = 0; i < chStateData.outQueue.length; i++)
                                chStateData.state.lastMsg.push(chStateData.outQueue[i]);
                            chStateData.outQueue = chStateData.state.lastMsg;
                        } else {
                            chStateData.outQueue.unshift(chStateData.state.lastMsg);
                        };
                        chStateData.state.lastMsg = null;
                    };
                };
            },

            _getWSOpenProcessor: function (chStateData) {
                var self = this;
                return function (event) {
                    self._setStateConnected(chStateData);
                    self._requestId(chStateData);
                };
            },
            
            _setStateConnected: function(chStateData) {
                chStateData.state.connected = true;
                chStateData.state.conn_errors = 0;
                if (DEBUG) console.log(this._getProtocolName(chStateData.chType) + ": Connected to \"" + chStateData.url + "\" !");
            },

            _getWSMsgProcessor: function (chStateData) {
                var self = this;
                return function (event, callback) {
                    var data;
                    if (chStateData.chType == CommunicationClient.WEB_SOCKET) {
                        data = JSON.parse(event.data);
                    };

                    if (chStateData.chType == CommunicationClient.SOCKET_IO) {
                        data = JSON.parse(event);
                        var msgId = data.msgId;
                        data = data.data;

                        if (typeof (callback) === "function") {
                            callback({ msgId: msgId, res: "OK" });
                        };
                    };

                    self._processMsg(data, chStateData);
                };
            },
            
            _getAjaxMsgProcessor: function (chStateData) {
                var self = this;
                return function (data) {
                    self._processMsg(data, chStateData);
                };
            },
            
            _getAjaxCompleteProcessor: function (chStateData){
                return function (jqXHR, textStatus) {
                    chStateData.stream.isWaiting = false;
                    chStateData.commObj.send(null);
                    //if (DEBUG) console.log("AJAX complete: status: " + textStatus);
                };
            },

            _processMsg: function (msg, chStateData){
                var inp = []
                
                if (msg instanceof Array)
                    inp = msg;
                else
                    throw new Error("CommServer::_processMsg: Input message should always be an ARRAY!");

                if (DEBUG || this._io_log_flag) console.log("###io Input msg: " + JSON.stringify(inp));
                for (var i = 0; i < inp.length; i++) {
                    //try {
                        if (typeof (inp[i]._cmd_) !== "undefined")
                            this._processLowLevelCmd(inp[i], chStateData);
                        else {
                            if (chStateData.channel !== null)
                                chStateData.channel.receive(inp[i]);
                            else
                                chStateData.inpQueue.push(inp[i]);
                        };
                    /*} catch (err) {
                        if (DEBUG) console.log("###Error in _processMsg {name: \"" + err.name + "\", message: \"" + err.message + "\").");
                    };*/
                };
            },
                        
            _getWSCloseProcessor: function (chStateData) {
                var self = this;
                return function (event) {
                    if (chStateData.chType == CommunicationClient.WEB_SOCKET) {
                        if (event.code != WS_CLOSE_SUCCESS_CODE) {
                            // Connection has unexpectedly closed
                            self._processErrInMsg(chStateData);
                            chStateData.state.clientId = null; // clear actual clientId
                            self._getConnectFunction(chStateData)(); // reconnect
                        };
                    } else {
                        //Socket.io disconnect
                        chStateData.state.clientId = null; // clear actual clientId
                        chStateData.state.connected = false;
                    };
                };
            },

            _ws_close_silent: function (ws, is_socket_io) {
                if (ws !== null) {
                    if (!is_socket_io) {
                        ws.onerror = null;
                        ws.onopen = null;
                        ws.onmessage = null;
                        ws.onclose = null;
                    } else
                        ws.removeAllListeners();
                    ws.close();
                };
            },
            
            _requestId: function (chStateData) {
                var self = this;
                var req = function request() {
                    if ((chStateData.state.clientId === null) &&
                        (chStateData.state.getId_trials < self._getid_try_max)) {
                        var cmd = {};
                        cmd._cmd_ = "getId";
                        
                        if (chStateData.state.prevClientId !== null) {
                            cmd._cmd_ = "currId";
                            cmd._data_ = chStateData.state.prevClientId;
                        };
                        chStateData.commObj.send(cmd, true, true);
                        chStateData.state.getId_trials++;
                        
                        if (DEBUG) console.log("Sending \"" + JSON.stringify(cmd) + "\" request ( " +
                            chStateData.state.getId_trials + " of " + self._getid_try_max + " ).")
                        
                        if (chStateData.chType == CommunicationClient.WEB_SOCKET)
                            chStateData.state.getIdTimerId = setTimeout(request, self._getid_try_interval);
                    };
                };
                req();
            },
            
            _processLowLevelCmd: function (cmd, chStateData) {
                switch (cmd._cmd_) {
                    case "setId":
                        if (chStateData !== null) {
                            
                            if (chStateData.chType == CommunicationClient.AJAX)
                                this._setStateConnected(chStateData);
                            
                            var is_opened = (chStateData.state.prevClientId === null) 
                                || (chStateData.state.prevClientId != cmd._data_);
                            if (DEBUG) console.log("Received Client Id: \"" + cmd._data_ + "\"");

                            if (!is_opened)
                                chStateData.needToResend = true;

                            chStateData.state.clientId = cmd._data_;
                            chStateData.state.prevClientId = cmd._data_;
                            chStateData.state.getId_trials = 0;
                            if (chStateData.state.getIdTimerId !== null) {
                                clearTimeout(chStateData.state.getIdTimerId);
                                chStateData.state.getIdTimerId = null;
                            };
                            
                            if (is_opened && (chStateData.channel !== null)) {
                                chStateData.channel.open();
                            };
                            
                            if (chStateData.chType == CommunicationClient.AJAX)
                                chStateData.stream.setPollingTimer();
                        };
                        break;

                    case "refuseId":
                        if (chStateData !== null) {

                            chStateData.isBlocked = true;

                            if (DEBUG) console.log("This client has been blocked by server (probably server has been restarted)!");

                            if (chStateData.chType == CommunicationClient.AJAX)
                                this._setStateConnected(chStateData);

                            chStateData.state.clientId = cmd._data_;
                            chStateData.state.prevClientId = cmd._data_;
                            chStateData.state.getId_trials = 0;
                            if (chStateData.state.getIdTimerId !== null) {
                                clearTimeout(chStateData.state.getIdTimerId);
                                chStateData.state.getIdTimerId = null;
                            };

                            if (chStateData.channel !== null) {
                                setTimeout(function () {
                                    chStateData.channel.reconnect();
                                }, 0);
                            };

                        };
                        break;
                }
            }
        });
        
        return CommunicationClient;
    }
);
