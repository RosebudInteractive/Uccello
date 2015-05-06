if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var Class = require('class.extend');
}

define(
    [],
    function () {
        
        var fldTypeCodes;
        
        var BaseType = Class.extend({
            init: function (typeObj, refResolver) {
                this._is_complex = false;
                this._refResolver = refResolver;
                this.deserialize(typeObj);
            },
            
            typeName: function () {
                return this._fldType;
            },
            
            type: function () {
                return this._fldTypeCode;
            },

            hash: function () {
                return this._fldType;
            },

            isComplex: function () {
                return this._is_complex;
            },

            checkVal: function (val, errObj) {
                return true;
            },

            isEqual: function (val1, val2) {
                return val1 === val2;
            },

            serialize: function () {
                return { type: this._fldType };
            },

            deserialize: function (val) {
                if (typeof (val) === "string") {
                    this._fldType = val;
                } else {
                    this._fldType = val.type;
                };
                this._fldTypeCode = fldTypeCodes[this._fldType].code;
            },

            getSerializedValue: function (val) {
                return val;
            },

            getValue: function (val) {
                return val;
            },

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
            init: function (typeObj, refResolver) {
                this._super(typeObj, refResolver);
            }
        });
        
        var StringType = BaseType.extend({
            init: function (typeObj, refResolver) {
                this._super(typeObj, refResolver);
            }
        });
        
        var FloatType = BaseType.extend({
            init: function (typeObj, refResolver) {
                this._super(typeObj, refResolver);
            }
        });
        
        var DateTimeType = BaseType.extend({
            init: function (typeObj, refResolver) {
                this._super(typeObj, refResolver);
            }
        });
        
        var BooleanType = BaseType.extend({
            init: function (typeObj, refResolver) {
                this._super(typeObj, refResolver);
            }
        });

        var DecimalType = BaseType.extend({
            init: function (typeObj, refResolver) {
                this._super(typeObj, refResolver);
            }
        });

        var RefType = BaseType.extend({
            init: function (typeObj, refResolver) {
                this._super(typeObj, refResolver);
                this._is_complex = true;
            },

            hash: function () {
                var result = this._super();

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

            serialize: function () {
                var result = this._super();
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

            deserialize: function (val) {
                this._super(val);

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

            getSerializedValue: function (val) {
                var result = val;
                if (val)
                    if (this._external) {
                        result = { guidRes: val.guidRes, guidElem: val.guidElem };
                    } else
                        result = val.guidElem;
                return result;
            },

            getValue: function (val) {
                return val ? val.objRef : null;
            },

            isEqual: function (val1, val2) {

                if (val1 && val2) {
                    if (val1.objRef && val2.objRef)
                        return val1.objRef == val2.objRef;

                    if ((!val1.objRef) && (!val2.objRef)) {
                        if (this._external)
                            return (val1.guidRes == val2.guidRes)
                                && (val1.guidElem == val2.guidElem);
                        else
                            return val1.guidElem == val2.guidElem;
                    };
                }
                else
                    return (!val1) && (!val2);
                return false;
            },

            checkVal: function (val, errObj, obj) {
                var result = true;
                var msg;
                if (!val.objRef) {
                    result = typeof (val.guidElem) === "string";
                    if (val.is_external)
                        result = result && (typeof (val.guidRes) === "string");
                    if (!result) {
                        msg = "Invalid reference: \"" +
                                JSON.stringify(this.getSerializedValue(val)) + "\".";
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
                            result.guidRes = val.guidRes ? val.guidRes : null;
                            result.guidElem = val.guidElem ? val.guidElem : null;
                        } else {
                            if (typeof (val) === "string")
                                result.guidElem = val;
                            else
                                result.guidElem = val.guidElem ? val.guidElem : null;
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
