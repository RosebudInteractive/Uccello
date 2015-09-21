if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/aControl'],
    function(AControl) {
        var DBNavigator = AControl.extend({

            className: "DbNavigator",
            classGuid: '38aec981-30ae-ec1d-8f8f-5004958b4cfa',
            metaFields: [
                {fname: "DataBase", ftype: "string"},
                {fname: "Level", ftype: "int"},
                {fname: "RootElem", ftype: "string"},
                {fname: "Nlevels", ftype: "int"},
                {fname: "TabNum", ftype: "int"}
            ],

            /**
             * Инициализация объекта
             * @param cm ссылка на контрол менеджер
             * @param params
             */
            init: function (cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
                this.params = params;
            },

            dataBase: function (value) {
                return this._genericSetter("DataBase", value);
            },

            level: function (value) {
                return this._genericSetter("Level", value);
            },

            rootElem: function (value) {
                return this._genericSetter("RootElem", value);
            },

            nlevels: function (value) {
                return this._genericSetter("Nlevels", value);
            },

            tabNum: function (value) {
                return this._genericSetter("TabNum", value);
            }
        });
        return DBNavigator;
});
