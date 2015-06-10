if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var CContainer = Container.extend({

            className: "CContainer",
            classGuid: UCCELLO_CONFIG.classGuids.CContainer,
            metaFields: [],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            createButtons: function(numButtons){
                numButtons = parseInt(numButtons);
                var cm = this.getControlMgr(),
                    vc = cm.getContext(),
                    ch = vc.getConstructorHolder(),
                    classGuid = 'af419748-7b25-1633-b0a9-d539cada8e0d';

                for(var i=0; i<numButtons; i++) {
                    var obj = new (ch.getComponent(classGuid).constr)(cm, {
                            parent: this,
                            colName: "Children",
                            ini:{
                                fields:{
                                    Id:i+1,
                                    Name:'Button'+(i+1),
                                    Caption:'Button'+(i+1),
                                    Left:10,
                                    Top:(i+1)*20
                                }
                            }
                    });
                    cm.userEventHandler(obj, function () {});
                }

            }
        });
        return CContainer;
    }
);