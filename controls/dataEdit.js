if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aDataFieldControl'],
    function(ADataFieldControl) {
        var DataEdit = ADataFieldControl.extend({

            className: "DataEdit",
            classGuid: "affff8b1-10b0-20a6-5bb5-a9d88334b48e",
            metaFields: [],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                this._super(cm,params);
                this.params = params;
            }
        });
        return DataEdit;
    }
);