if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['bluebird', 'lodash', './testData'],
    function (Promise, _, TestData) {

        var ADAPTERS = ["processData", "requestData"];

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
                try {
                    var result = _.cloneDeep(TestData);
                    if (guidRoot)
                        result.$sys.guid = guidRoot;
                }
                catch (err) {
                    console.error("###ERROR: " + err.message);
                    result = {};
                };
                if (done)
                    done(result);
            },

            saveData: function (data_object, options, cb) {
                var result = { result: "OK" };

                try {
                }
                catch (err) {
                    result = { result: "ERROR", message: err.message };
                };
                if (cb)
                    cb(result);
            }

        });

        return ProcessAdapter;
    }
);