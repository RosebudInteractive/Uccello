if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./memTreeModelRoot', '../predicate/parameter'],
    function (MemTreeModelRoot, Parameter) {
        var ParamTreeRoot = MemTreeModelRoot.extend({

            className: "ParamTreeRoot",
            classGuid: UCCELLO_CONFIG.classGuids.ParamTreeRoot,
            metaFields: [],

            metaCols: [
                { "cname": "Parameters", "ctype": "Parameter" }
            ],

            init: function (cm, params) {
                this._paramsByName = {};

                UccelloClass.super.apply(this, [cm, params]);

                if (params) {
                    var paramsCol = this.getCol("Parameters");
                    paramsCol.on({
                        type: 'beforeAdd',
                        subscriber: this,
                        callback: this._onBeforeAddParameter
                    }).on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddParameter
                    }).on({
                        type: 'beforeDel',
                        subscriber: this,
                        callback: this._onBeforeDelParameter
                    });
                };
            },

            _getParamsTemplate: function () {
                return {};
            },

            _createParmeters: function () {
                var paramsCol = this.getCol("Parameters");
                if (paramsCol.count() === 0) {
                    var params = this._getParamsTemplate();
                    var keys = Object.keys(params);
                    for (var i = 0; i < keys.length; i++) {
                        var ini_params = {
                            ini: {
                                fields: {
                                    Name: keys[i],
                                    Value: params[keys[i]]
                                }
                            },
                            parent: this,
                            colName: "Parameters"
                        };
                        new Parameter(this.getDB(), ini_params);
                    };
                };
            },

            getParameter: function (name) {
                this._createParmeters();
                return this._paramsByName[name] ? this._paramsByName[name].parameter : null;
            },

            getParams: function () {
                var result = {};
                this._createParmeters();
                var paramsCol = this.getCol("Parameters");
                for (var i = 0; i < paramsCol.count() ; i++) {
                    var param = paramsCol.get(0);
                    result[param.name()] = param;
                }
                return result;
            },

            setParameter: function (name, value) {
                this._createParmeters();
                var param = this.getParameter(name);
                if(!param)
                    throw new Error("Parameter \"" + name + "\" doesn't exist.");
                param.valValue(value);
            },

            getParamValues: function () {
                var result = null;
                var params = this.getParams();
                for (var pname in params) {
                    var param = params[pname];
                    var ptype = param.valType();
                    var pval = param.valValue();
                    if (typeof (pval) !== "undefined") {
                        if (!result)
                            result = {};
                        result[pname] = ptype.getSerializedValue(pval);
                    };
                };
                return result;
            },

            getExpression: function () {
                var result = { adapter: this.getAdapter() };
                var params = this.getParamValues();
                if (params)
                    result.params = params;
                return result;
            },

            _getOnChangeReadOnlyProp: function (obj, prop_name) {
                var self = this;
                var oldVal = obj._genericSetter(prop_name);

                return function (args) {
                    var newVal = obj._genericSetter(prop_name);
                    if (!obj.getFieldType(prop_name).isEqual(oldVal, newVal)) {
                        obj.set(prop_name, oldVal);
                        throw new Error("Property \"" + prop_name + "\" is READONLY.");
                    };
                };
            },

            _onBeforeAddParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                if (this._paramsByName[name])
                    throw new Error("Parameter \"" + name + "\" already exists.");
                var tparams = this._getParamsTemplate();
                var param_templ = tparams[name];
                if (!param_templ)
                    throw new Error("Parameter \"" + name + "\" already exists.");
                var ptype = parameter.valType().serialize();
                if (JSON.stringify(param_templ) !== JSON.stringify(ptype))
                    throw new Error("Wrong type: " + JSON.stringify(ptype) + " of parameter \"" + name + "\".");
            },

            _onAddParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                var handlers = [];
                var hdesc = {
                    type: 'mod%Name',
                    subscriber: this,
                    callback: this._getOnChangeReadOnlyProp(parameter, "Name")
                };
                parameter.event.on(hdesc);
                handlers.push(hdesc);
                this._paramsByName[name] = { parameter: parameter, handlers: handlers };
            },

            _onBeforeDelParameter: function (args) {
                var parameter = args.obj;
                var name = parameter.get("Name");
                throw new Error("Can't delete parameter \"" + name + "\". It's not allowed to delete parameters.");
            },
        });

        return ParamTreeRoot;
    }
);