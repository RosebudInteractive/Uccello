/**
 * Синтаксис:
 * UccelloClass.extend(props)
 * UccelloClass.extend(props, staticProps)
 * UccelloClass.extend([mixins], props)
 * UccelloClass.extend([mixins], props, staticProps)
 */
!function() {

  window.UccelloClass = function() { /* вся магия - в UccelloClass.extend */  };

  var Self = this;
  UccelloClass.super = null;

  UccelloClass.extend = function (props, staticProps) {

    var mixins = [];

    // если первый аргумент -- массив, то переназначить аргументы    
    if ({}.toString.apply(arguments[0]) == "[object Array]") {
      mixins = arguments[0];
      props = arguments[1];
      staticProps = arguments[2];
    }

    // эта функция будет возвращена как результат работы extend
    function Constructor() {
      this.init && this.init.apply(this, arguments);
    }

    // this -- это класс "перед точкой", для которого вызван extend (Animal.extend)
    // наследуем от него:
    Constructor.prototype = UccelloClass.inherit(this.prototype);

    // constructor был затёрт вызовом inherit
    Constructor.prototype.constructor = Constructor;

    // добавим возможность наследовать дальше
    Constructor.extend = UccelloClass.extend;

    // скопировать в Constructor статические свойства
    copyWrappedProps(staticProps, Constructor, this);

    // скопировать в Constructor.prototype свойства из примесей и props
    for (var i = 0; i < mixins.length; i++) {
      copyWrappedProps(mixins[i], Constructor.prototype, this.prototype);
    }
    copyWrappedProps(props, Constructor.prototype, this.prototype);

    return Constructor;
  };


  //---------- вспомогательные методы ----------

  // fnTest -- регулярное выражение, 
  // которое проверяет функцию на то, есть ли в её коде вызов _super
  // 
  // для его объявления мы проверяем, поддерживает ли функция преобразование
  // в код вызовом toString: /xyz/.test(function() {xyz})
  // в редких мобильных браузерах -- не поддерживает, поэтому регэксп будет /./
  //var fnTest = /xyz/.test(function () { xyz }) ? /\b_super\b/ : /./;
  var fnTest = /xyz/.test(function () { xyz }) ? /\bUccelloClass.super.apply\b/ : /./;

  // копирует свойства из props в targetPropsObj
  // третий аргумент -- это свойства родителя
  // 
  // при копировании, если выясняется что свойство есть и в родителе тоже,
  // и является функцией -- его вызов оборачивается в обёртку,
  // которая ставит this._super на метод родителя, 
  // затем вызывает его, затем возвращает this._super
  function copyWrappedProps(props, targetPropsObj, parentPropsObj) {
    if (!props) return;

    for (var name in props) {
      if (typeof props[name] == "function"
          && typeof parentPropsObj[name] == "function"
          && fnTest.test(props[name])) {
        // скопировать, завернув в обёртку
        targetPropsObj[name] = wrap(props[name], parentPropsObj[name]);
      } else {
        targetPropsObj[name] = props[name];
      }
    }

  }

  // возвращает обёртку вокруг method, которая ставит this._super на родителя
  // и возвращает его потом 
  function wrap(method, parentMethod) {
    return function() {
      ////var backup = this._super;
      var backup = Self.UccelloClass.super;

      ////this._super = parentMethod;
      Self.UccelloClass.super = parentMethod;

      try {
        return method.apply(this, arguments);
      } finally {
        ////this._super = backup;
        Self.UccelloClass.super = backup;
    }
    }
  }

  // эмуляция Object.create для старых IE
  UccelloClass.inherit = Object.create || function(proto) {
    function F() {}
    F.prototype = proto;
    return new F;
  };
}();