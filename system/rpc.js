if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль Remote Procedure Call
 * @module Rpc
 */
define (
    function() {
		
		var defineProxyClass = (function() {
			// Creates a proxying function that will call the real object.
			function createProxyFunction(functionName) {
				return function() {
					var pholder = this.pvt.proxy;

					
					var cb=null;
					if (arguments.length>0) {
						var lastArg = arguments[arguments.length-1];
						if (typeof lastArg == "function") {
							var newArgs = [];
							for (var i=0; i<arguments.length-1; i++)
								newArgs.push(arguments[i]);
							//var newArgs = arguments.slice(0,arguments.length-1);
							cb = lastArg;
							}
						else 
							newArgs = arguments;
					}
					else
						newArgs = [];
						
					if (this.pvt.proxy.connect) {						
						var params={action:"remoteCall",type:"method",func:functionName,guidIntf:pholder.guidIntf, guidObj: pholder.guidObj, args: newArgs };
						if (typeof lastArg == "function") 
							this.pvt.proxy.connect.send(params,lastArg); // с коллбэком
						else
							this.pvt.proxy.connect.send(params); // без колбэка

					}
					else {
						// 'this' in here is the proxy object.
						var realObject = this.pvt.proxy.obj,
							realFunction = realObject[functionName];
							
						var result = realFunction.apply(realObject, arguments);
						/*
						var result = realFunction.apply(realObject, newArgs);
						if (typeof lastArg == "function") lastArg(result); // вызвать коллбэк
						*/
						return result; 
					}
				};
			};

			// createProxyClass creates a function that will create Proxy objects.
			//   publicFunctions: an object of public functions for the proxy.
			function createProxyClass(intfObj) {
				var proxyClass;

				// This is this Proxy object constructor.
				proxyClass = function (proxy) { //realObject,connect) {
					this.pvt = {};
					this.pvt.proxy = proxy;
					//this.pvt.connect = connect;
				};

				// Create a proxy function for each of the public functions.
				for (var functionName in intfObj) {
					if (functionName == "constructor" || functionName.substr(0,1)=="_") continue;
					var func = intfObj[functionName];
					if (intfObj[functionName] === "function") {
						proxyClass.prototype[functionName] = createProxyFunction(functionName);
					}
				}

				return proxyClass;
			}

			// Return the defineClass function.
			return function (classObj) {
				var proxyClass = createProxyClass(classObj);
				return proxyClass;
			};

		})();
		
	
        var Rpc = Class.extend({

            init: function(params) {
				this.pvt = {};
				this.pvt.intfs = {};
				this.pvt.proxies = {};
				
				if (params.router) {
					var that = this, onCall = that.onRemoteCall;
					params.router.add('remoteCall', function(){ return onCall.apply(that, arguments); });
				}


            },
			
			
			onRemoteCall: function(data,done) {
				var gi = data.guidIntf,
					go = data.guidObj,
					p = this.pvt.intfs[gi][go];
				
				/*if (p) {
					var r = p.proxy[data.func].apply(p.proxy,data.args);
				}
				done(r);*/
				if (p) {
					data.args.push(done);
					var r = p.proxy[data.func].apply(p.proxy,data.args);
					//var r = p.proxy[data.func].apply(p.proxy,data.args,done);
				}
				if (r!="XXX") done(r);
			},
			
			// опубликовать 
			// obj должен поддерживать метод getGuid() !!!
			_publ: function(obj, intf) {
				//var intf = new Cintf();
				if (this.pvt.intfs[intf.classGuid] == undefined) {
				  var p=this.pvt.intfs[intf.classGuid] = {};
				  p.cproxy = defineProxyClass(intf);
				}
				p = this.pvt.intfs[intf.classGuid];
				var co = p[obj.getGuid()] = {};
				co.obj = obj;
				co.connect = null;
				co.guidIntf = intf.classGuid;
				co.proxy = new p.cproxy(co);
				this.pvt.proxies[obj.getGuid()] = co;
				return co.proxy;
			},
			
			_publProxy: function(guid, connect, intf) {
				//var intf = new Cintf();
				if (this.pvt.intfs[ intf.classGuid] == undefined) {
				  var p=this.pvt.intfs[ intf.classGuid] = {};
				  p.cproxy = defineProxyClass(intf);
				}
				p = this.pvt.intfs[ intf.classGuid];
				
				var co = p[guid] = {};
				co.connect = connect;
				co.guidObj = guid;
				co.guidIntf = intf.classGuid;
				co.proxy = new p.cproxy(co);
				this.pvt.proxies[guid] = co;
				return co.proxy;
			},
			
			_free: function(guid, intf) {
			},
			
			getProxy: function(guid) {
				return this.pvt.proxies[guid];
			},
			
			
			
			
			
        });

        return Rpc;
    }
);