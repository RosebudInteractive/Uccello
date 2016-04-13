if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}
define(
    [],
    function () {
        var Meta = {

            DATA_OBJECT_WORKSPASE: "$Data",

            ROW_VERSION_FNAME: "GuidVer",
            TYPE_ID_FNAME: "TypeId",
            PARENT_REF_FNAME: "ParentId",

            TYPE_MODEL_NAME: "SysDataObjTypes",
            TYPE_MODEL_GUID: "758aa62e-3898-4dfe-aebb-662785b6c833",
            TYPE_MODEL_RNAME: "RootSysDataObjTypes",
            TYPE_MODEL_RGUID: "49daf947-1cd7-4d2a-9f88-c5562c675d71",

            Db: {
                Name: "DataEngineDB",
                Guid: "66d43749-223a-48cb-9143-122381b9ed3c"
            },

            Field: {
                PrimaryKey: 1,
                AutoIncrement: 2,
                Hidden: 4,
                Internal: 8,
                System: 16,
                RowVersion: 32,
                TypeId: 64,
                ParentRef: 128
            },

            State: {
                Browse: 0,
                Insert: 1,
                Edit: 2,
                Delete: 3,
                Pending: 4,
                Unknown: 5
            },

            ReqLevel: {
                All: 0,
                CurrentOnly: 1,
                CurrentAndChilds: 2,
                CurrentAndEmptyChilds: 3,
                AllAndEmptyChilds: 4
            }
        };

        Meta.stateToString = function (state) {
            var state_str = "Unknown";
            switch (state) {
                case Meta.State.Browse:
                    state_str = "Browse";
                    break;
                case Meta.State.Edit:
                    state_str = "Edit";
                    break;
                case Meta.State.Insert:
                    state_str = "Insert";
                    break;
                case Meta.State.Delete:
                    state_str = "Delete";
                    break;
                case Meta.State.Pending:
                    state_str = "Pending";
                    break;
                case Meta.State.Unknown:
                    state_str = "Unknown";
                    break;
            };
            return state_str;
        };

        return Meta;
    }
);