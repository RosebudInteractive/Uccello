if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./channel', 'ws', 'http', 'socket.io'],
    function (Channel, WebSocket, Http, SocketIO) {
        
        var CommunicationServer = {};        
        
        CommunicationServer.AJAX = 1;
        CommunicationServer.WEB_SOCKET = 2;
        CommunicationServer.SOCKET_IO = 4;

        CommunicationServer.PORT = 8081;
        
        var QUEUE_OUT_MAXLEN = 1000;
        
        var AJAX_POST_HTTP_HEADER =
        {
            "Content-Type" : "application/json",
            "Access-Control-Allow-Origin" : "*"
        };
        var AJAX_OPTIONS_HTTP_HEADER =
        {
            "Access-Control-Allow-Headers" : "accept, content-type",
            "Access-Control-Allow-Method" : "POST, OPTIONS",
            "Access-Control-Allow-Origin" : "*"
        };
        
        var MAX_NOT_CONFIRMED_LEN = 100;
        var IO_LOG_FLAG = false;

        CommunicationServer.Server = UccelloClass.extend({
            
            init: function (options) {
                
                this.port = (options && options.port) ? options.port : CommunicationServer.PORT;

                this.serverType = (options && options.type) ? options.type :
                    CommunicationServer.AJAX + CommunicationServer.WEB_SOCKET;
                if ((this.serverType & CommunicationServer.SOCKET_IO) != 0)
                    this.serverType = CommunicationServer.SOCKET_IO;

                this._queue_out_maxlen = (options && options.queue_out_maxlen) ?
                    options.queue_out_maxlen : QUEUE_OUT_MAXLEN;
                
                this._io_log_flag = (options && options.io_log_flag) ? options.io_log_flag : IO_LOG_FLAG;

                this._wss = null;
                this._ajax = null;
                this._io = null;

                this._channellProps = null;
                this._channells = [];
                this._currClientId = 0;
                this._isClosing = false;
                this._isClosed = false;

            },
            
            setEventHandlers: function (handlers){
                this._channellProps = handlers;
            },
                        
            start: function (){
                var self = this;

                if ((this.serverType & CommunicationServer.SOCKET_IO) != 0) {

                    this._io = SocketIO();
                    this._io.on('connection', this._getWSConnProcessor(CommunicationServer.SOCKET_IO));
                    this._io.listen(this.port/*, to disable WS { allowUpgrades: false }*/);

                } else {

                    if ((this.serverType & CommunicationServer.AJAX) != 0) {
                        this._ajax = Http.createServer(function (req, res) {

                            if (self._isClosing || self._isClosed) {
                                req.destroy();
                            } else {

                                if (req.method == "OPTIONS") {
                                    res.writeHead(200, AJAX_OPTIONS_HTTP_HEADER);
                                    res.end();
                                }
                                else {
                                    if (req.method == "POST") {

                                        var in_msg = "";

                                        req.on('data', function (chunk) {
                                            in_msg = in_msg + chunk.toString();
                                        });

                                        req.on('end', function () {
                                            self._processAjaxMsg(JSON.parse(in_msg), res);
                                        });
                                    };
                                };
                            };
                        });
                    };

                    if ((this.serverType & CommunicationServer.WEB_SOCKET) != 0) {
                        if (this._ajax !== null)
                            this._wss = new WebSocket.Server({ server: this._ajax });
                        else
                            this._wss = new WebSocket.Server({ port: this.port });
                        this._wss.on('connection', this._getWSConnProcessor(CommunicationServer.WEB_SOCKET));
                    };

                };

                if (this._ajax !== null) {
                    this._ajax.listen(this.port);
                    this._isClosing = false;
                    this._isClosed = false;
                };
            },

            stop: function () {
                if (this._io !== null) {
                    this._io.close();
                    this._io = null;
                };
                if (this._wss !== null) {
                    this._wss.close();
                    this._wss = null;
                };
                if (this._ajax !== null) {
                    this._isClosing = true;
                    this._ajax.close(function(err) {
                        this._ajax = null;
                        this._isClosed = true;
                        if (DEBUG) console.log("HTTP Server closed !");
                    });
                };
            },
            
            _getCommunicationObj: function (chStateData) {
                var result = {};
                var self = this;

                result.send = function (message, is_special_request, is_send_all) {
                    
                    if (chStateData.isClosed)
                        return;

                    chStateData.lastMsg = null;
                    var send_all = (typeof (is_send_all) !== "undefined") && is_send_all;

                    if ((chStateData.outQueue.length < self._queue_out_maxlen) || (message === null)) {
                        if (message !== null)
                            if ((typeof (is_special_request) !== "undefined") && is_special_request)
                                chStateData.outQueue.unshift(message);
                            else
                                chStateData.outQueue.push(message);
                    } else
                        if (DEBUG) console.log("The length of the output queue has reached its maximum: " +
                            self._queue_out_maxlen + ". The message has been ignored.");

                    if ((chStateData.stream !== null) && (chStateData.outQueue.length > 0)) {

                        if ((!send_all) && (!chStateData.hasMsgs)) {
                            chStateData.hasMsgs = true;
                            process.nextTick(chStateData.sendAll);
                        };

                        if (send_all) {
                            var msg_to_send;
                            msg_to_send = chStateData.outQueue;

                            chStateData.outQueue = []; // clear output message queue
                            chStateData.lastMsg = msg_to_send;

                            if (chStateData.chType == CommunicationServer.WEB_SOCKET) {
                                if (DEBUG || self._io_log_flag)
                                    console.log("###io\t" + chStateData.clientId + "\tts:" + Number(new Date()) + "\tsrv\tout\t" + JSON.stringify(msg_to_send));
                                chStateData.stream.send(JSON.stringify(msg_to_send), function ack(error) {
                                    if (typeof (error) !== "undefined") {
                                        // Error !!! Restore message queue
                                        self._restoreMsgQueue(chStateData);
                                        if (DEBUG || self._io_log_flag) console.log("###io\t" + chStateData.clientId + "\tts:" + Number(new Date()) +
                                            "\tsrv\terr\t" + "Error while sending WS- message: " + JSON.stringify(msg_to_send));
                                    };
                                    chStateData.lastMsg = null;
                                });
                            } else
                                if (chStateData.chType == CommunicationServer.SOCKET_IO) {

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

                                    if (chStateData.needToResend) {
                                        chStateData.needToResend = false;
                                        for (var i = 0; i < chStateData.notConfirmedArr.length; i++) {
                                            chStateData.stream.emit("message", JSON.stringify(chStateData.notConfirmedArr[i]), process_ack);
                                        };
                                    }
                                    else
                                        chStateData.stream.emit("message", JSON.stringify(msg_to_send), process_ack);
                                };
                        };
                    };
                };
                
                result.isConnected = function () {
                    var result = false;
                    if ((chStateData.chType == CommunicationServer.WEB_SOCKET) && (chStateData.stream !== null))
                        result = chStateData.stream.readyState == 1;
                    return result;
                };
                
                result.isEnabled = function () {
                    return true;
                };
                
                result.getMsgId = function () {
                    return --chStateData.msgId;
                };

                result.shutdown = function () {
                };

                return result;
            },
            
            _restoreMsgQueue: function(chStateData){
                if (chStateData.lastMsg !== null) {
                    chStateData.errors++;
                    if (chStateData.lastMsg instanceof Array) {
                        for (var i = 0; i < chStateData.outQueue.length; i++)
                            chStateData.lastMsg.push(chStateData.outQueue[i]);
                        chStateData.outQueue = chStateData.lastMsg;
                    } else {
                        chStateData.outQueue.unshift(chStateData.lastMsg);
                    };
                    chStateData.lastMsg = null;
                };
            },

            _getWSConnProcessor: function (serverType) {
                var self = this;
                return function (ws) {
                    
                    if (DEBUG) console.log("###WS opened !");
                    var chStateData = self._createNewClientRecod(serverType);
                    chStateData.stream = ws;
                    
                    chStateData.wsMsgProcessor = self._getWSMsgProcessor(chStateData);
                    chStateData.wsCloseProcessor = self._getWSCloseProcessor(chStateData);

                    ws.on('message', chStateData.wsMsgProcessor);
                    ws.on('close', chStateData.wsCloseProcessor);
                }
            },
            
            _createNewClientRecod: function(chType){
                var rec_number = ++this._currClientId;
                var chStateData = {};
                
                chStateData.chType = chType;
                chStateData.inpQueue = [];
                chStateData.outQueue = [];
                chStateData.errors = 0;
                chStateData.msgId = 0;
                chStateData.clientId = "id" + Number(new Date()); // Use current datetime for ID
                chStateData.lastMsg = null;
                chStateData.connId = rec_number;
                chStateData.commObj = this._getCommunicationObj(chStateData);
                chStateData.sendAll = this._getSendAllFunction(chStateData);
                chStateData.channel = null;
                chStateData.stream = null;
                chStateData.isClosed = false;
                chStateData.hasMsgs = false;
                chStateData.isBlocked = false; // If TRUE then the messages won't be processed

                chStateData.notConfirmedArr = [];
                chStateData.notConfirmedObj = {};
                chStateData.notConfirmedCnt = 0;
                chStateData.msgSocketId = 0;
                chStateData.needToResend = false;

                chStateData.wsMsgProcessor = null;
                chStateData.wsCloseProcessor = null;

                this._channells[chStateData.clientId] = chStateData;
                return chStateData;
            },

            _getSendAllFunction: function (chStateData) {
                return function () {
                    chStateData.commObj.send(null, false, true);
                    chStateData.hasMsgs = false;
                };
            },

            _getWSMsgProcessor: function (chStateData) {
                var self = this;
                return function (event, callback) {
                    var data = JSON.parse(event);

                    if (chStateData.chType == CommunicationServer.SOCKET_IO) {
                        var msgId = data.msgId;
                        data = data.data;

                        if (typeof (callback) === "function") {
                            if (DEBUG) console.log("###SOCKET.IO confirmation: "
                                + msgId + ", ClientId: " + chStateData.clientId + ".");
                            callback({ msgId: msgId, res: "OK" });
                        };
                    };
                    self._processMsg(data, chStateData);
                };
            },
            
            _processMsg: function (msg, chStateData){

                if (DEBUG || this._io_log_flag)
                    console.log("###io\t" + chStateData.clientId + "\tts:" + Number(new Date()) + "\tsrv\tinp\t" + JSON.stringify(msg));

                var inp = [];
                var i;
                if (msg !== null) {
                    
                    if (msg instanceof Array)
                        inp = msg;
                    else
                        throw new Error("CommServer::_processMsg: Input message should always be an ARRAY!");

                    for (i = 0; i < inp.length; i++)
                        chStateData.inpQueue.push(inp[i]);
                };
                
                while (chStateData.inpQueue.length > 0) {
                    inp = chStateData.inpQueue.shift();
                    if (typeof (inp._cmd_) !== "undefined")
                        this._processLowLevelCmd(inp, chStateData);
                    else {
                        if (chStateData.channel !== null)
                            if (chStateData.isBlocked) {
                                if (DEBUG)
                                    console.log("###MSG received: Message from the blocked account has been ignored !");
                            } else {
                                chStateData.channel.receive(inp);
                            }
                        else
                            if (DEBUG) console.log("###MSG received: CHANNEL IS NULL !");
                    };
                };
            },

            _processAjaxMsg: function (msg, res){
                var chStateData = null;
                //if (DEBUG) console.log("###AJAX received: " + JSON.stringify(msg));
                var msg_to_process = msg;
                if (typeof (msg._id_) !== "undefined") {
                    if (typeof (this._channells[msg._id_]) !== "undefined") {
                        chStateData = this._channells[msg._id_];
                    } else {
                        // Wrong client ID !!!
                        chStateData = this._createNewClientRecod(CommunicationServer.AJAX);
                        this._processMsg([{ _cmd_: "currId", _data_: msg._id_ }], chStateData);
                    };
                    msg_to_process = msg.data;
                } else {
                    chStateData = this._createNewClientRecod(CommunicationServer.AJAX);
                };
                
                if (chStateData !== null)
                    this._processMsg(msg_to_process, chStateData);

                this._sendAjaxMessages(chStateData, res);
            },
            
            _sendAjaxMessages: function (chStateData, res){
                var msg_to_send = [{ _cmd_: "dummy" }];
                
                if ((chStateData !== null) && (chStateData.outQueue.length > 0)) {
                    
                    msg_to_send = chStateData.outQueue;
                    chStateData.outQueue = []; // clear output message queue
                    chStateData.lastMsg = msg_to_send;
                };
                
                res.writeHead(200, "OK", AJAX_POST_HTTP_HEADER);
                //if (DEBUG) console.log("###AJAX send: " + JSON.stringify(msg_to_send));
                res.end(JSON.stringify(msg_to_send));
                res.on("error", function (err) {
                    this._restoreMsgQueue(chStateData);
                });
            },
                    
            _getWSCloseProcessor: function (chStateData) {
                var self = this;
                return function (event) {
                    
                    if (DEBUG || self._io_log_flag)
                        console.log("###io\t" + chStateData.clientId + "\tts:" + Number(new Date()) + "\tsrv\tclose\t" + "WS closed: " + JSON.stringify(event));

                    if (chStateData.stream !== null) {
                        chStateData.stream.removeListener('message', chStateData.wsMsgProcessor);
                        chStateData.stream.removeListener('close', chStateData.wsCloseProcessor);
                        chStateData.stream = null;
                    };
                }
            },
            
            _processLowLevelCmd: function (cmd, chStateData) {
                switch (cmd._cmd_) {

                    case "getId":
                        if (chStateData !== null) {
                            chStateData.commObj.send({ _cmd_: "setId", _data_: chStateData.clientId }, true);
                            if (chStateData.channel === null)
                                chStateData.channel = new Channel(chStateData.connId, this._channellProps, chStateData.commObj);
                        };
                        break;

                    case "currId":
                        var oldData = chStateData;
                        if ((chStateData !== null) && (chStateData.clientId != cmd._data_)) {
                            if (typeof (this._channells[cmd._data_]) !== "undefined") {
                                oldData = this._channells[cmd._data_];
                                this._switchToOldConnection(oldData, chStateData);
                                oldData.needToResend = true;
                                oldData.isBlocked = false;
                            }
                            else
                                chStateData.isBlocked = true; // Cant't identify existing connection !
                        };
                        if (oldData !== null) {
                            if (oldData.isBlocked) {
                                oldData.commObj.send({ _cmd_: "refuseId", _data_: oldData.clientId }, true);
                            } else {
                                oldData.commObj.send({ _cmd_: "setId", _data_: oldData.clientId }, true);
                                if (oldData.channel === null)
                                    oldData.channel = new Channel(oldData.connId, this._channellProps, oldData.commObj);
                            };
                            this._processMsg(null, oldData);
                        };
                        break;
                    case "poll":
                        //if (DEBUG) console.log("### AJAX polling.");
                        break;

                    case "close":
                        if (chStateData.channel !== null)
                            chStateData.channel.close();
                        chStateData.isClosed = true;
                        delete this._channells[chStateData.clientId];
                        break;
                }
            },
            
            _switchToOldConnection: function (oldData, newData) {
                if ((oldData.chType == CommunicationServer.WEB_SOCKET) ||
                        (oldData.chType == CommunicationServer.SOCKET_IO)) {
                    if (oldData.stream !== null) {
                        oldData.stream.removeListener('message', oldData.wsMsgProcessor);
                        oldData.stream.removeListener('close', oldData.wsCloseProcessor);
                        if (oldData.chType == CommunicationServer.WEB_SOCKET)
                            oldData.stream.close();
                    };
                };
                oldData.chType = newData.chType;
                oldData.stream = newData.stream;
                if ((newData.chType == CommunicationServer.WEB_SOCKET) ||
                        (newData.chType == CommunicationServer.SOCKET_IO)) {
                    if (newData.stream !== null) {
                        newData.stream.removeListener('message', newData.wsMsgProcessor);
                        newData.stream.removeListener('close', newData.wsCloseProcessor);
                        newData.stream.on('message', oldData.wsMsgProcessor);
                        newData.stream.on('close', oldData.wsCloseProcessor);
                    };
                };
                Array.prototype.push.apply(oldData.inpQueue, newData.inpQueue);
                Array.prototype.push.apply(oldData.outQueue, newData.outQueue);
                newData.inpQueue.length = 0;
                newData.outQueue.length = 0;
                delete this._channells[newData.clientId];
            }
        });
        
        return CommunicationServer;
    }
);                
