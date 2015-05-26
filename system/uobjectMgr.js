if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [],
    function() {
        var UObjectMgr = UccelloClass.extend({

            init: function(db, rootGuid, vc){
            }

        });
        return UObjectMgr;
    }
);