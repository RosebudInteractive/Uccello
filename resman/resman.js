if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [
        UCCELLO_CONFIG.uccelloPath + 'controls/controlMgr',
        UCCELLO_CONFIG.uccelloPath + '/predicate/predicate'
    ],
    function(ControlMgr ,Predicate) {
        var Resman = UccelloClass.extend({

            //loadProducts: function () {
            //
            //},

            init: function(controller, constructHolder, proxy, options){
                if ((options) && (options.hasOwnProperty('currProd'))) {
                    this.currentProductCode = options.currProd
                }

                var _dbParams = {
                    name: "ResourceManager",
                    kind: "master",
                    guid: "c76362cf-5f15-4aa4-8ee2-4a6e242dca51",
                    constructHolder: constructHolder
                };

                var dbtest = new ControlMgr({ controller: controller, dbparams: _dbParams },
                    null, null, null, proxy);

                //this.db = new ControlMgr({ controller: controller, dbparams: _dbParams },
                //    null, null, null, proxy);

                //loadProducts();

                var _expression = {
                    model: { name: "SysProduct" }
                };


                var that = this;
                dbtest.getRoots([UCCELLO_CONFIG.guids.rootLead], { rtype: "data", expr: _expression }, function (guids) {

                    console.log("1-st request done: " + that.db.getName());
                    dbtest.getRoots([guids.guids[0]], { rtype: "data", refresh: true, expr: _expression }, function (guids) {

                        console.log("2-nd request done: " + that.db.getName());
                    });
                });

                var _predicate = new Predicate(this.db, {});
                //_predicate.addCondition()

                this.pvt = {};
                this.pvt.controller = controller;
            },

            /**
             * Загрузить ресурс
             * @returns {obj}
             */
            loadRes: function (guidRoot) {
				var gr = guidRoot.slice(0,36);
                var json = require(UCCELLO_CONFIG.dataPath + 'forms/'+gr+'.json');
                return json;
            },

            getResource : function(guid) {
                var _predicate = new Predicate(this.db, {})
                _predicate.addCondition()
            },

            getResources : function(guids) {

            },

            getResByType : function(typeGuid) {

            },

            getResListByType : function(typeGuid) {

            },

            createNewBuild : function () {

            },

            newResourceVersion : function(res) {

            },

            commitBuild : function() {}
        });
        return Resman;
    }
);