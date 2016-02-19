if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    ['./resource'],
    function (Resource) {
        var ResForm = Resource.extend({

            className: "ResForm",
            classGuid: UCCELLO_CONFIG.classGuids.ResForm,
            metaCols: [{"cname": "Form", "ctype": "UObject"}],

            elemNamePrefix: "Element",

            getForm: function () {
                var formCol = this.getCol("Form");
                if (formCol.count() == 0) return null;
                else return formCol.get(0);
            }
        });
        return ResForm;
    }
);