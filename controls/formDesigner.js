/**
 * Created by kiknadze on 14.03.2016.
 */

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var UccelloClass = require(UCCELLO_CONFIG.uccelloPath + '/system/uccello-class');
}

define(
    [UCCELLO_CONFIG.uccelloPath+'controls/adaptiveContainer'],
    function(Container) {
        var FormDesigner = Container.extend({

            className: "FormDesigner",
            classGuid: UCCELLO_CONFIG.classGuids.FormDesigner,
            metaCols: [
                {"cname": "Controls", "ctype": "AComponent"},
                {"cname": "Layouts", "ctype": "AComponent"}
            ],
            metaFields: [{
                fname: "Cursor", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.AComponent
                }},
                {fname:"CurrentLayout", ftype: {
                    type: "ref",
                    res_elem_type: UCCELLO_CONFIG.classGuids.Layout
                }},
                {fname:"HasChanges", ftype: "boolean"}
            ],

            init: function(cm, params) {
                UccelloClass.super.apply(this, [cm, params]);
            },

            cursor: function(value) {
                return this._genericSetter("Cursor", value);
            },

            hasChanges: function(value) {
                return this._genericSetter("HasChanges", value);
            },

            currentLayout: function(value) {
                return this._genericSetter("CurrentLayout", value);
            },

            generateFrom: function() {
                var guidMap = {};
                var id = 1;
                var layouts = [];
                var children = [];
                var sObj = {
                    "$sys": {
                        "guid": Utils.guid(),
                        "typeGuid":  UCCELLO_CONFIG.classGuids.AdaptiveContainer
                    },
                    "fields": {
                        "Id": id++,
                        "Name": "AdaptiveContainer" + id,
                        "Background": "#ffffff",
                        "Width": "100%",
                        "Height": "100%",
                        "ResElemName": "Gen_AdaptiveContainer" + id
                    },
                    "collections": {
                        "Children": children,
                        "Layouts": layouts
                    }
                };

                var ctrlCol = this.getCol("Controls");

                for (var i = 0; i < ctrlCol.count(); i++) {
                    var ctrl = ctrlCol.get(i);
                    var tGuid = ctrl.typeGuid();
                    var c = {
                        "$sys": {
                            "guid": Utils.guid(),
                            "typeGuid":  tGuid
                        },
                        "fields": {
                            "Id": id++,
                            "Name": tGuid + "_" + id,
                            "Width": "100%",
                            "Height": "100%",
                            "ResElemName": tGuid + "_" + id
                        },
                        "collections": {}
                    };
                    guidMap[ctrl.getGuid()] = c.$sys.guid;

                    if (tGuid == "55d59ec4-77ac-4296-85e1-def78aa93d55") { // GenDataGrid
                        c.collections.Columns = [];
                        c.fields.BigSize = true;
                        c.fields.Alternate = false;
                        c.fields.HorizontalLines = true;
                        c.fields.HasFooter = false;
                        c.fields.WhiteHeader = true;
                        var gColumns = c.collections.Columns;
                        var propsStr = ctrl.controlProperties();
                        var props = null;
                        if (propsStr)
                            props = JSON.parse(propsStr);

                        var dsName = null;
                        if (props && props.Dataset)
                            dsName = props.Dataset;

                        var ds = this._getDSByName(dsName);
                        if (ds) {
                            c.fields.Dataset = ds.getGuid();
                            var fields = ds.getCol("Fields");
                            for (var j = 0; j < fields.count(); j++) {
                                var f = fields.get(j);
                                var gCol = {
                                    "$sys": {
                                        "guid": Utils.guid(),
                                        "typeGuid": UCCELLO_CONFIG.classGuids.DataColumn
                                    },
                                    "fields": {
                                        "Id": id++,
                                        "Label": f.name(),
                                        "Field": f.getGuid().split("@")[0],
                                        "ResElemName": "DataColumn_" + id,
                                        "Width": "50px"
                                    }
                                }

                                gColumns.push(gCol);
                            }
                        }
                    }
                    children.push(c);
                }
                var lCol = this.getCol("Layouts");
                var ids = {id : id}
                for (var i = 0; i < lCol.count(); i++) {
                    this._genLayouts(layouts, guidMap, lCol.get(i), ids );
                }


                var children = this.getCol("Children");
                var forDel = [];
                for (var i = 0; i < children.count(); i++) {
                    var ch = children.get(i);
                    if (ch.className = "AdaptiveContainer") forDel.push(ch);
                }

                for (i = 0; i < forDel.length; i++) children._del(forDel[i]);

                var db = this.getDB();
                var colName = "Children";
                var p = {
                    colName: colName,
                    obj: this
                };

                var resObj = db.deserialize(sObj, p, db.pvt.defaultCompCallback);

                // Логгируем добавление поддерева
                var mg = this.getGuid();
                var o = {adObj: sObj, obj: resObj, colName: colName, guid: mg, type: "add"};
                this.getLog().add(o);
                this.logColModif("add", colName, resObj);
                this.getControlMgr().allDataInit(resObj);
                this.hasChanges(false);
            },

            _genLayouts: function(arr, guidMap, layout, id) {
                var lObj = {
                    "$sys": {
                        "guid": Utils.guid(),
                        "typeGuid": UCCELLO_CONFIG.classGuids.Layout
                    },
                    "fields": {
                        "Id": id.id++,
                        "Name": "Gen_Layout_" + id.id,
                        "Width": layout.width(),
                        "Height": layout.height(),
                        "ResElemName": "Gen_Layout_" + id.id,
                        "Direction": layout.direction(),
                        "Control": layout.control() ? guidMap[layout.control().getGuid()] : null,
                        "MaxTargetWidth": layout.maxTargetWidth()
                    },
                    "collections": {
                        "Layouts": []
                    }
                };

                if (!layout.control()) {
                    var lCol = layout.getCol("Layouts");
                    for (var i = 0; i < lCol.count(); i++) {
                        this._genLayouts(lObj.collections.Layouts, guidMap, lCol.get(i), id );
                    }
                }
                arr.push(lObj);
            },

            _getDSByName: function(name) {
                var model = this.getModel();
                if (model) {
                    var col = model.getCol("Datasets");
                    for (var i = 0; i < col.count(); i++)
                        if (col.get(i).resElemName() == name) return col.get(i);
                }
                return null;
            },

            getModel: function() {
                var parent = this.getParentComp();
                var children = parent.getCol("Children");
                for (var i = 0; i < children.count(); i++) {
                    var ch = children.get(i);
                    if (ch.className == "ADataModel") return ch;
                }

                return null;
            }
        });
        return FormDesigner;
    }
);

