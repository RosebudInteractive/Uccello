var _proto1 = __dirname + '/../../../ProtoOne/public/ProtoControls/';

var _protoOneCtrls =  [
    { className: 'DbNavigator', component: _proto1 + 'dbNavigator', guid: '38aec981-30ae-ec1d-8f8f-5004958b4cfa' },
    { className: 'MatrixGrid', component: _proto1 + 'matrixGrid', guid: '827a5cb3-e934-e28c-ec11-689be18dae97' },
    { className: 'PropEditor', component: _proto1 + 'propEditor', guid: 'a0e02c45-1600-6258-b17a-30a56301d7f1' },
    { className: 'GenVContainer', component: _proto1 + 'genVContainer', viewset: true, guid: 'b75474ef-26d0-4298-9dad-4133edaa8a9c' },
    { className: 'GenForm', component: _proto1 + 'genForm', viewset: true, guid: '29bc7a01-2065-4664-b1ad-7cc86f92c177' },
    { className: 'GenLabel', component: _proto1 + 'genLabel', viewset: true, guid: '151c0d05-4236-4732-b0bd-ddcf69a35e25' },
    { className: 'GenDataGrid', component: _proto1 + 'genDataGrid', viewset: true, guid: '55d59ec4-77ac-4296-85e1-def78aa93d55' },
    { className: 'GenButton', component: _proto1 + 'genButton', viewset: true, guid: 'bf0b0b35-4025-48ff-962a-1761aa7b3a7b' },
    { className: 'GenDataEdit', component: _proto1 + 'genDataEdit', viewset: true, guid: '567cadd5-7f9d-4cd8-a24d-7993f065f5f9' }
];

var register = function(constructHolder){
    _protoOneCtrls.forEach(function(control){
        var _registeredGuid = UCCELLO_CONFIG.classGuids[control.className];
        if (_registeredGuid && (_registeredGuid != control.guid)) {
            throw new Error('Class [' + control.className + '] already registered with other guid')
        } else {
            UCCELLO_CONFIG.classGuids[control.className] = control.guid
        }

        var Class = require(control.component);
        if (Class) {
            constructHolder.addComponent(Class, {});
        }
    });
};

if (module) {
    module.exports.register = register;
}