if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [],
    function() {
        var UObjectMgr = Class.extend({

            init: function(db, rootGuid, vc){
            }

        });
        return UObjectMgr;
    }
);