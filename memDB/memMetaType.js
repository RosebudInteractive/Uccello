/**
 * Implementation of functionality which ensures data type control for fields of Uccello objects.
 * All data types inherit from the BaseType object.
 *
 * @fileOverview The Data type Objects.
 * @class DataTypes
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [],
    function () {
        
        var fldTypeCodes;
        
        var BaseType = UccelloClass.extend({

            prefix: "",

            key: "$base$",

            canAutoIncrement: false,

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
                return this.prefix + this._fldType +
                    (this._allowNull === false ? "_notNull" : "");
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
             * @param {String}    fldName A field name of the value
             * @param {Object}    obj An MemProtoObject which fldName belongs to 
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj, fldName, obj) {
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
             * Compares val1 and val2.
             * 
             * @param {Any}       val1 First value
             * @param {Any}       val2 Second value
             * @return {Integer} 0 - [val1===val2], 1- [val1 > val2], (-1) - [val1 < val2]
             */
            compare: function (val1, val2) {
                var res = 0;
                if (val1 !== val2)
                    if (val1 > val2)
                        res = 1;
                    else
                        res = -1;
                return res;
            },

            /**
             * Returns "allow Null" flag
             * 
             * @return {Boolean}
             */
            allowNull: function () {
                return this._allowNull;
            },

            /**
             * Returns a serialized representation of the data type
             * 
             * @return {Object} Serialized representation
             */
            serialize: function () {
                var result = { type: this._fldType };
                if (!this._allowNull)
                    result.allowNull = this._allowNull;
                return result;
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

                this._allowNull = true;
                if ((val instanceof Object) && (typeof (val.allowNull) === "boolean"))
                    this._allowNull = val.allowNull;
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
                    if (!this.checkVal(val, errObj, fldName, obj))
                        if (errObj.errMsg)
                            throw new Error(errObj.errMsg);
                        else
                            throw new Error("Inavalid value: \"" + val + "\".");
                };
                return val;
            }
        });
        
        var IntegerType = BaseType.extend({

            key: "int",

            canAutoIncrement: true,

            /**
             * The Integer Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });
        
        var StringType = BaseType.extend({

            key: "string",

            /**
             * The String Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            },

            /**
             * Data Type hash code.
             * Uniquely represents data type instance.
             * 
             * @return {Strng} The hash code
             */
            hash: function () {
                var result = UccelloClass.super.apply(this, []);
                return result +
                    (this._length < Infinity ? ("_" + this._length) : "");
            },

            /**
             * Returns a serialized representation of the data type
             * 
             * @return {Object} Serialized representation
             */
            serialize: function () {
                var result = UccelloClass.super.apply(this, []);
                if (this._length < Infinity)
                    result.length = this._length;
                return result;
            },

            /**
             * The length property
             * 
             * @return {Integer}
             */
            length: function () {
                return this._length;
            },

            /**
             * Converts this data type from the serialized representation 
             * to the internal one (only constructor can invoke it)
             * 
             * @param {String|Object} val Serialized representation of this data type
             * @private
             */
            _deserialize: function (val) {
                var result = UccelloClass.super.apply(this, [val]);

                this._length = Infinity;
                if ((val instanceof Object) && val.length)
                    if (typeof (val.length) === "number")
                        if (val.length > 0)
                            this._length = Math.floor(val.length);
                        else
                            throw new Error("Invalid value of string \"length\": " + val.length + ".");
                    else
                        throw new Error("Invalid value of string \"length\": " + val.length + ".");
            }
        });
        
        var FloatType = BaseType.extend({

            key: "float",

            /**
             * The Float Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });
        
        var DateTimeType = BaseType.extend({

            key: "datetime",

            /**
             * The Date-time Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                UccelloClass.super.apply(this, [typeObj, refResolver]);
                this._is_complex = true;
            },

            /**
             * Checks if val1 is equal to val2.
             * 
             * @param {Any}       val1 First value
             * @param {Any}       val2 Second value
             * @return {Boolean} True if values are equal
             */
            isEqual: function (val1, val2) {
                return (this.compare(val1, val2) === 0);
            },

            /**
             * Compares val1 and val2.
             * 
             * @param {Any}       val1 First value
             * @param {Any}       val2 Second value
             * @return {Integer} 0 - [val1===val2], 1- [val1 > val2], (-1) - [val1 < val2]
             */
            compare: function (val1, val2) {
                var d1 = this._convert(val1) - 0;
                var d2 = this._convert(val2) - 0;
                return UccelloClass.super.apply(this, [d1, d2]);
            },

            /**
             * Checks if value is correct.
             * 
             * @param {Any}       val A value to be checked
             * @param {Object}    errObj An Object which contains error info (checkVal fills it if value is incorrect)
             * @param {String}    errObj.errMsg Error message
             * @param {String}    fldName A field name of the value
             * @param {Object}    obj A MemProtoObject which [val] belongs to 
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj, fldName, obj) {
                var result = !isNaN(this._convert(val) - 0);
                if ((!result) && errObj)
                    errObj.errMsg = "Invalid \"datetime\" value: " + JSON.stringify(val) + " .";
                return result;
            },

            /**
             * Converts a Value of this data type from the serialized
             * or "end-user" representation to the internal one.
             * 
             * @param {Any} val A value of this data type (could be Integer, String or Date)
             * @param {String}  fldName A field name of the value
             * @param {Object}  obj A MemProtoObject which [fldName] belongs to 
             * @param {Boolean} withCheckVal True if the value needs to be checked
             * @throws          Will throw an error if the value isn't correct
             * @return {Date}
             */
            setValue: function (val, fldName, obj, withCheckVal) {
                var result = this._convert(val);
                UccelloClass.super.apply(this, [val, fldName, obj, withCheckVal]);
                return result;
            },

            /**
             * Converts a Value to Date type
             * 
             * @param {Any} val An input value
             * @return {Date}
             */
            _convert: function (val) {
                var result = val;
                if ((typeof (val) === "string") && (val.length === 0))
                    result = null;
                if ((!(result instanceof Date)) && (!((result === null) && this._allowNull)))
                    result = new Date(result);
                return result;
            }
        });
        
        var BooleanType = BaseType.extend({

            key: "boolean",

            /**
             * The Boolean Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            }
        });

        var DecimalType = BaseType.extend({

            key: "decimal",

            dfltPrecision: 15,

            dfltScale: 4,

            /**
             * The Decimal Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
                UccelloClass.super.apply(this, [typeObj, refResolver]);
            },

            /**
             * Data Type hash code.
             * Uniquely represents data type instance.
             * 
             * @return {Strng} The hash code
             */
            hash: function () {
                var result = UccelloClass.super.apply(this, []);
                return result + "_" + this._precision + "_" + this._scale;
            },

            /**
             * Returns a serialized representation of the data type
             * 
             * @return {Object} Serialized representation
             */
            serialize: function () {
                var result = UccelloClass.super.apply(this, []);
                result.precision = this._precision;
                result.scale = this._scale;
                return result;
            },

            /**
             * The precision property
             * 
             * @return {Integer}
             */
            precision: function () {
                return this._precision;
            },

            /**
             * The scale property
             * 
             * @return {Integer}
             */
            scale: function () {
                return this._scale;
            },

            /**
             * Converts this data type from the serialized representation 
             * to the internal one (only constructor can invoke it)
             * 
             * @param {String|Object} val Serialized representation of this data type
             * @throws                    Will throw an error if val.precision or\and val.scale is incorrect
             * @private
             */
            _deserialize: function (val) {
                var result = UccelloClass.super.apply(this, [val]);

                this._precision = this.dfltPrecision;
                this._scale = this.dfltScale;
                if ((val instanceof Object) && val.precision) {
                    if (typeof (val.precision) === "number")
                        if (val.precision > 0)
                            this._precision = Math.floor(val.precision);
                        else
                            throw new Error("Invalid value of decimal \"precision\": " + val.precision + ".");
                    else
                        throw new Error("Invalid value of decimal \"precision\": " + val.precision + ".");
                };
                if ((val instanceof Object) && val.scale) {
                    if (typeof (val.scale) === "number")
                        if (val.scale > 0)
                            this._scale = Math.floor(val.scale);
                        else
                            throw new Error("Invalid value of decimal \"scale\": " + val.scale + ".");
                    else
                        throw new Error("Invalid value of decimal \"scale\": " + val.scale + ".");
                };
                if(this._scale>this._precision)
                    throw new Error("Decimal \"precision\": " + val.precision + " should be greater than \"scale\": " + val.scale + ".");
            }
        });

        var RefType = BaseType.extend({

            key: "ref",

            /**
             * The Reference Type.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
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
             * @param {String}  [val.res_type=null]      Resource type GUID
             * @param {String}  [val.res_elem_type=null] Resource element type GUID
             * @param {Boolean} [val.strict=false]       True if ref type should be checked strictly
             * @throws                                   Will throw an error if the value isn't correct
             * @private
             */
            _deserialize: function (val) {
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
             * Compares val1 and val2.
             * 
             * @param {Any}       val1 First value
             * @param {Any}       val2 Second value
             * @return {Integer} 0 - [val1===val2], 1- [val1 > val2], (-1) - [val1 < val2]
             */
            compare: function (val1, val2) {
                var res = 0;
                if (!this.isEqual(val1, val2)) {
                    if (val1 && val2) {
                        if (val1.objRef && val2.objRef)
                            return UccelloClass.super.apply(this, [val1.objRef, val2.objRef]);
                        else {
                            var str1 = val1.objRef ? "" : String(val1.guidElem) + "|" + String(val1.guidInstanceElem);
                            var str2 = val2.objRef ? "" : String(val2.guidElem) + "|" + String(val2.guidInstanceElem);
                            if (this._external) {
                                str1 = (val1.objRef ? "" : String(val1.guidRes) + "|" + String(val1.guidInstanceRes) + "|") + str1;
                                str2 = (val2.objRef ? "" : String(val2.guidRes) + "|" + String(val2.guidInstanceRes) + "|") + str2;
                            };
                            return UccelloClass.super.apply(this, [str1, str2]);
                        };
                    }
                    else
                        return UccelloClass.super.apply(this, [String(val1), String(val1)]);
                };
                return res;
            },

            /**
             * Checks if value is correct.
             * 
             * @param {Any}       val A value to be checked (could be MemProtoObj or serialized reference)
             * @param {Object}    errObj An Object which contains error info (checkVal fills it if value is incorrect)
             * @param {String}    errObj.errMsg Error message
             * @param {String}    fldName A field name of the value
             * @param {Object}    obj A MemProtoObject which [val] belongs to 
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj, fldName, obj) {
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
                            if (typeof (val) === "string") {
                                result.guidInstanceElem = val;
                                result.guidElem = obj.parseGuid(result.guidInstanceElem).guid;
                                if (result.guidElem == result.guidInstanceElem)
                                    result.guidInstanceElem = null; //It's most likely "guidElem"

                                // Ref to ROOT element is supposed here.
                                result.guidRes = result.guidElem;
                                result.guidInstanceRes = result.guidInstanceElem;
                            } else {
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
                            }
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
                    if (!this.checkVal(result, errObj, fldName, obj))
                        throw new Error(errObj.errMsg);
                };

                this._refResolver.addLink(obj, result, fldName, this);
                return result;
            }
        });

        var DataRefType = IntegerType.extend({

            key: "dataRef",

            /**
             * The Data reference type (references in Data Objects). 
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
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
                var result = UccelloClass.super.apply(this, []);

                if ((this._refResolver) &&
                        (typeof (this._refResolver.getGuid) === "function"))
                    result += "_" + this._refResolver.getGuid();

                result += "_" + this._model + "_" + this._refAction;
                return result;
            },

            /**
             * Returns a serialized representation of the data type
             * 
             * @return {Object} Serialized representation
             */
            serialize: function () {
                var result = UccelloClass.super.apply(this, []);

                result.model = this._model;
                if (this._refAction !== "none")
                    result.refAction = this._refAction;

                return result;
            },

            /**
             * Converts this data type from the serialized representation 
             * to the internal one (only constructor can invoke it)
             * 
             * @param {Object}                        val Serialized representation of this data type
             * @param {String} [val.model=false]      True if ref is external
             * @param {String} [val.refAction="none"] Resource type GUID
             * @throws                                Will throw an error if the value isn't correct
             * @private
             */
            _deserialize: function (val) {
                UccelloClass.super.apply(this, [val]);

                this._model = null;
                this._refAction = "none";
                this._allowNull = true;

                if (val instanceof Object) {
                    if (typeof (val.model) === "string") {
                        this._model = val.model;
                    };
                    if (typeof (val.refAction) === "string") {
                        switch (val.refAction) {
                            case "none":
                            case "parentRestrict":
                            case "parentCascade":
                            case "parentSetNull":
                                break;
                            default:
                                throw new Error("Unknown ref-action: \"" + val.refAction + "\".");
                        };

                        this._refAction = val.refAction;
                    };
                    if (typeof (val.allowNull) === "boolean")
                        this._allowNull = val.allowNull;
                };

                if ((this._refAction === "parentSetNull") && (!this._allowNull))
                    throw new Error("Incompatible options: \"parentSetNull\" and [\"allowNull\" = false].");

                if (this._model === null)
                    throw new Error("Undefined \"model\" in [dateRef] type.");
            },

            /**
             * Returns Reference Action
             *  possible values: {"none", "parentRestrict", "parentCascade", "parentSetNull"}
             * 
             * @return {String}
             */
            refAction: function () {
                return this._refAction;
            },

            /**
             * Returns the name of referenced model 
             * 
             * @return {String}
             */
            model: function () {
                return this._model;
            },

            /**
             * Checks if value is correct.
             * 
             * @param {Any}       val A value to be checked (could be MemProtoObj or serialized reference)
             * @param {Object}    errObj An Object which contains error info (checkVal fills it if value is incorrect)
             * @param {String}    errObj.errMsg Error message
             * @param {String}    fldName A field name of the value
             * @param {Object}    obj A MemProtoObject which [val] belongs to 
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj, fldName, obj) {

                var result = this._allowNull && (val === null);

                if (!result) {

                    result = UccelloClass.super.apply(this, [val, errObj, fldName, obj]);

                    if (result) {
                        var _errMsg = {};

                        if (obj && this._refResolver && (typeof this._refResolver.checkDataObjectRef === "function"))
                            result = this._refResolver.checkDataObjectRef(val, _errMsg, fldName, obj, this);

                        if ((!result) && errObj)
                            errObj.errMsg = _errMsg.errMsg;
                    };
                };

                return result;
            },

            /**
             * Converts a Value of this data type from the serialized
             * or "end-user" representation to the internal one.
             * 
             * @param {Integer} val A value of this data type (could be an integer value)
             * @param {String}  fldName A field name of the value
             * @param {Object}  obj A MemProtoObject which [fldName] belongs to 
             * @param {Boolean} withCheckVal True if the value needs to be checked
             * @throws          Will throw an error if the value isn't correct
             * @return {Integer}
             */
            setValue: function (val, fldName, obj, withCheckVal) {
                var result = val;
                if (!(this._allowNull && (val === null))) {
                    result = UccelloClass.super.apply(this, [val, fldName, obj, withCheckVal]);
                };
                return result;
            },

            /**
             * Returns referenced model name
             * 
             * @return {String}
             */
            model: function () {
                return this._model;
            },

            /**
             * Returns reference action
             * 
             * @return {String}
             */
            refAction: function () {
                return this._refAction;
            },

            /**
             * Converts an integer Value to a referenced object
             *
             * @param {Any}     val An internal value (integer)
             * @param {String}  fldName A field name of the value
             * @param {Object}  obj A DataObject which [fldName] belongs to 
             * @return {Object} referenced object
             */
            getRefObject: function (val, fldName, obj) {
                var retval = null;
                if (this._refResolver && (typeof this._refResolver.getRefDataObject === "function"))
                    retval = this._refResolver.getRefDataObject(val, fldName, obj, this);
                return retval;
            }

        });

        typedvalueTypeCodes = {
            "int": { code: 0, constructor: IntegerType },
            "string": { code: 1, constructor: StringType },
            "float": { code: 2, constructor: FloatType },
            "datetime": { code: 3, constructor: DateTimeType },
            "decimal": { code: 5, constructor: DecimalType },
            "boolean": { code: 6, constructor: BooleanType },
            "integer": { code: 8, constructor: IntegerType },
            "date": { code: 9, constructor: DateTimeType },
            "time": { code: 10, constructor: DateTimeType },
            "timestamp": { code: 11, constructor: DateTimeType }
        };

        var TypedValueVal = UccelloClass.extend({

            /**
             * The Value of TypedValue Type
             *  represents value of typed value.
             *
             * @param {Object} type Type object
             * @param {Object} value Value
             * @constructor
             */
            init: function (type, value) {
                this._type = type;
                this._value = value;
            },

            type: function () {
                return this._type;
            },

            value: function (val) {
                if (val)
                    this._value = this._type.setValue(val, null, null, true);
                return this._value;
            }
        });

        var TypedValueType = BaseType.extend({

            key: "typedvalue",

            /**
             * The TypedValue Type
             *  represents type of typed values.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver) {
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
                var result = UccelloClass.super.apply(this, []);

                if ((this._refResolver) &&
                        (typeof (this._refResolver.getGuid) === "function"))
                    result += "_" + this._refResolver.getGuid();

                return result;
            },

            /**
             * Converts a Value of this data type from the internal representation
             * to the serialized one.
             *
             * @param {Any}     val An internal value
             * @return {Object} Serialized representation of the value
             */
            getSerializedValue: function (val) {
                if(!(val instanceof TypedValueVal))
                    throw new Error("getSerializedValue::Inavlid value of \"typedvalue\" type.");
                return {
                    type: val.type().serialize(),
                    value: val.type().getSerializedValue(val.value)
                };
            },

            /**
             * Checks if val1 is equal to val2.
             * 
             * @param {Any}       val1 First value (could be TypedValueVal or serialized type)
             * @param {Any}       val2 Second value (could be TypedValueVal or serialized type)
             * @return {Boolean} True if values are equal
             */
            isEqual: function (val1, val2) {
                var val1_srlz = (val1 instanceof TypedValueVal) ? this.getSerializedValue(val1) : val1;
                var val2_srlz = (val2 instanceof TypedValueVal) ? this.getSerializedValue(val2) : val2;
                return JSON.stringify(val1_srlz) === JSON.stringify(val2_srlz);
            },

            /**
             * Compares val1 and val2.
             * 
             * @param {Any}       val1 First value
             * @param {Any}       val2 Second value
             * @return {Integer} 0 - [val1===val2], 1- [val1 > val2], (-1) - [val1 < val2]
             */
            compare: function (val1, val2) {
                var val1_srlz = (val1 instanceof TypedValueVal) ? this.getSerializedValue(val1) : val1;
                var val2_srlz = (val2 instanceof TypedValueVal) ? this.getSerializedValue(val2) : val2;
                return UccelloClass.super.apply(this, [JSON.stringify(val1_srlz), JSON.stringify(val2_srlz)]);
            },

            /**
             * Checks if value is correct.
             * 
             * @param {Any}       val A value to be checked (could be TypedValueVal or serialized type)
             * @param {Object}    errObj An Object which contains error info (checkVal fills it if value is incorrect)
             * @param {String}    errObj.errMsg Error message
             * @param {String}    fldName A field name of the value
             * @param {Object}    obj A MemProtoObject which [val] belongs to 
             * @param {Object}    retVal Will contain converted value in [retVal.obj]
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj, fldName, obj, retVal) {
                var result = true;
                var msg;

                if (val) {
                    var _val = val;
                    if (!(_val instanceof TypedValueVal))
                        try {
                            var tp, value;
                            if (_val.type) {
                                tp = MetaTypes.createTypeObject(_val.type, this._refResolver, typedvalueTypeCodes, false);
                                if (_val.value !== undefined)
                                    value = tp.setValue(val, null, null, true);
                            }
                            else {
                                result = false;
                                msg = "Type of \"typedvalue\" is undefined.";
                            };

                            if (result && retVal)
                                retVal.obj = new TypedValueVal(tp, value);

                        } catch (err) {
                            result = false;
                            msg = err.message;
                        };
                } else {
                    result = false;
                    msg = "Empty value is invalid.";
                };

                if ((!result) && errObj)
                    errObj.errMsg = msg;
                return result;
            },

            /**
             * Converts a Value of this data type from the serialized
             * or "end-user" representation to the internal one.
             * 
             * @param {Any}     val A value of this data type (could be TypedValueVal or serialized type)
             * @param {String}  fldName A field name of the value
             * @param {Object}  obj A MemProtoObject which [fldName] belongs to 
             * @param {Boolean} withCheckVal True if the value needs to be checked
             * @throws          Will throw an error if the value isn't correct
             * @return {Object} Internal representation of the value
             */
            setValue: function (val, fldName, obj, withCheckVal) {

                var result = val;
                if (!(result instanceof TypedValueVal)) {
                    var errObj = {};
                    var retVal = {};
                    if (this.checkVal(val, errObj, fldName, obj, retVal))
                        result = retVal.obj;
                    else
                        throw new Error(errObj.errMsg);
                }
                return result;
            }
        });

        datafieldTypeCodes = {
            "int": { code: 0, constructor: IntegerType },
            "string": { code: 1, constructor: StringType },
            "float": { code: 2, constructor: FloatType },
            "datetime": { code: 3, constructor: DateTimeType },
            "decimal": { code: 5, constructor: DecimalType },
            "boolean": { code: 6, constructor: BooleanType },
            "integer": { code: 8, constructor: IntegerType },
            "date": { code: 9, constructor: DateTimeType },
            "time": { code: 10, constructor: DateTimeType },
            "timestamp": { code: 11, constructor: DateTimeType },
            "dataRef": { code: 14, constructor: DataRefType }
        };

        var DataFieldType = BaseType.extend({

            key: "datatype",

            /**
             * The DataField Type
             *  represents type of data-object field.
             *
             * @param {String|Object} typeObj Serialized data type representation
             * @param {Object}        refResolver An Object which implements link resolver interface
             * @param {Object}        [type_codes_table=datafieldTypeCodes] A table of allowed types
             * @extends BaseType
             * @constructor
             */
            init: function (typeObj, refResolver, type_codes_table) {
                UccelloClass.super.apply(this, [typeObj, refResolver]);
                this._is_complex = true;
                this._typeCodesTable = type_codes_table;
                if (!this._typeCodesTable)
                    this._typeCodesTable = datafieldTypeCodes;
            },

            /**
             * Data Type hash code.
             * Uniquely represents data type instance.
             * 
             * @return {Strng} The hash code
             */
            hash: function () {
                var result = UccelloClass.super.apply(this, []);

                if ((this._refResolver) &&
                        (typeof (this._refResolver.getGuid) === "function"))
                    result += "_" + this._refResolver.getGuid();

                return result;
            },

            /**
             * Converts a Value of this data type from the internal representation
             * to the serialized one.
             *
             * @param {Any}     val An internal value
             * @return {Object} Serialized representation of the value
             */
            getSerializedValue: function (val) {
                return val.serialize();
            },

            /**
             * Checks if val1 is equal to val2.
             * 
             * @param {Any}       val1 First value (could be BaseType or serialized type)
             * @param {Any}       val2 Second value (could be BaseType or serialized type)
             * @return {Boolean} True if values are equal
             */
            isEqual: function (val1, val2) {

                if (val1 && val2) {
                    var _val1 = val1;
                    var _val2 = val2;
                    var is_correct_val = true;
                    if (!_val1 instanceof BaseType)
                        try {
                            _val1 = MetaTypes.createTypeObject(_val1, this._refResolver, this._typeCodesTable, true);
                        } catch (err) {
                            is_correct_val = false;
                        };

                    if (is_correct_val && (!_val2 instanceof BaseType))
                        try {
                            _val2 = MetaTypes.createTypeObject(_val2, this._refResolver, this._typeCodesTable, true);
                        } catch (err) {
                            is_correct_val = false;
                        };

                    if (is_correct_val)
                        return _val1.hash() === _val2.hash()
                    else
                        return String(_val1) === String(_val2);
                }
                else
                    return (!val1) && (!val2);
                return false;
            },

            /**
             * Compares val1 and val2.
             * 
             * @param {Any}       val1 First value
             * @param {Any}       val2 Second value
             * @return {Integer} 0 - [val1===val2], 1- [val1 > val2], (-1) - [val1 < val2]
             */
            compare: function (val1, val2) {
                var res = 0;
                if (!this.isEqual(val1, val2)) {
                    if (val1 && val2) {
                        var _val1 = val1;
                        var _val2 = val2;
                        var is_correct_val = true;
                        if (!(_val1 instanceof BaseType))
                            try {
                                _val1 = MetaTypes.createTypeObject(_val1, this._refResolver, this._typeCodesTable, true);
                            } catch (err) {
                                is_correct_val = false;
                            };

                        if (is_correct_val && (!(_val2 instanceof BaseType)))
                            try {
                                _val2 = MetaTypes.createTypeObject(_val2, this._refResolver, this._typeCodesTable, true);
                            } catch (err) {
                                is_correct_val = false;
                            };

                        if (is_correct_val)
                            return UccelloClass.super.apply(this, [_val1.hash(), val2.hash()]);
                        else
                            return UccelloClass.super.apply(this, [String(_val1), String(_val2)]);
                    }
                    else
                        return UccelloClass.super.apply(this, [String(val1), String(val1)]);
                };
                return res;
            },

            /**
             * Checks if value is correct.
             * 
             * @param {Any}       val A value to be checked (could be BaseType or serialized type)
             * @param {Object}    errObj An Object which contains error info (checkVal fills it if value is incorrect)
             * @param {String}    errObj.errMsg Error message
             * @param {String}    fldName A field name of the value
             * @param {Object}    obj A MemProtoObject which [val] belongs to 
             * @return {Boolean} True if value is corect
             */
            checkVal: function (val, errObj, fldName, obj) {
                var result = true;
                var msg;

                if (val) {
                    var _val = val;
                    if (!(_val instanceof BaseType))
                        try {
                            _val = MetaTypes.createTypeObject(_val, this._refResolver, this._typeCodesTable, true);
                        } catch (err) {
                            result = false;
                            msg = err.message;
                        };
                } else {
                    result = false;
                    msg = "Empty value is invalid.";
                };

                if ((!result) && errObj)
                    errObj.errMsg = msg;
                return result;
            },

            /**
             * Converts a Value of this data type from the serialized
             * or "end-user" representation to the internal one.
             * 
             * @param {Any}     val A value of this data type (could be BaseType or serialized type)
             * @param {String}  fldName A field name of the value
             * @param {Object}  obj A MemProtoObject which [fldName] belongs to 
             * @param {Boolean} withCheckVal True if the value needs to be checked
             * @throws          Will throw an error if the value isn't correct
             * @return {Object} Internal representation of the value
             */
            setValue: function (val, fldName, obj, withCheckVal) {

                var result = val;
                if (!(result instanceof BaseType))
                    result = MetaTypes.createTypeObject(result, this._refResolver, this._typeCodesTable, true);
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
         * @param {Object}        [typeTable = fldTypeCode] Table of allowed types
         * @param {Boolean}       [extTypeResolve = false] Indicates if we use external type resolver
         * @return {Object}       Data type object
         * @constructor
         */
        function GetFldTypeUniq(typeObj, refResolver, typeTable, extTypeResolve) {

            var _fldTypeCodes = typeTable ? typeTable : fldTypeCodes;

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

            if (!_fldTypeCodes[key])
                throw new Error("Unknown type: \"" + JSON.stringify(typeObj) + "\".");

            var constr = _fldTypeCodes[key].constructor;
            if (extTypeResolve)
                constr = refResolver.resolveSqlType(constr);

            result = new constr(typeObj, refResolver);
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
            "timestamp": { code: 11, constructor: DateTimeType },
            "datatype": { code: 12, constructor: DataFieldType },
            "money": { code: 13, constructor: FloatType },
            "dataRef": { code: 14, constructor: DataRefType },
            "typedvalue": { code: 15, constructor: TypedValueType }
        };

        function addDataType(typeTable, type) {
            if (!typeTable[type.prototype.key])
                typeTable[type.prototype.key] = type;
            else
                throw new Error("Duplicate data type definition: \"" + type.prototype.key + "\".");
        };

        function makeDescendant(key, table, impl) {
            var base = MetaTypes.typeTable[key];
            if ((!base) || (typeof (base) !== "function"))
                throw new Error("Can't find base \"" + tp + "\" type.");
            addDataType(table, base.extend(impl));
        };

        var typeTable = {};
        addDataType(typeTable, BaseType);
        addDataType(typeTable, IntegerType);
        addDataType(typeTable, StringType);
        addDataType(typeTable, DecimalType);
        addDataType(typeTable, FloatType);
        addDataType(typeTable, BooleanType);
        addDataType(typeTable, DateTimeType);
        addDataType(typeTable, RefType);
        addDataType(typeTable, DataFieldType);
        addDataType(typeTable, DataRefType);

        var MetaTypes = {
            createTypeObject: GetFldTypeUniq,
            typeTable: typeTable,
            BaseType: BaseType,
            DataRefType: DataRefType,
            makeDescendant: makeDescendant
        };
        
        return MetaTypes;
    }
);
