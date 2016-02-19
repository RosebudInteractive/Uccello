/**
 * Created by staloverov on 18.02.2016.
 */
'use strict';

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

const metaInfo = {
    SysResource : {
        ClassGuid : 'dc156f00-52bd-46ca-98e8-0ac6967ffd44',
        RootName : 'RootSysResource',
        RootGuid : '866db0f5-d312-4c10-9313-07d1c3fd352b',
        currentId : 0,
        getId : function(){
            this.currentId++;
            return this.currentId;
        }
    },
    SysResVer : {
        ClassGuid : 'a44a2754-a231-45e8-b483-afd57144a629',
        RootName : 'RootSysResVer',
        RootGuid : 'be4cc757-4cba-4046-8206-723618242f7c',
        currentId : 0,
        getId : function(){
            this.currentId++;
            return this.currentId;
        }
    },
    SysBuildRes : {
        ClassGuid : '039c1cb9-0fdf-49e9-8bb9-e720aa9fe9d1',
        RootName : 'RootSysBuildRes',
        RootGuid : 'e610fea3-5b38-44b5-aeab-e2d5fa084759',
        currentId : 0,
        getId : function(){
            this.currentId++;
            return this.currentId;
        }
    },
    SysResType : {
        ClassGuid : '44df18c7-646e-45ed-91ba-6b99acedf40b',
        RootName : 'RootSysResType',
        RootGuid : 'db56d8c4-d0e9-4cee-88b8-3038de6eee31',
        currentId : 0,
        getId : function(){
            this.currentId++;
            return this.currentId;
        }
    }
};

define([], function() {
    return class MetaInfo {
        static get SysResType() {return metaInfo.SysResType}

        static get SysResource() { return metaInfo.SysResource }
        static get SysResVer() { return metaInfo.SysResVer }
        static get SysBuildRes() { return metaInfo.SysBuildRes }
    }
});