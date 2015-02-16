/**
 * —интаксис:
 * Class.extend(props)
 * Class.extend(props, staticProps)
 * Class.extend([mixins], props)
 * Class.extend([mixins], props, staticProps)
*/
!function() {

  window.Class = function() { /* вс€ маги€ - в Class.extend */  };


  Class.extend = function(props, staticProps) {

    var mixins = [];

    // если первый аргумент -- массив, то переназначить аргументы    
    if ({}.toString.apply(arguments[0]) == "[object Array]") {
      mixins = arguments[0];
      props = arguments[1];
      staticProps = arguments[2];
    }

    // эта функци€ будет возвращена как результат работы extend
    function Constructor() {
      this.init && this.init.apply(this, arguments);
    }

    // this -- это класс "перед точкой", дл€ которого вызван extend (Animal.extend)
    // наследуем от него:
    Constructor.prototype = Class.inherit(this.prototype);

    // constructor был затЄрт вызовом inherit
    Constructor.prototype.constructor = Constructor;

    // добавим возможность наследовать дальше
    Constructor.extend = Class.extend;

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

  // fnTest -- регул€рное выражение, 
  // которое провер€ет функцию на то, есть ли в еЄ коде вызов _super
  // 
  // дл€ его объ€влени€ мы провер€ем, поддерживает ли функци€ преобразование
  // в код вызовом toString: /xyz/.test(function() {xyz})
  // в редких мобильных браузерах -- не поддерживает, поэтому регэксп будет /./
  var fnTest = /xyz/.test(function() {xyz}) ? /\b_super\b/ : /./;


  // копирует свойства из props в targetPropsObj
  // третий аргумент -- это свойства родител€
  // 
  // при копировании, если вы€сн€етс€ что свойство есть и в родителе тоже,
  // и €вл€етс€ функцией -- его вызов оборачиваетс€ в обЄртку,
  // котора€ ставит this._super на метод родител€, 
  // затем вызывает его, затем возвращает this._super
  function copyWrappedProps(props, targetPropsObj, parentPropsObj) {
    if (!props) return;

    for (var name in props) {
      if (typeof props[name] == "function"
        && typeof parentPropsObj[name] == "function"
        && fnTest.test(props[name])) {
        // скопировать, завернув в обЄртку
        targetPropsObj[name] = wrap(props[name], parentPropsObj[name]);
      } else {
        targetPropsObj[name] = props[name];
      }
    }

  }

  // возвращает обЄртку вокруг method, котора€ ставит this._super на родител€
  // и возвращает его потом 
  function wrap(method, parentMethod) {
    return function() {
      var backup = this._super;

      this._super = parentMethod;

      try {
        return method.apply(this, arguments);
      } finally {
        this._super = backup;
      }
    }
  }

  // эмул€ци€ Object.create дл€ старых IE
  Class.inherit = Object.create || function(proto) {
    function F() {}
    F.prototype = proto;
    return new F;
  };
}();