if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

/**
 * Модуль User2
 * @module User2
 */
define(
    ['./userinfo'],
    function(UserInfo) {

    var User2 = UserInfo.extend(/** @lends module:User2.User2.prototype */{

        className: "User2",
        classGuid: UCCELLO_CONFIG.classGuids.User2,
        metaFields: [],

        /**
         * Инициализация
         * @constructs
         */
        init: function(cm, params) {
            UccelloClass.super.apply(this, [cm, params]);
        }

    });
    return User2;
});