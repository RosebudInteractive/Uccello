/**
 * Created by kiknadze on 10.05.2016.
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aDataFieldControl'],
    function(ADataFieldControl) {
        var DataCombo = ADataFieldControl.extend({

            className: "LookupCombo",
            classGuid: UCCELLO_CONFIG.classGuids.LookupCombo,
            metaFields: [{
                fname: "LookupDataset", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.DatasetBase
                }},
                {fname: "DisplayField", ftype: "string"}
            ],

            /**
             * Инициализация объекта
             * @param cm на контрол менеджер
             * @param guid гуид объекта
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },
            lookupDataset: function(value) {
                return this._genericSetter("LookupDataset", value);
            },
            displayField: function(value) {
                return this._genericSetter("DisplayField", value);
            }
        });
        return DataCombo;
    }
);
