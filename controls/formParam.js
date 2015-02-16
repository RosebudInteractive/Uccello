if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    ['./aComponent'],
    function(AComponent) {
        var FormParam = AComponent.extend({

            className: "FormParam",
            classGuid: "4943ce3e-a6cb-65f7-8805-ec339555a981",
            metaFields: [
                {fname: "Type", ftype: "string"},
                {fname: "Kind", ftype: "string"},
                {fname: "Value", ftype: "string"},
                {fname: "OnModify", ftype: "event"}
            ],

            init: function(cm,params){
                this._super(cm,params);

                // onModify
                if (this.getObj()) {
                    if (this.getObj().get("OnModify")) {
                        this.onModify = new Function("newVal",this.getObj().get("OnModify"));
                    }
                }

            },

            processDelta: function() {
                var obj = this.getObj();
                if (obj.isFldModified("Value") && ( "onModify" in this)) {
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