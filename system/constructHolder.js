if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [],
    function() {
        var ConstructHolder = Class.extend({

            init: function(){
                this.pvt = {};
            },

            /**
             * Загрузить контролы
             * @param callback
             */
            loadControls: function(callback){
                var that = this;
                var scripts = [];
                var ctrls = UCCELLO_CONFIG.controls;

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
                that.pvt.components = {};
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
                this.pvt.components[obj.prototype.classGuid] = {constr:obj, viewsets:viewsets?viewsets:{}};
            }
        });
        return ConstructHolder;
    }
);