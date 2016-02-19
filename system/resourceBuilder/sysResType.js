/**
 * Created by staloverov on 18.02.2016.
 */
'use strict';

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([UCCELLO_CONFIG.uccelloPath + 'system/utils', './metaInfo'],
    function(Utils, MetaInfo) {

        function createSysResType() {
            return {
                "$sys": {
                    "guid": Utils.guid(),
                    "typeGuid": MetaInfo.SysResType.RootGuid
                },
                "fields": {
                    "Id": 1000,
                    "Name" : MetaInfo.SysResType.RootName
                },
                "collections": {
                    "DataElements": []
                }
            }
        }

        return class ResourceTypes {
            constructor(types) {
                this.object = createSysResType();
                this.addTypeRecords(types);
            }

            addTypeRecords(types) {
                var that = this;
                types.forEach(function(resType) {
                    that.object.collections.DataElements.push({
                            "$sys": {
                                "guid": Utils.guid(),
                                "typeGuid": MetaInfo.SysResType.ClassGuid
                            },
                            "fields": {
                                "Id": MetaInfo.SysResType.getId(),
                                "Code": resType.Code,
                                "Name" : resType.Name,
                                "ClassName" : resType.ClassName,
                                "ResTypeGuid": resType.Guid,
                                "Description": resType.Description
                            },
                            "collections": {}
                        }

                    )
                })
            }

            getType(code) {
                return this.object.collections.DataElements.find(function(element) {
                    return element.fields.Code == code;
                })
            }
        }
    }
);