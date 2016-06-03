/**
 * Created by staloverov on 10.03.2016.
 */
'use strict';
var fs = require('fs');

var Definitions = {
    names: {
        forSimpleTaskDef: 'Simple Task Definition'
    },

    forSimpleTaskDef : function(engine) {
        var _definition = engine.newTaskDefinition();
        _definition.definitionId('cbf35df0-8317-4f2f-8728-88736251ff0b');
        _definition.name(this.names.forSimpleTaskDef);
        var _start = _definition.addStartEvent('start');
        var _task1 = _definition.addTaskStage('task1');
        var _task2 = _definition.addTaskStage('task2');
        var _task3 = _definition.addTaskStage('task3');
        var _end = _definition.addEndEvent('end');

        _definition.connect(_start, _task1);
        _definition.connect(_task1, _task2);
        _definition.connect(_task2, _task3);
        _definition.connect(_task3, _end);

        return _definition;
    }
};

class Builder{
    constructor(engine){
        this.wfe = engine;
        this.definitions = [];
        this.addFirstDefinition();
        this.definitions.push(Definitions.forSimpleTaskDef(engine));
        this.savePath = './';
    }

    addFirstDefinition(){
        var wfe = this.wfe;
        var def = wfe.newProcessDefinition();
        def.name('First test process');
        def.definitionId("8349600e-3d0e-4d4e-90c8-93d42c443ab3");
        def.addParameter("CurrentObj").value("");
        def.addParameter("IsDone").value(false);

        var taskStart = def.addUserTask("StartTask", {
            moduleName: 'scriptTask',
            methodName: 'execObjMethodCreate'
        });

        var req = taskStart.addRequest("ObjCreateRequest");
        req.addParameter("objURI");
        req.addParameter("func");
        req.addParameter("args");

        var taskObjEdit = def.addUserTask("ObjEditTask", {
            moduleName: 'scriptTask',
            methodName: 'execObjMethodEdit'
        });

        req = taskObjEdit.addRequest("ObjModifRequest");
        req.addParameter("objURI");
        req.addParameter("func");
        req.addParameter("args");

        var taskFin = def.addActivity('finish');

        var gateway = def.addExclusiveGateway('CheckIfDone');


        def.connect(taskStart, taskObjEdit);

        def.connect(taskObjEdit, gateway);
        def.connect(gateway, taskObjEdit, {
            moduleName: 'scriptTask',
            methodName: 'checkIfNotDone'
        });

        def.connect(gateway, taskFin, {
            moduleName: 'scriptTask',
            methodName: 'checkIfDone'
        });

        this.definitions.push(def);
    }


    serialize(definition) {
        var _obj = definition.pvt.db.serialize(definition, true);

        if (!fs.existsSync(this.savePath)) {
            fs.mkdirSync(this.savePath)
        }

        if (_obj) {
            fs.writeFileSync(this.savePath + definition.definitionId() + '.json', JSON.stringify(_obj));
            console.log('[%s] : {{ Процесс [%s] сохранен', (new Date()).toLocaleTimeString(), definition.name())
        }
    }

    static generate(savePath) {
        return new Promise(function(resolve, reject){
            if (fs.existsSync(UCCELLO_CONFIG.masaccioPath + 'engineSingleton.js')) {
                var EngineSingleton = require(UCCELLO_CONFIG.masaccioPath + 'engineSingleton')
            } else {
                reject(new Error('can not found WFE Engine'))
            }

            var _instance = new Builder(EngineSingleton.getInstance());
            _instance.savePath = savePath;
            var _count = 0;
            _instance.definitions.forEach(function(definition){
                _instance.serialize(definition);
                _count++;

                if (_count == _instance.definitions.length) {
                    resolve()
                }
            })
        })
    }
}

if (module) {
    module.exports = Builder;
}
