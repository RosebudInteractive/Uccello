if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль UserInfo
 * @module UserInfo
 */
define(
    ['../controls/aComponent'],
    function(AComponent) {

        var UserInfo = AComponent.extend(/** @lends module:UserInfo.UserInfo.prototype */{

            className: "UserInfo",
            classGuid: UCCELLO_CONFIG.classGuids.UserInfo,
            metaFields: [
                {fname:"Authenticated", ftype:"boolean"},
                {fname:"LoginTime", ftype:"time"}
            ],
            metaCols: [ {cname: "Sessions", ctype: "control"},  {cname: "VisualContext", ctype: "control"} ],

            /**
             * Инициализация
             * @constructs
             */
            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            // Properties
            loginTime: function(value) {
                return this._genericSetter("LoginTime",value);
            },

            // TODO сделать ReadOnly property
            authenticated: function(value) {
                return this._genericSetter("LoginTime",value);
            }
        });
        return UserInfo;
    });