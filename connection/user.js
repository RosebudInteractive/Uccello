if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

/**
 * Модуль User
 * @module User
 */
define(
    ['../controls/aComponent'],
    function(AComponent) {

    var User = AComponent.extend(/** @lends module:User.User.prototype */{

        className: "User",
        classGuid: "dccac4fc-c50b-ed17-6da7-1f6230b5b055",
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

            if (params==undefined) return; // в этом режиме только создаем метаинфо
            this.pvt.data = {};
            //this.pvt.name = params.name;
            //this.pvt.loginTime = false;
            //this.pvt.isAuthenticated = false;
            this.pvt.sessions = {};
        },

        /**
         * Добавить сессию пользователя
         * @param session
         */
        addSession: function(session){
            this.pvt.sessions[session.getId()] = {item:session, date:new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')};
        },

        getSession: function(id){
            return this.pvt.sessions[id] ? this.pvt.sessions[id].item : null;
        },

        getSessions: function(){
            return this.pvt.sessions;
        },

        countSession: function(){
            return Object.keys(this.pvt.sessions).length;
        },
		
		getData: function() {
			return this.pvt.data;
		},

        /**
         * Удалить сессию по ID
         * @param id
         */
        removeSession: function(id){
            if (this.pvt.sessions[id])
                delete this.pvt.sessions[id];
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
    return User;
});