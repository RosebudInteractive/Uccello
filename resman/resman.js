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
                var json = require('./forms/'+guidRoot+'.json');
                return json;
            }

        });
        return Resman;
    }
);