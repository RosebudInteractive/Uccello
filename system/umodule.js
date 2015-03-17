if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['uobject'],
    function(UObject) {
        var UModule = UObject.extend({

            className: "UModule",
            classGuid: UCCELLO_CONFIG.classGuids.UModule,
            metaFields: [{fname:"Mode",ftype:"string"}],
            metaCols: [{"cname": "Resources", "ctype": "control"}],

            /**
             * @constructs
             * @param cm {ControlMgr} - менеджер контролов, к которому привязан данный контрол
             * @param params
             */
            init: function(cm, params){
                this._super(cm,params);
            },

            mode: function(value) {
                return this._genericSetter("Mode",value);
            }

        });
        return UModule;
    }
);