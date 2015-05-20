/**
 * Implementation of functionality which ensures data type control for fields of Uccello objects.
 * All data types inherit from the BaseType object.
 *
 * @fileOverview The Data type Objects.
 * @class DataTypes
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    //var Class = require('class.extend');
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [],
    function () {
        
        var fldTypeCodes;
        
        var BaseType = UccelloClass.extend({
            /**
             * The Base Type all Type objects inherit from.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @constructor
             */
            init: function (typeObj, refResolver) {
                this._is_complex = false;
                this._refResolver = refResolver;
                this._deserialize(typeObj);
            },
            
            /**
             * Data Type name.
             * Ex.: "string", "int", etc.
             * 
             * @return {Strng} Data type name
             */
            typeName: function () {
                return this._fldType;
            },
            
            /**
             * Data Type code.
             * 
             * @return {Integer} Data type code
             */
            type: function () {
                return this._fldTypeCode;
            },

            /**
             * Data Type hash code.
             * Uniquely represents data type instance.
             * 
             * @return {Strng} The hash code
             */
            hash: function () {
                return this._fldType;
            },

            /**
             * True if value of the data type is stored as a structure but not a simple value 
             * 
             * @return {Boolean} True if value is complex
             */
            isComplex: function () {
                return this._is_complex;
            },

            /**
             * Checks if value is correct.
             * 
             * @param {Any}       val A value to be checked
             * @param {Object}    errObj An Object which contains error info (checkVal fills it if value is incorrect)
             * @param {String}    errObj.errMsg Error message
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj) {
                return true;
            },

            /**
             * Checks if val1 is equal to val2.
             * 
             * @param {Any}       val1 First value
             * @param {Any}       val2 Second value
             * @return {Boolean} True if values are equal
             */
            isEqual: function (val1, val2) {
                return val1 === val2;
            },

            /**
             * Returns a serialized representation of the data type
             * 
             * @return {Object} Serialized representation
             */
            serialize: function () {
                return { type: this._fldType };
            },

            /**
             * Converts this data type from the serialized representation 
             * to the internal one (only constructor can invoke it)
             * 
             * @param {String|Object} val Serialized representation of this data type
             * @private
             */
            _deserialize: function (val) {
                if (typeof (val) === "string") {
                    this._fldType = val;
                } else {
                    this._fldType = val.type;
                };
                this._fldTypeCode = fldTypeCodes[this._fldType].code;
            },

            /**
             * Converts a Value of this data type from the internal representation
             * to the serialized one
             *
             * @param {Any}     val An internal value
             * @return {Object} Serialized representation of the value
             */
            getSerializedValue: function (val) {
                return val;
            },

            /**
             * Converts a Value of this data type from the internal representation
             * to "end-user" one
             *
             * @param {Any}   val An internal value
             * @return {Object} "End-user" representation of the value
             */
            getValue: function (val) {
                return val;
            },

            /**
             * Converts a Value of this data type from the serialized
             * or "end-user" representation to the internal one
             * 
             * @param {Any}     val A value of this data type
             * @param {String}  fldName A field name of the value
             * @param {Object}  obj An MemProtoObject which fldName belongs to 
             * @param {Boolean} withCheckVal True if the value needs to be checked
             * @throws Will throw an error if the value isn't correct
             * @return {Object} Internal representation of the value
             */
            setValue: function (val, fldName, obj, withCheckVal) {
                if (withCheckVal) {
                    var errObj = {};
                    if (!this.checkVal(val))
                        if (errObj.errMsg)
                            throw new Error(errObj.errMsg);
                        else
                            throw new Error("Inavalid value: \"" + val + "\".");
                };
                return val;
            }
        });
        
        var IntegerType = BaseType.extend({
            /**
             * The Integer Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                //this._super(typeObj, refResolver);
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });
        
        var StringType = BaseType.extend({
            /**
             * The String Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                //this._super(typeObj, refResolver);
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });
        
        var FloatType = BaseType.extend({
            /**
             * The Float Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                //this._super(typeObj, refResolver);
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });
        
        var DateTimeType = BaseType.extend({
            /**
             * The Date-time Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                //this._super(typeObj, refResolver);
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });
        
        var BooleanType = BaseType.extend({
            /**
             * The Boolean Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                //this._super(typeObj, refResolver);
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });

        var DecimalType = BaseType.extend({
            /**
             * The Decimal Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                //this._super(typeObj, refResolver);
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });

        var RefType = BaseType.extend({
            /**
             * The Reference Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                //this._super(typeObj, refResolver);
                UccelloClass.super.apply(this, [typeObj, refResolver]);
                this._is_complex = true;
            },

            /**
             * Data Type hash code.
             * Uniquely represents data type instance.
             * 
             * @return {Strng} The hash code
             */
            hash: function () {
                //var result = this._super();
                var result = UccelloClass.super.apply(this, []);

                if ((this._refResolver) &&
                        (typeof (this._refResolver.getGuid) === "function"))
                    result += "_" + this._refResolver.getGuid();

                result += "_" + this._resElemType;
                if (this._external) {
                    result += "_" + this._resType;
                };
                if (this._strict) {
                    result += "strict";
                };
                return result;
            },

            /**
             * Returns a serialized representation of the data type
             * 
             * @return {Object} Serialized representation
             */
            serialize: function () {
                //var result = this._super();
                var result = UccelloClass.super.apply(this, []);

                result.res_elem_type = this._resElemType;
                if (this._external) {
                    result.external = this._external;
                    result.res_type = this._resType;
                };
                if (this._strict) {
                    result.strict = this._strict;
                };
                return result;
            },

            /**
             * Converts this data type from the serialized representation 
             * to the internal one (only constructor can invoke it)
             * 
             * @param {String|Object}                    val Serialized representation of this data type
             * @param {Boolean} [val.external=false]     True if ref is external
             * @param {Boolean} [val.res_type=null]      Resource type GUID
             * @param {Boolean} [val.res_elem_type=null] Resource element type GUID
             * @param {Boolean} [val.strict=false]       True if ref type should be checked strictly
             * @throws                                   Will throw an error if the value isn't correct
             * @private
             */
            _deserialize: function (val) {
                //this._super(val);
                UccelloClass.super.apply(this, [val]);

                this._external = false;
                this._resType = null;
                this._resElemType = null;
                this._strict = false;

                if (val instanceof Object) {
                    if (typeof (val.external) === "boolean") {
                        this._external = val.external;
                    };
                    if (typeof (val.res_type) === "string") {
                        this._resType = val.res_type;
                    };
                    if (typeof (val.res_elem_type) === "string") {
                        this._resElemType = val.res_elem_type;
                    };
                    if (typeof (val.strict) === "boolean") {
                        this._strict = val.strict;
                    };
                };

                if (this._resElemType !== null) {
                    if (this._external && (this._resType === null)) {
                        throw new Error("Undefined \"ResType\" field in [ref] type.");
                    };
                } else {
                    throw new Error("Undefined \"ResElemType\" field in [ref] type.");
                };
            },

            /**
             * Converts a Value of this data type from the internal representation
             * to the serialized one.
             * Serialized value:
             *   for exteranl ref - object: {guidRes,guidElem}
             *   for internal ref - string: guidElem
             * @param {Any}     val An internal value
             * @param {Boolean} [use_resource_guid=false] If true resource GUIDs are serialized
             * @return {Object} Serialized representation of the value
             */
            getSerializedValue: function (val, use_resource_guid) {
                var result = val;
                if (val)
                    if (this._external) {
                        result = { guidRes: val.guidRes, guidElem: val.guidElem };
                        if ((!use_resource_guid) && val.guidInstanceRes && val.guidInstanceElem)
                            result = {
                                guidInstanceRes: val.guidInstanceRes,
                                guidInstanceElem: val.guidInstanceElem
                            };
                    } else{
                        result = { guidElem: val.guidElem };
                        if ((!use_resource_guid) && val.guidInstanceElem)
                            result = val.guidInstanceElem;
                    };
                return result;
            },

            /**
             * Converts a Value of this data type from the internal representation
             * to "end-user" one.
             * "End-user" representation is refernce to the MemProtoObject instance
             *
             * @param {Any}   val An internal value
             * @return {Object} "End-user" representation of the value
             */
            getValue: function (val) {
                return val ? val.objRef : null;
            },

            /**
             * Checks if val1 is equal to val2.
             * 
             * @param {Any}       val1 First value (could be MemProtoObj or serialized reference)
             * @param {Any}       val2 Second value (could be MemProtoObj or serialized reference)
             * @return {Boolean} True if values are equal
             */
            isEqual: function (val1, val2) {

                if (val1 && val2) {
                    if (val1.objRef && val2.objRef)
                        return val1.objRef === val2.objRef;

                    if ((!val1.objRef) && (!val2.objRef)) {
                        if (this._external)
                            return (val1.guidRes === val2.guidRes)
                                && (val1.guidElem === val2.guidElem)
                                && (val1.guidInstanceRes === val2.guidInstanceRes)
                                && (val1.guidInstanceElem === val2.guidInstanceElem);
                        else
                            return (val1.guidElem === val2.guidElem)
                                && (val1.guidInstanceElem === val2.guidInstanceElem);
                    };
                }
                else
                    return (!val1) && (!val2);
                return false;
            },

            /**
             * Checks if value is correct.
             * 
             * @param {Any}       val A value to be checked (could be MemProtoObj or serialized reference)
             * @param {Object}    errObj An Object which contains error info (checkVal fills it if value is incorrect)
             * @param {String}    errObj.errMsg Error message
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj, obj) {
                var result = true;
                var msg;
                if (!val.objRef) {
                    // Check for the NULL reference which is valid as well
                    result = (val.objRef === null) && (val.guidElem === null) &&
                        ((!val.is_external) || (val.guidRes === null));

                    if (!result) {
                        result = typeof (val.guidElem) === "string";
                        if (val.is_external)
                            result = result && (typeof (val.guidRes) === "string");
                        if (!result) {
                            msg = "Invalid reference: \"" +
                                    JSON.stringify(this.getSerializedValue(val)) + "\".";
                        };
                    };
                } else {
                    if (!val.objRef.isInstanceOf(this._resElemType, this._strict)) {
                        msg = "Invalid object type in reference.";
                        result = false;
                    } else {
                        if (val.is_external) {
                            if (!val.objRef.getRoot().isInstanceOf(this._resType, this._strict)) {
                                msg = "Invalid object resorce type in external reference.";
                                result = false;
                            };
                        } else {
                            if (val.objRef.getRoot() != obj.getRoot()) {
                                msg = "Object belongs to another resource.";
                                result = false;
                            };
                        };
                    };
                };

                if ((!result) && errObj)
                    errObj.errMsg = msg;
                return result;
            },

            /**
             * Converts a Value of this data type from the serialized
             * or "end-user" representation to the internal one.
             * Using [refResolver] interface resolves reference and adds it to the link storage
             * Internal reference representation:
             *   guidRes          - Resource GUID (for external ref)
             *   guidInstanceRes  - GUID of the resource instanse (for external ref)
             *   guidElem         - Resource element GUID
             *   guidInstanceElem - GUID of the resource element instanse
             *   objRef           - reference to the referenced MemProtoObject (NULL if ref is unresolved)
             *   is_external      - TRUE if ref is external
             * 
             * @param {Any}     val A value of this data type (could be MemProtoObj or serialized reference)
             * @param {String}  fldName A field name of the value
             * @param {Object}  obj A MemProtoObject which [fldName] belongs to 
             * @param {Boolean} withCheckVal True if the value needs to be checked
             * @throws          Will throw an error if the value isn't correct
             * @return {Object} Internal representation of the value
             */
            setValue: function (val, fldName, obj, withCheckVal) {

                var result = {
                    guidRes: null,
                    guidInstanceRes: null,
                    guidElem: null,
                    guidInstanceElem: null,
                    objRef: null,
                    is_external: this._external
                };

                if (val)
                    if (typeof (val.getObjType) === "function") {
                        // Val is memProtoObj
                        result.objRef = val;
                        result.guidElem = val.getGuidRes();
                        result.guidRes = val.getRoot().getGuidRes();
                        result.guidInstanceElem = val.getGuid();
                        result.guidInstanceRes = val.getRoot().getGuid();
                    } else {
                        // Val is serialized reference
                        if (result.is_external) {
                            result.guidInstanceRes = val.guidInstanceRes ? val.guidInstanceRes : null;
                            if (result.guidInstanceRes)
                                result.guidRes = obj.parseGuid(result.guidInstanceRes).guid;
                            else
                                result.guidRes = val.guidRes ? val.guidRes : null;

                            result.guidInstanceElem = val.guidInstanceElem ? val.guidInstanceElem : null;
                            if (result.guidInstanceElem)
                                result.guidElem = obj.parseGuid(result.guidInstanceElem).guid;
                            else
                                result.guidElem = val.guidElem ? val.guidElem : null;
                        } else {
                            if (typeof (val) === "string") {
                                result.guidInstanceElem = val;
                                result.guidElem = obj.parseGuid(result.guidInstanceElem).guid;
                                if (result.guidElem == result.guidInstanceElem)
                                    result.guidInstanceElem = null; //It's most likely "guidElem"
                            } else {
                                result.guidInstanceElem = val.guidInstanceElem ? val.guidInstanceElem : null;
                                if (result.guidInstanceElem)
                                    result.guidElem = obj.parseGuid(result.guidInstanceElem).guid;
                                else
                                    result.guidElem = val.guidElem ? val.guidElem : null;
                            }
                        };
                    };

                if (!result.objRef)
                    this._refResolver.resolveRef(result, obj);

                if (withCheckVal) {
                    var errObj = {};
                    if (!this.checkVal(result, errObj, obj))
                        throw new Error(errObj.errMsg);
                };

                this._refResolver.addLink(obj, result, fldName, this);
                return result;
            }
        });

        var typeObjects = {};

        /**
         * Data Type Factory.
         * Returns an existing data type object or creates a new instance.
         * Decision (whether we use the existing object or use a new one) is based on hash() function
         * 
         * @param {String|Object} typeObj Serialized data type representation
         * @param {Object}        refResolver An Object which implements link resolver interface
         * @return {Object}       Data type object
         * @constructor
         */
        function GetFldTypeUniq(typeObj, refResolver) {

            var result = null;
            var key = "unknown";
            if (typeof (typeObj) === "string") {
                key = typeObj;
            } else {
                if ((typeObj instanceof Object) && (typeof(typeObj.type) === "string")) {
                    key = typeObj.type;
                } else {
                    throw new Error("Unknown type: \"" + JSON.stringify(typeObj) + "\".");
                };
            };

            if (! fldTypeCodes[key])
                throw new Error("Unknown type: \"" + JSON.stringify(typeObj) + "\".");

            result = new fldTypeCodes[key].constructor(typeObj, refResolver);
            var hash = result.hash();

            if (! typeObjects[hash]) {
                typeObjects[hash] = result;
            } else {
                result = typeObjects[hash];
            };

            return result;
        };
        
        fldTypeCodes = {
            "int": { code: 0, constructor: IntegerType },
            "string": { code: 1, constructor: StringType },
            "float": { code: 2, constructor: FloatType },
            "datetime": { code: 3, constructor: DateTimeType },
            "ref": { code: 4, constructor: RefType },
            "decimal": { code: 5, constructor: DecimalType },
            "boolean": { code: 6, constructor: BooleanType },
            "event": { code: 7, constructor: StringType },
            "integer": { code: 8, constructor: IntegerType },
            "date": { code: 9, constructor: DateTimeType },
            "time": { code: 10, constructor: DateTimeType },
            "timestamp": { code: 11, constructor: DateTimeType }
    };



        var MetaTypes = {
            createTypeObject: GetFldTypeUniq
        };
        
        return MetaTypes;
    }
);
