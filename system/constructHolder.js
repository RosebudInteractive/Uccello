if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [],
    function() {
        var ConstructHolder = UccelloClass.extend({

            init: function(){
                this.pvt = {};
                this._isNode = typeof exports !== 'undefined' && this.exports !== exports;
                this.pvt.remoteTypeProviders = [];
                this.pvt.localTypeProviders = [];
            },

            /**
             * Загрузить контролы
             * @param callback
             */
            loadControls: function(callback){
                var that = this;
                var scripts = [];
                var ctrls = UCCELLO_CONFIG.controls;
                that.pvt.components = {};

                //if (side == 'server') {
                if (this._isNode) {
                        for (var i = 0; i < ctrls.length; i++) {
                        var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath :UCCELLO_CONFIG.controlsPath;
                        var constr = require(path+ctrls[i].component);
                        var className = ctrls[i].className;
                        that.pvt.components[UCCELLO_CONFIG.classGuids[className]] = {constr:constr, viewsets:{}};
                    }
                    if (callback) callback();
                } else {
                    // собираем все нужные скрипты в кучу
                    for (var i = 0; i < ctrls.length; i++) {
                        var path = ctrls[i].isUccello ? UCCELLO_CONFIG.uccelloPath :UCCELLO_CONFIG.controlsPath
                        scripts.push(path+ctrls[i].component);
                        if (UCCELLO_CONFIG.viewSet && ctrls[i].viewset) {
                            var c = ctrls[i].className;
                            scripts.push(UCCELLO_CONFIG.viewSet.path+'v'+c.charAt(0).toLowerCase() + c.slice(1));
                        }
                    }

                    // загружаем скрипты и выполняем колбэк
                    require(scripts, function(){
                        var argIndex = 0;
                        for(var i=0; i<ctrls.length; i++) {
                            var className = ctrls[i].className;
                            that.pvt.components[UCCELLO_CONFIG.classGuids[className]] = {constr:arguments[argIndex], viewsets:{}};
                            argIndex++;
                            if (UCCELLO_CONFIG.viewSet && ctrls[i].viewset) {
                                that.pvt.components[UCCELLO_CONFIG.classGuids[className]].viewsets[UCCELLO_CONFIG.viewSet.name] = arguments[argIndex];
                                argIndex++;
                            }
                        }
                        callback();
                    });
                }
            },

            /**
             * Получить компонент по гуиду
             * @param guid
             */
            getComponent: function(guid) {
                return this.pvt.components[guid];
            },

            /**
             * Добавить компонент
             * @param obj
             */
            addComponent: function(obj, viewsets) {
                this.pvt.components[obj.prototype.classGuid] = { constr: obj, viewsets: viewsets ? viewsets : {}, code: null };
            },

            /**
             * Добавляет конструкторы компонентов от удаленных провайдеров
             * 
             * @param  {Array}    reqArr    Массив(Guid) типов требуемых конструкторов
             * @param  {Function} callback  Вызывается по завершении операции (аргумент: массив(Guid) типов, для которых конструкторы не найдены)
             */
            addRemoteComps: function (reqArr, callback) {
                var reqRest = [];

                for (var i = 0; i < reqArr.length; i++)
                    reqRest.push(reqArr[i]);

                var self = this;
                var providers = this.pvt.remoteTypeProviders;
                var curr_idx = 0;

                function processProvider(constrArr) {
                    var isFinished = true;
                    if (constrArr)
                        reqRest = self._processConstrList(reqRest, constrArr);
                    if ((reqRest.length > 0) && (curr_idx < providers.length)) {
                        isFinished = false;
                        providers[curr_idx++].getConstructors(reqRest, processProvider);
                    };
                    if (isFinished && callback)
                        setTimeout(function () {
                            callback(reqRest);
                        }, 0);
                };
                processProvider();
            },

            /**
             * Добавляет конструкторы компонентов от локальных провайдеров
             * 
             * @param  {Array}  reqArr    Массив(Guid) типов требуемых конструкторов
             * @return {Array}  Массив(Guid) типов, для которых конструкторы не найдены
             */
            addLocalComps: function (reqArr) {
                var reqRest = [];

                for (var i = 0; i < reqArr.length; i++)
                    reqRest.push(reqArr[i]);

                var providers = this.pvt.localTypeProviders;
                for (var i = 0; i < providers.length; i++) {
                    var constrArr = providers[i].getConstructors(reqRest);
                    if (constrArr.length > 0)
                        reqRest = this._processConstrList(reqRest, constrArr);
                    if (reqRest.length > 0)
                        break;
                };
                return reqRest;
            },

            /**
             * Возвращает конструкторы компонентов от локальных провайдеров,
             *  а также список не найденных конструкторов
             *
             * @param  {Array}  reqArr    Массив(Guid) типов требуемых конструкторов
             * @return {Object}
             *                 missing: Массив(Guid) типов, для которых конструкторы не найдены,
             *                 constr: Массив имеющихся конструкторов (элемент массива - пара Guid + Код конструктора)
             */
            getLocalComps: function (reqArr) {
                var reqRest = [];
                var constrArr = [];

                for (var i = 0; i < reqArr.length; i++)
                    reqRest.push(reqArr[i]);

                var providers = this.pvt.localTypeProviders;
                for (var i = 0; i < providers.length; i++) {
                    var arr = providers[i].getConstructors(reqRest);
                    if (arr.length > 0) {
                        reqRest = this._processConstrList(reqRest, arr, true);
                        Array.prototype.push.apply(constrArr, arr);
                    };
                    if (reqRest.length > 0)
                        break;
                };
                return { missing: reqRest, constr: constrArr };
            },

            /**
             * Обработка списка полученных от провайдера конструкторов
             * 
             * @param  {Array}    reqArr    Массив(Guid) типов требуемых конструкторов
             * @param  {Array}    constrArr Массив имеющихся конструкторов (элемент массива - пара Guid + Код конструктора)
             * @param  {Boolean}  [ignoreAdd=false] Если = true, то добавления конструктора не происходит
             * @return {Array}  Массив(Guid) типов, для которых пока еще не получены конструкторы
             */
            _processConstrList: function (reqArr, constrArr, ignoreAdd) {
                var reqObg = {};

                for (var i = 0; i < reqArr.length; i++)
                    reqObg[reqArr[i]] = true;

                for (var i = 0; i < constrArr.length ; i++) {
                    var guid = constrArr[i].guid;
                    if (!ignoreAdd)
                        this.addCompByConstr(guid, constrArr[i].code);
                    delete reqObg[guid];
                };
                return Object.keys(reqObg);
            },

            /**
             * Добавить провайдера типов
             * 
             * @param {Object}  provider         Провайдер
             * @param {Bool}    [is_local=false] Признак локального провайдера (по умолчанию провайдер удаленный)
             */
            addTypeProvider: function (provider, is_local) {
                var providers = is_local ? this.pvt.remoteTypeProviders : this.pvt.localTypeProviders;
                var isExists = false;
                for (var i = 0; (!isExists) && (i < providers.length) ; i++)
                    isExists = provider === providers[i];
                if (!isExists)
                    providers.push(provider);
            },

            /**
             * Добавить компонент, заданный кодом конструктора
             * 
             * @param {String}  classGuid Guid класса
             * @param {Object}  code      Код конструктора
             */
            addCompByConstr: function (classGuid, code) {
                var Constructor = null;
                eval(code);
                this.pvt.components[classGuid] = { constr: Constructor, viewsets: {}, code: code };
            }
        });
        return ConstructHolder;
    }
);