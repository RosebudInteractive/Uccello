if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [],
    function() {
        var Resman = Class.extend({

            init: function(controller){
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
            }

        });
        return Resman;
    }
);