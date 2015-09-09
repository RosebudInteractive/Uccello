if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var FormParam = AComponent.extend({

            className: "FormParam",
            classGuid: UCCELLO_CONFIG.classGuids.FormParam,
            metaFields: [
                {fname: "Type", ftype: "string"},
                {fname: "Kind", ftype: "string"},
                {fname: "Value", ftype: "string"},
                {fname: "OnModify", ftype: "event"}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
				if (!params) return;

                // onModify абв
                /*if (this.getObj()) {
                    if (this.getObj().get("OnModify")) {
                        this.onModify = new Function("newVal",this.getObj().get("OnModify"));
                    }
                }*/
                /*jshint evil: true */
				if (this.get("OnModify")) this.onModify = new Function("newVal",this.get("OnModify"));
            },

            processDelta: function() {
                //var obj = this.getObj();
                if (this.isFldModified("Value") && ( "onModify" in this)) {
                    this.onModify(this.value());
                }
            },

            type: function (value) {
                return this._genericSetter("Type", value);
            },

            kind: function (value) {
                return this._genericSetter("Kind", value);
            },

            value: function (value) {
                return this._genericSetter("Value", value);
            }

        });
        return FormParam;
    }
);