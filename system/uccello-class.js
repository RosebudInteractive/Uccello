(function(){
  ////var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
    var initializing = false, fnTest = /xyz/.test(function () { xyz; }) ? /\bUccelloClass.super.apply\b/ : /.*/;

  // The base UccelloClass implementation (does nothing)
  this.UccelloClass = function(){};
 
  var Self = this;
  UccelloClass.super = null;
  // Create a new UccelloClass that inherits from this class
  UccelloClass.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            ////var tmp = this._super;
            var tmp = Self.UccelloClass.super;

            // Add a new ._super() method that is the same method
            // but on the super-class
            ////this._super = _super[name];
            Self.UccelloClass.super = _super[name];

            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            ////this._super = tmp;
            Self.UccelloClass.super = tmp;

            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function UccelloClass() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    UccelloClass.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    UccelloClass.prototype.constructor = UccelloClass;
 
    // And make this class extendable
    UccelloClass.extend = arguments.callee;
   
    return UccelloClass;
  };

  //I only added this line
  module.exports = UccelloClass;
})();
