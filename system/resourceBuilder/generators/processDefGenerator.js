/**
 * Created by staloverov on 10.03.2016.
 */
'use strict';
var fs = require('fs');

class Builder{
    constructor(engine){
        this.wfe = engine;
        this.defintions = [];
        this.addFirstDefinition();
        this.savePath = './';
    }

    addFirstDefinition(){
        var wfe = this.wfe;
        var def = wfe.newProcessDefinition();
        def.name('First test process');
        def.definitionID("8349600e-3d0e-4d4e-90c8-93d42c443ab3");
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

        this.defintions.push(def);
    }

    serialize(definition) {
        var _obj = definition.pvt.db.serialize(definition, true);

        if (!fs.existsSync(this.savePath)) {
            fs.mkdirSync(this.savePath)
        }

        if (_obj) {
            fs.writeFileSync(this.savePath + definition.definitionID() + '.json', JSON.stringify(_obj));
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
            _instance.defintions.forEach(function(definition){
                _instance.serialize(definition);
                _count++;

                if (_count == _instance.defintions.length) {
                    resolve()
                }
            })
        })
    }
}

if (module) {
    module.exports = Builder;
}
