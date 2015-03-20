if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
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
                this._super(cm, params);
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