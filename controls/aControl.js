if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}


//
define(
	['./aComponent'],
	function(AComponent) {
		var AControl = AComponent.extend({
		
			className: "AControl",
			classGuid: UCCELLO_CONFIG.classGuids.AControl,
            metaFields: [
                {fname:"Top", ftype:"int"},
                {fname:"Left", ftype:"int"},
                {fname:"Width", ftype:"int"},
                {fname:"Height", ftype:"int"},
                {fname:"LayoutProp", ftype:"string"},
                {fname:"PadLeft", ftype:"string"},
                {fname:"PadRight", ftype:"string"},
                {fname:"PadTop", ftype:"string"},
                {fname:"PadBottom", ftype:"string"},
                {fname:"HorizontalAlign", ftype:"string"},
                {fname:"VerticalAlign", ftype:"string"},
                {fname:"MinWidth", ftype:"string"},
                {fname:"MinHeight", ftype:"string"},
                {fname:"MaxWidth", ftype:"string"},
                {fname:"MaxHeight", ftype:"string"},
                {fname:"Enabled", ftype:"boolean"},
                {fname:"Visible", ftype:"boolean"},
                {fname:"TabStop", ftype:"boolean"}
            ],
				
			init: function(cm,params){
				UccelloClass.super.apply(this, [cm, params]);
			},

            /**
             * Рендер контрола
             * @param viewset
             * @param options
             */
            irender: function(viewset, options) {
                viewset.render.apply(this, [options]);
            },

            top: function(value) {
                return this._genericSetter("Top", value);
            },

            left: function(value) {
                return this._genericSetter("Left", value);
            },

            width: function(value) {
                return this._genericSetter("Width", value);
            },

            height: function(value) {
                return this._genericSetter("Height", value);
            },

            layoutProp: function(value) {
                return this._genericSetter("LayoutProp", value);
            },

            padLeft: function(value) {
                return this._genericSetter("PadLeft", value);
            },

            padRight: function(value) {
                return this._genericSetter("PadRight", value);
            },

            padTop: function(value) {
                return this._genericSetter("PadTop", value);
            },

            padBottom: function(value) {
                return this._genericSetter("PadBottom", value);
            },

            horizontalAlign: function(value) {
                return this._genericSetter("HorizontalAlign", value);
            },

            verticalAlign: function(value) {
                return this._genericSetter("VerticalAlign", value);
            },

            minWidth: function(value) {
                return this._genericSetter("MinWidth", value);
            },

            maxWidth: function(value) {
                return this._genericSetter("MaxWidth", value);
            },

            minHeight: function(value) {
                return this._genericSetter("MinHeight", value);
            },

            maxHeight: function(value) {
                return this._genericSetter("MaxHeight", value);
            },

            enabled: function(value) {
                return this._genericSetter("Enabled", value);
            },

            visible: function(value) {
                return this._genericSetter("Visible", value);
            },

            tabStop: function(value) {
                return this._genericSetter("TabStop", value);
            },

            next: function(checkTabStop) {
                checkTabStop = (checkTabStop === undefined ? true : false);
                return this._next(this, false, true, false);
            },

            prev: function(checkTabStop) {
                checkTabStop = (checkTabStop === undefined ? true : false);
                return this._next(this, false, true, true);
            },

            /**
             * Поиск следующего контрола для табстопа
             * @param startedAt {AControl} - элемент с которого началась рекурсия
             * @param rootPassed {boolean} - был ли при обходе уже пройден корневой элемент
             * @param checkTabStop {boolean} - учитывать признак таб-стоп
             * @param reverce {boolean} - обход в обратном порядке
             * @returns {AControl}
             * @private
             */
            _next: function(startedAt, rootPassed, checkTabStop, reverce) {
                console.log("Next for: " + this.name())
                if (startedAt == this) return this;

                var isContainer = this.isInstanceOf(UCCELLO_CONFIG.classGuids.Container, false);

                var parent = this.getParent();
                if (parent) {
                    // получим след. контрол
                    var parentChildren = parent.getCol('Children');

                    var thisIdx = parentChildren.indexOf(this);
                    var nextControl = null;
                    // Если это не последний элемент, то получаем следующий
                    if (((thisIdx < parentChildren.count() - 1) && !reverce ) || (thisIdx == 0 && reverce)) {
                        if (!reverce)
                            nextControl = parentChildren.get(thisIdx + 1);
                        else
                            nextControl = parentChildren.get(thisIdx - 1);
                    } else // последний элемент коллекции
                        return parent._next(startedAt, rootPassed, checkTabStop, reverce);

                    // Если следующий элемент разрешает таб-стоп, то нашли то, что искали
                    // иначе возвращаем, результат вычислений следующего контрола
                    var nextTabStop = (nextControl.tabStop() === undefined ? true : nextControl.tabStop()) || (!checkTabStop);
                    if (nextTabStop) {
                        var nextIsContainer = nextControl.isInstanceOf(UCCELLO_CONFIG.classGuids.Container, false);
                        // Но если это контейнер, то надо спросить первого дитя
                        if (!nextIsContainer)
                            return nextControl;
                        else
                            return nextControl._firstChild(startedAt, rootPassed, checkTabStop, reverce);
                    }
                    else return nextControl._next(startedAt, rootPassed, checkTabStop, reverce);
                } else {
                    // дошли до корня
                    if (!rootPassed) rootPassed = true;
                    else return startedAt;
                    return this._firstChild(startedAt, rootPassed, checkTabStop, reverce);
                }

                return startedAt;
            },

            /**
             * Пытается найти первый элемент внутри контейнера для табстопа
             * Если табстоп у контейнера отключен, то переводит на поиск следующего элемента
             * @param startedAt {AControl} - элемент с которого началась рекурсия
             * @param rootPassed {boolean} - был ли при обходе уже пройден корневой элемент
             * @param checkTabStop {boolean} - учитывать признак таб-стоп
             * @param reverce {boolean} - обход в обратном порядке
             * @returns {AControl}
             * @private
             */
            _firstChild: function(startedAt, rootPassed, checkTabStop, reverce) {
                console.log("firstChild for: " + this.name())
                var thisChildren = this.getCol('Children');
                var thisTabStop = (this.tabStop() === undefined ? true : this.tabStop()) || (!checkTabStop);
                if (thisChildren.count() == 0 || !thisTabStop) return this._next(startedAt, rootPassed, checkTabStop, reverce);
                else {
                    var child = thisChildren.get(0);
                    if (reverce)
                        child = thisChildren.get(thisChildren.count() - 1);
                    var tabStop = (child.tabStop() === undefined ? true : child.tabStop()) || (!checkTabStop);
                    if (tabStop) {
                        var isContainer = child.isInstanceOf(UCCELLO_CONFIG.classGuids.Container, false);
                        if (isContainer) return child._firstChild(startedAt, rootPassed, checkTabStop, reverce);
                        else return child;
                    } else
                        return child._next(startedAt, rootPassed, checkTabStop, reverce);
                }
            }


		});
		return AControl;
	}
);