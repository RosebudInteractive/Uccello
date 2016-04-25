if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./metaModel', '../common/keyValuePair'],
    function (MetaModel, KeyValuePair) {

        var MetaModelVirtual = MetaModel.extend({

            className: "MetaModelVirtual",
            classGuid: UCCELLO_CONFIG.classGuids.MetaModelVirtual,
            metaCols: [
                { "cname": "ProviderSQLs", "ctype": "KeyValuePair" },
                { "cname": "Bindings", "ctype": "UObject" }
            ],
            metaFields: [
                { fname: "DefaultSQL", ftype: "string" }
            ],

            defaultSQL: function (value) {
                return this._genericSetter("DefaultSQL", value);
            },

            isVirtual: function () {
                return true;
            },

            init: function (cm, params) {
                this._providersByName = {};

                UccelloClass.super.apply(this, [cm, params]);
                if (params) {
                    this._sqlCol = this.getCol("ProviderSQLs");
                    this._sqlCol.on({
                        type: 'beforeAdd',
                        subscriber: this,
                        callback: this._onBeforeAddSQL
                    }).on({
                        type: 'add',
                        subscriber: this,
                        callback: this._onAddSQL
                    }).on({
                        type: 'del',
                        subscriber: this,
                        callback: this._onDeleteSQL
                    });
                };
            },

            getProviderSQL: function (provider_name) {
                var result = null;
                if (!provider_name)
                    throw new Error("Provider name is empty!");
                if (this._providersByName[provider_name])
                    result = this._providersByName[provider_name].provider.value();
                return result;
            },

            getSQL: function (provider_name) {
                var result = null;
                if (!provider_name)
                    result = this.defaultSQL()
                else {
                    result = this.getProviderSQL(provider_name);
                    if (!result)
                        result = this.defaultSQL();
                }
                return result;
            },

            setDefaultSQL: function (value) {
                this.defaultSQL(value);
                return this;
            },

            setSQL: function (provider_name, value) {
                if (!provider_name)
                    throw new Error("Provider name is empty!");
                if (this._providersByName[provider_name])
                    this._providersByName[provider_name].provider.value(value)
                else {
                    var ini_params = {
                        ini: {
                            fields: {
                                Name: provider_name,
                                Value: value
                            }
                        },
                        parent: this,
                        colName: "ProviderSQLs"
                    };
                    new DsAlias(this.getDB(), ini_params);
                };
                return this;
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

            _onBeforeAddSQL: function (args) {
                var provider = args.obj;
                var name = provider.get("Name");
                if (this._providersByName[name])
                    throw new Error("Provider \"" + name + "\" already exists.");
            },

            _onAddSQL: function (args) {
                var provider = args.obj;
                var name = provider.get("Name");
                var handlers = [];
                var hdesc = {
                    type: 'mod%Name',
                    subscriber: this,
                    callback: this._getOnChangeReadOnlyProp(provider, "Name")
                };
                provider.event.on(hdesc);
                handlers.push(hdesc);
                this._providersByName[name] = { provider: provider, handlers: handlers };
            },

            _onDeleteSQL: function (args) {
                var provider = args.obj;
                var name = provider.get("Name");
                if (this._providersByName[name] && (this._providersByName[name].provider === provider)) {
                    this._providersByName[name].handlers.forEach(function (hdesc) {
                        provider.event.off(hdesc);
                    });
                    delete this._providersByName[name];
                };
            },
        });

        return MetaModelVirtual;
    }
);