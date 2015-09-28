if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/container'],
    function(Container) {
        var LayersContainer = Container.extend({

            className: "LayersContainer",
            classGuid: UCCELLO_CONFIG.classGuids.LayersContainer,
            metaFields: [
                {fname:"TabNumber", ftype:"int"}
            ],

            init: function(cm,params){
                UccelloClass.super.apply(this, [cm, params]);
            },

            /**
             * Properties
             * @param value
             * @returns {*}
             */

            tabNumber: function(value) {
                return this._genericSetter("TabNumber", value);
            },

            /**
             * �������� ����� ������ ������� ������ ���������� ��� ��������
             * ���� ������� � ���������� ��������, �� ��������� �� ����� ���������� ��������
             * @param startedAt {AControl} - ������� � �������� �������� ��������
             * @param rootPassed {boolean} - ��� �� ��� ������ ��� ������� �������� �������
             * @param checkTabStop {boolean} - ��������� ������� ���-����
             * @param reverce {boolean} - ����� � �������� �������
             * @returns {AControl}
             * @private
             */
            _firstChild: function(startedAt, rootPassed, checkTabStop, reverce) {
                console.log("firstChild for: " + this.name())
                var thisChildren = this.getCol('Children');
                var thisTabStop = (this.tabStop() === undefined ? true : this.tabStop());
                if (thisChildren.count() == 0 || !thisTabStop) return this._next(startedAt, rootPassed, checkTabStop, reverce);
                else {
                    var child = thisChildren.get(this.tabNumber());
                    var tabStop = (child.tabStop() === undefined ? true : child.tabStop());
                    if (tabStop) {
                        var isContainer = child.isInstanceOf(UCCELLO_CONFIG.classGuids.Container, false);
                        if (isContainer) return child._firstChild(startedAt, rootPassed, checkTabStop, reverce);
                        else return child;
                    } else
                        return this._next(startedAt, rootPassed, checkTabStop, reverce);
                }
            }

        });
        return LayersContainer;
    }
);
