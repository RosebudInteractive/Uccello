// дирректория где лежит Uccello
var uccelloDir = process.argv[2]?process.argv[2]:'Uccello';
console.log('Using folder: ' + uccelloDir);

var path_prefix = "../../../../";

var config = {
    controls: [
    ],
    controlsPath: __dirname + '/./',
    dataPath: __dirname + '/' + path_prefix + 'ProtoOne/data/',
    uccelloPath: __dirname + '/' + path_prefix + uccelloDir + '/'
};

// модуль настроек
var UccelloConfig = require(path_prefix + uccelloDir + '/config/config');
UCCELLO_CONFIG = new UccelloConfig(config);
DEBUG = true;

var _timeout = 5000;
var _dbList = {};

var metaRootGuid = "fc13e2b8-3600-b537-f9e5-654b7418c156";
var mainFormGuid = "88b9280f-7cce-7739-1e65-a883371cd498";
var mainFormListGuid = "89f42efa-b160-842c-03b4-f3b536ca09d8";

var fs = require('fs');

function serialize_root(db, guid, fn, use_resource_guid) {
    var obj = db.serialize(db.getObj(guid), use_resource_guid);
    if (typeof (fn) === "undefined") {
        fn = guid + ".json";
    };
    fs.writeFileSync(fn, JSON.stringify(obj));
};

function deSerialize_root(db, guid, fn) {
    if (typeof (fn) === "undefined") {
        fn = guid + ".json";
    };
    return JSON.parse(fs.readFileSync(fn, { encoding: "utf8" }));
};

var MemDBController = require(path_prefix + uccelloDir + '/memDB/memDBController');
var ControlMgr = require(path_prefix + uccelloDir + '/controls/controlMgr');

var dbController = new MemDBController();
var dbp = { name: "System", kind: "master", guid: UCCELLO_CONFIG.guids.sysDB }
var cm = new ControlMgr({ controller: dbController, dbparams: dbp });
var dbTest = cm;

var ConstructHolder = require(path_prefix + uccelloDir + '/system/constructHolder');
var constructHolder = new ConstructHolder();
constructHolder.loadControls();

var createComponent = function (typeObj, parent, sobj) {
    var params = { ini: sobj, parent: parent.obj, colName: parent.colName };
    var constr = constructHolder.getComponent(typeObj.getGuid()).constr;
    return new constr(cm, params);
};

var components = constructHolder.pvt.components;
var comp_guids = Object.keys(components);
for (var curr_idx = 0; curr_idx < comp_guids.length; curr_idx++) {
    var constr = constructHolder.getComponent(comp_guids[curr_idx]).constr;
    new constr(cm);
};

var Meta = require(path_prefix + uccelloDir + '/metaData/metaDefs');
var DataObjectEngine = require(path_prefix + uccelloDir + '/dataman/dataObjectEngine');
var dataObjectEngine = new DataObjectEngine(null, null, dbController, constructHolder, null, {});
var metaDataMgr = dataObjectEngine.createSchema("db");

metaDataMgr.addTypeObjModel();
metaDataMgr.addModel("SysProduct", "846ff96f-c85e-4ae3-afad-7d4fd7e78144", "RootSysProduct", "ef57a0f7-ab93-4c08-9503-c58bff321672")
    .addField("Code", { type: "string", length: 50, allowNull: false })
    .addField("Name", { type: "string", length: 255, allowNull: false })
    .addField("Description", "string")
    .addField("CurrVerId", { type: "dataRef", model: "SysVersion", refAction: "parentRestrict", allowNull: true });

metaDataMgr.addModel("SysVersion", "627ba345-dee0-46c8-8b0d-873f828e875c", "RootSysVersion", "24c11653-2511-47c3-b637-60c85dfeb9bd")
    .addField("Code", { type: "string", length: 50, allowNull: false })
    .addField("Name", { type: "string", length: 255, allowNull: false })
    .addField("Description", "string")
    .addField("ProdId", { type: "dataRef", model: "SysProduct", refAction: "parentCascade", allowNull: false })
    .addField("CurrBuildId", { type: "dataRef", model: "SysBuild", refAction: "parentRestrict", allowNull: true })
    .addField("LastConfirmedBuildId", { type: "dataRef", model: "SysBuild", refAction: "parentRestrict", allowNull: true });

metaDataMgr.addModel("SysVersionDep", "2975a140-3fdb-4805-b68f-37a4a2e875cb", "RootSysVersionDep", "eb013c6f-abde-4249-bf35-3a0b86021b96")
    .addField("VersionId", { type: "dataRef", model: "SysVersion", refAction: "parentCascade", allowNull: false })
    .addField("ParentVerId", { type: "dataRef", model: "SysVersion", refAction: "parentRestrict", allowNull: false });

metaDataMgr.addModel("SysBuild", "7099d28d-1d32-425a-b95f-5c8e793d9763", "RootSysBuild", "ad66eb4b-6e18-41b7-bc43-e31346fea859")
    .addField("BuildNum", { type: "int", allowNull: false })
    .addField("IsConfirmed", "boolean")
    .addField("Description", "string")
    .addField("VersionId", { type: "dataRef", model: "SysVersion", refAction: "parentCascade", allowNull: false });

metaDataMgr.addModel("SysBuildRes", "039c1cb9-0fdf-49e9-8bb9-e720aa9fe9d1", "RootSysBuildRes", "e610fea3-5b38-44b5-aeab-e2d5fa084759")
    .addField("BuildId", { type: "dataRef", model: "SysBuild", refAction: "parentCascade", allowNull: false })
    .addField("ResVerId", { type: "dataRef", model: "SysResVer", refAction: "parentCascade", allowNull: false });

metaDataMgr.addModel("SysResType", "44df18c7-646e-45ed-91ba-6b99acedf40b", "RootSysResType", "db56d8c4-d0e9-4cee-88b8-3038de6eee31")
    .addField("Code", { type: "string", length: 50, allowNull: false })
    .addField("Name", { type: "string", length: 255, allowNull: false })
    .addField("ClassName", { type: "string", length: 50, allowNull: false })
    .addField("ResTypeGuid", { type: "guid" })
    .addField("Description", "string");

metaDataMgr.addModel("SysResource", "dc156f00-52bd-46ca-98e8-0ac6967ffd44", "RootSysResource", "866db0f5-d312-4c10-9313-07d1c3fd352b")
    .addField("ResGuid", { type: "guid" })
    .addField("Code", { type: "string", length: 50, allowNull: false })
    .addField("Name", { type: "string", length: 255, allowNull: false })
    .addField("Description", "string")
    .addField("ProdId", { type: "dataRef", model: "SysProduct", refAction: "parentRestrict", allowNull: false })
    .addField("ResTypeId", { type: "dataRef", model: "SysResType", refAction: "parentRestrict", allowNull: false });

metaDataMgr.addModel("SysResVer", "a44a2754-a231-45e8-b483-afd57144a629", "RootSysResVer", "be4cc757-4cba-4046-8206-723618242f7c")
    .addField("ResVer", { type: "int", allowNull: false })
    .addField("Hash", { type: "string", length: 32, allowNull: false })
    .addField("ResBody", { type: "string", allowNull: false })
    .addField("Description", "string")
    .addField("ResId", { type: "dataRef", model: "SysResource", refAction: "parentRestrict", allowNull: false });

metaDataMgr.getModel("SysResVer")
    .inherit("ProcessDef", "467c0559-b4b4-492e-bc2a-da453c38c7fa", "RootProcessDef", "a478d3fe-3cfc-402b-b771-e86c6d8e693f")
    .addField("Params", { type: "string", allowNull: true })
    .inherit("TaskDef", "d8f3af09-2142-49bd-b65b-fb57d304ba6b", "RootTaskDef", "3b04b00b-1a72-4182-80c8-42292c331219")
    .addField("Name", { type: "string", length: 255, allowNull: false })
    .addField("IsSystem", { type: "boolean", allowNull: false });

metaDataMgr.addModel("TaskDefStage", "1daff7d2-7651-4bfd-805c-167d82a45660", "RootTaskDefStage", "4c87ce03-81ce-4388-b0c3-cd5912a5cf48")
    .addField("TaskDefId", { type: "dataRef", model: "TaskDef", refAction: "parentRestrict", allowNull: false })
    .addField("StageCode", { type: "string", length: 20, allowNull: false });

metaDataMgr.addModel("Process", "3ab1e52a-fa66-4fa5-bda3-6ed6e3be1366", "RootProcess", "75d5a008-9f70-47d0-a7ce-eaa48e39556f")
    .addField("Name", { type: "string", length: 255, allowNull: false })
    .addField("State", { type: "int", allowNull: false })
    .addField("Body", { type: "string", allowNull: false })
    .addField("Vars", { type: "string", allowNull: true })
    .addField("DefinitionId", { type: "dataRef", model: "ProcessDef", refAction: "parentRestrict", allowNull: false })
    .addField("ParentId", { type: "dataRef", model: "Process", refAction: "parentRestrict", allowNull: true })
    .inherit("Task", "4b97801a-f97e-45d2-8568-c5bc62291009", "RootTask", "1c76c4c9-5916-493d-a349-a9ca6f0d8e12")
    .addField("TaskStageLogId", { type: "dataRef", model: "TaskStageLog", refAction: "parentRestrict", allowNull: true })
    .addField("TaskState", { type: "enum", values: ["Draft", "InProgress", "Paused", "Finished", "Canceled"], allowNull: false })
    .addField("Number", { type: "string", length: 50, allowNull: false })
    .addField("Specification", { type: "string", allowNull: false })
    .addField("ObjId", { type: "int", allowNull: false });

metaDataMgr.addModel("TaskStage", "05bc4868-eda2-4a37-82fe-0f3e010109cd", "RootTaskStage", "021cf2f1-9505-42bc-89ec-c03956bc7e74")
    .addField("TaskId", { type: "dataRef", model: "Task", refAction: "parentRestrict", allowNull: false })
    .addField("TaskDefStageId", { type: "dataRef", model: "TaskDefStage", refAction: "parentRestrict", allowNull: true })
    .addField("StageCode", { type: "string", length: 20, allowNull: false })
    .addField("StageState", { type: "enum", values: ["Waiting", "Ready", "InProgress", "Paused", "Finished", "Canceled", "Interrupted"], allowNull: false });

metaDataMgr.addModel("TaskStageLog", "", "RootTaskStageLog", "")
    .addField("TaskId", { type: "dataRef", model: "Task", refAction: "parentRestrict", allowNull: false })
    .addField("TaskStageId", { type: "dataRef", model: "TaskStage", refAction: "parentRestrict", allowNull: false })
    .addField("RequestId", { type: "dataRef", model: "Request", refAction: "parentRestrict", allowNull: false })
    .addField("StageState", { type: "enum", values: ["Waiting", "Ready", "InProgress", "Paused", "Finished", "Canceled", "Interrupted"], allowNull: false })
    .addField("PrevId", { type: "dataRef", model: "TaskStageLog", refAction: "parentRestrict", allowNull: true });

metaDataMgr.addModel("Request", "213de30c-fc0c-44f0-b730-e7f986fb10d2", "RootRequest", "cf454669-32e2-4409-abb0-4242607bdbfe")
    .addField("ProcessId", { type: "dataRef", model: "Process", refAction: "parentRestrict", allowNull: false })
    .addField("TokenId", { type: "int", allowNull: false })
    .addField("Name", { type: "string", length: 255, allowNull: false })
    .addField("State", { type: "int", allowNull: false })
    .addField("RequestBody", { type: "string" })
    .addField("ResponseBody", { type: "string" });

metaDataMgr.addModel("Message", "b758e59e-cb32-4efb-b9d5-d51e8b500d1e", "RootMessage", "d54791ea-9fc8-42a6-be99-02e34404817d")
    .addField("SourceProcessName", { type: "string", length: 255, allowNull: false })
    .addField("SourceNodeName", { type: "string", length: 255, allowNull: false })
    .addField("SourceTokenGuid", { type: "guid", allowNull: false })
    .addField("TargetProcessName", { type: "string", length: 255, allowNull: false })
    .addField("TargetNodeName", { type: "string", length: 255, allowNull: false })
    .addField("ExpireDate", "datetime")
    .addField("IsDelivered", { type: "boolean", allowNull: false })
    .addField("Body", { type: "string", allowNull: false });

metaDataMgr.addModel("DataLead", "86c611ee-ed58-10be-66f0-dfbb60ab8907", "RootLead", "31c99003-c0fc-fbe6-55eb-72479c255556")
    .addField("Source", { type: "string", length: 255 })
    .addField("State", { type: "enum", values: ["Canceled", "Converted", "Open", "Archieved"] })
    .addField("Content", { type: "string", length: 255 })
    .addField("Creation", "datetime")
    .addField("Closed", "datetime")
    //.addField("OpportunityId", { type: "dataRef", model: "DataOpportunity", refAction: "parentRestrict", allowNull: true })
    .addField("OpportunityId", "int")
    //.addField("ContactId", { type: "dataRef", model: "DataContact", refAction: "parentRestrict", allowNull: true })
    .addField("ContactId", "int")
    .addField("FirstName", { type: "string", length: 255 })
    .addField("LastName", { type: "string", length: 255 })
    .addField("Title", { type: "string", length: 255 })
    .addField("MobilePhone", { type: "string", length: 255 })
    .addField("WorkPhone", { type: "string", length: 255 })
    .addField("Email", { type: "string", length: 255 })
    //.addField("CompanyId", { type: "dataRef", model: "DataCompany", refAction: "parentRestrict", allowNull: true })
    .addField("CompanyId", "int")
    .addField("Company", { type: "string", length: 255 })
    .addField("Industry", { type: "string", length: 255 })
    .addField("NbEmpl", "int")
    .addField("City", { type: "string", length: 255 })
    .addField("Address", { type: "string", length: 255 })
    .addField("PostalCode", { type: "string", length: 255 })
    .addInternalField("CurrentProcess");

metaDataMgr.addModel("DataTstCompany", "34c6f03d-f6ba-2203-b32b-c7d54cd0185a", "RootTstCompany", "c4d626bf-1639-2d27-16df-da3ec0ee364e")
    .addField("Name", { type: "string", length: 255 })
    .addField("country", { type: "string", length: 255 })
    .addField("city", { type: "string", length: 255 })
    .addField("address", { type: "string", length: 255 })
    .addInternalField("CurrentProcess")
    .inherit("DataProdCompany", "37fe059f-4b9a-4bc1-ae7c-a1b047819f47", "RootProdCompany", "4d09c24e-014e-4526-8cbe-5092faf1e015")
    .addField("MainProduct", { type: "string", length: 255 })
    .addField("Revenue", { type: "decimal", precision: 12, scale: 4 })
    .inherit("DataFoodCompany", "7e0e4003-5e44-4f29-b4b9-ebcd6fdf78c7", "RootFoodCompany", "0a446236-81ff-4168-9549-601f491ca25b")
    .addField("Category", { type: "string", length: 255 })
    .addField("NRetailers", { type: "int" });

metaDataMgr.getModel("DataTstCompany")
    .inherit("DataRegionalCompany", "279c2d99-20f3-484b-9c51-e67c6a13bf45", "RootRegionalCompany", "b8c00589-272c-40e2-9953-dca8ca03ee24")
    .addField("Region", { type: "string", length: 255 })
    .addField("MarketShare", { type: "float" });

metaDataMgr.getModel("DataProdCompany")
    .inherit("DataAutoCompany", "8005d322-bc8a-4762-a295-ddbce9505a7f", "RootAutoCompany", "959c1ab8-3b40-4624-aa18-2988e594dc84")
    .addField("Brand", { type: "string", length: 255 })
    .addField("IsLocal", { type: "boolean" });

metaDataMgr.addModel("DataTstContact", "27ce7537-7295-1a45-472c-a422e63035c7", "RootTstContact", "de984440-10bd-f1fd-2d50-9af312e1cd4f")
    .addField("parent", { type: "dataRef", model: "DataTstCompany", refAction: "parentRestrict", allowNull: false })
    .addField("firstname", { type: "string", length: 255 })
    .addField("lastname", { type: "string", length: 255 })
    .addField("birthdate", "datetime")
    .addField("country", { type: "string", length: 255 })
    .addField("city", { type: "string", length: 255 })
    .addField("address", { type: "string", length: 255 })
    .addInternalField("CurrentProcess")
    .inherit("DataSaleContact", "e1b82325-a429-4cd8-a876-8e87b5a546ce", "RootSaleContact", "e50decac-efd8-4c0e-be97-26678fe45ace")
    .addField("Region", { type: "string", length: 255 })
    .inherit("DataRetailSaleContact", "771170fe-4d21-44d9-ab51-7c10e89d9ab6", "RootRetailSaleContact", "ca1116d8-6fd3-4ba3-96da-852125822eb2")
    .addField("Product", { type: "string", length: 255 })
    .addField("OfficeNo", { type: "int" });

metaDataMgr.getModel("DataSaleContact")
    .inherit("DataCorpSaleContact", "5792a222-ac42-491f-9fcf-00c5d3abf1bf", "RootCorpSaleContact", "58a8e4bc-ff53-4b3b-8f6a-3e92c981bb54")
    .addField("Category", { type: "string", length: 255 })
    .addField("MinDealSum", { type: "decimal", precision: 16, scale: 4 });

metaDataMgr.getModel("DataTstContact")
    .inherit("DataExpertContact", "f42c40e5-e4ac-4f4c-986d-2e25ed0708ec", "RootExpertContact", "ab590096-5aef-482c-806c-b818adb05725")
    .addField("Specialty", { type: "string", length: 255 })
    .addField("Rating", { type: "decimal", precision: 5, scale: 2 });

metaDataMgr.addModel("DataContract", "08a0fad1-d788-3604-9a16-3544a6f97721", "RootContract", "4f7d9441-8fcc-ba71-2a1d-39c1a284fc9b")
    .addField("parent", { type: "dataRef", model: "DataTstCompany", refAction: "parentRestrict", allowNull: false })
    .addField("number", { type: "string", length: 255 })
    .addField("total", { type: "decimal", precision: 12, scale: 4 })
    .addInternalField("CurrentProcess");

metaDataMgr.addModel("DataAddress", "16ec0891-1144-4577-f437-f98699464948", "RootAddress", "07e64ce0-4a6c-978e-077d-8f6810bf9386")
    .addField("parent", { type: "dataRef", model: "DataTstContact", refAction: "parentRestrict", allowNull: false })
    .addField("country", { type: "string", length: 255 })
    .addField("city", { type: "string", length: 255 })
    .addField("address", { type: "string", length: 255 })
    .addInternalField("CurrentProcess");

metaDataMgr.addVirtualModel("VirtualAddress", "4e447618-1da8-42cc-b38e-792aedc40c55", "RootVAddress", "bf23f959-450e-4f5b-bd2b-770cfbf54d4f")
    .setDefaultSQL("select id, parent, country, city, address from DataAddress")
    .addField("id", { type: "int" })
    .addField("parent", { type: "dataRef", model: "DataTstContact", refAction: "parentRestrict", allowNull: false })
    .addField("country", { type: "string", length: 255 })
    .addField("city", { type: "string", length: 255 })
    .addField("address", { type: "string", length: 255 });

metaDataMgr.addVirtualModel("VirtualTaskList", "175caa6f-cbd6-4aed-bac1-a2e255c8e7e9", "RootVTaskList", "3fef38a9-08c4-4e38-81d1-ceb814eae9c2")
    .setDefaultSQL(
    "SELECT p.Id AS TaskId, t.Number, p.Name, COALESCE(s.StageCode,'Under Construction') AS Stage,\n" +
        "  r.Id AS RequestId, t.ObjId, u.ResGuid, u.Name TaskDefName\n" +
        "FROM Process p\n" +
        "  JOIN Task t ON t.ParentId = p.Id\n" +
        "  JOIN SysResVer v ON v.Id = p.DefinitionId\n" +
        "  JOIN SysResource u ON u.Id = v.ResId\n" +
        "  JOIN Request r ON r.ProcessId = p.Id AND r.State = 0\n" +
        "  LEFT JOIN TaskStageLog l ON l.Id = t.TaskStageLogId\n" +
        "  LEFT JOIN TaskStage s ON s.Id = l.TaskStageId")
    .addField("TaskId", { type: "int" })
    .addField("Number", { type: "string", length: 20 })
    .addField("Name", { type: "string", length: 255 })
    .addField("Stage", { type: "string", length: 20 })
    .addField("RequestId", { type: "int" })
    .addField("ObjId", { type: "int" })
    .addField("ResGuid", { type: "guid" })
    .addField("TaskDefName", { type: "string", length: 255 });

metaDataMgr.addDataModel("DataModelTest").addDbTreeModel("DataCompanyTree", { resName: "DataTstCompany" })
    .addDataSource({
        model: { resName: "DataTstContact" },
        field: {
            resName: "DataTstContact",
            elemName: "parent",
        }
    }).addDataSource({
        model: { resName: "DataContract" },
        field: {
            resName: "DataContract",
            elemName: "parent",
        }
    })
    .getDataSource("DataTstContact").addDataSource({
        model: { resName: "DataAddress" },
        field: {
            resName: "DataAddress",
            elemName: "parent",
        }
    });

metaDataMgr.addDataModel("MemModelTest").addMemTreeModel("MemCompanyTree", "1821b56b-7446-4428-93b5-c121c265e4bc")
    .addDataSource("Contacts")
    .addDataSource("Contracts")
    .getDataSource("Contacts").addDataSource("Addresses");

metaDataMgr.addDataModel("DMTaskList").addDbTreeModel("TaskListTree", { resName: "VirtualTaskList" })

// Стартовые параметры Task
var dm = metaDataMgr.addDataModel("TaskParams");
dm.addMemTreeModel("TaskParamsTree", "b3746562-946f-46f6-b74f-a50eaff7a771", UCCELLO_CONFIG.classGuids.ProcParamTreeRoot)
    .addDataSource("TaskStages");
dm.getTreeRoot("TaskParamsTree").setParameter("ProcessDefName", "Simple Task Definition");

// Переменные процесса
var dm = metaDataMgr.addDataModel("ProcessVars");
dm.addMemTreeModel("ProcessVarsTree", "b8fd05dc-08de-479e-8557-dba372e2b4b6", UCCELLO_CONFIG.classGuids.ProcDataTreeRoot)
    .addDataSource("TaskStages");
dm.getTreeRoot("ProcessVarsTree").setParameter("ProcessId", -1);

// Task Request
var dm = metaDataMgr.addDataModel("RequestData");
dm.addMemTreeModel("RequestDataTree", "31809e1f-a2c2-4dbb-b653-51e8bdf950a2", UCCELLO_CONFIG.classGuids.RequestTreeRoot)
    .addDataSource("AvailableNodes");
dm.getTreeRoot("RequestDataTree").setParameter("RequestId", -1);

// DataTstCompany + DataContract + (DataTstCompany.Id = -1)
dm = metaDataMgr.addDataModel("CreateCompany");
dm.addDbTreeModel("DataCompanyTree", { resName: "DataTstCompany" })
    .addDataSource({
    model: { resName: "DataContract" },
    field: {
        resName: "DataContract",
        elemName: "parent",
    }
});
var filter = dm.getTreeRoot("DataCompanyTree").getFilter();
filter.addParameter({ name: "ObjId", ptype: "int" });
filter.addCondition({ leftExp: { field: "Id"}, op: "=", rightExp: { param: "ObjId" } });
dm.getTreeRoot("DataCompanyTree").setParameter("ObjId", -1);

metaDataMgr.addModel("DataLeadLog", "c4fa07b5-03f7-4041-6305-fbd301e7408a", "RootLeadLog", "bedf1851-cd51-657e-48a0-10ac45e31e20")
    .addField("LeadId", { type: "dataRef", model: "DataLead", refAction: "parentCascade", allowNull: true })
    .addField("Date", "datetime")
    .addField("Content", { type: "string", length: 255 })
    .addInternalField("CurrentProcess");

metaDataMgr.addModel("DataIncomeplan", "56cc264c-5489-d367-1783-2673fde2edaf", "RootIncomeplan", "194fbf71-2f84-b763-eb9c-177bf9ac565d")
    .addField("LeadId", { type: "dataRef", model: "DataLead", refAction: "parentRestrict", allowNull: true })
    .addField("date", "datetime")
    .addField("amount", { type: "decimal", precision: 12, scale: 4 })
    .addField("comment", { type: "string", length: 255 })
    .addInternalField("CurrentProcess");

metaDataMgr.addModel("DataOpportunity", "5b64caea-45b0-4973-1496-f0a9a44742b7", "RootOpportunity", "3fe7cd6f-b146-8898-7215-e89a2d8ea702")
    .addField("State", { type: "string", length: 255 })
    .addField("CompanyId", "int")
    .addField("LeadId", { type: "dataRef", model: "DataLead", refAction: "parentRestrict", allowNull: true })
    .addField("OwnerId", "int")
    .addField("Description", { type: "string", length: 255 })
    .addField("Probability", "int")
    .addField("Amount", { type: "decimal", precision: 12, scale: 4 })
    .addField("CloseDate", "datetime")
    .addInternalField("CurrentProcess");

metaDataMgr.addModel("DataCompany", "59583572-20fa-1f58-8d3f-5114af0f2c51", "RootCompany", "0c2f3ec8-ad4a-c311-a6fa-511609647747")
    .addField("CompanyId", "int")
    .addField("Company", { type: "string", length: 255 })
    .addField("Industry", { type: "string", length: 255 })
    .addField("NbEmpl", "int")
    .addField("City", { type: "string", length: 255 })
    .addField("Address", { type: "string", length: 255 })
    .addField("PostalCode", { type: "string", length: 255 })
    .addInternalField("CurrentProcess");

metaDataMgr.addModel("DataContact", "73596fd8-6901-2f90-12d7-d1ba12bae8f4", "RootContact", "ad17cab2-f41a-36ef-37da-aac967bbe356")
    .addField("CompanyId", { type: "dataRef", model: "DataCompany", refAction: "parentCascade", allowNull: true })
    .addField("FirstName", { type: "string", length: 255 })
    .addField("LastName", { type: "string", length: 255 })
    .addField("Title", { type: "string", length: 255 })
    .addField("MobilePhone", { type: "string", length: 255 })
    .addField("WorkPhone", { type: "string", length: 255 })
    .addField("Email", { type: "string", length: 255 })
    .addInternalField("CurrentProcess");

function forceDir(dir) {
    var stats;
    try {
        stats = fs.statSync(dir);
    } catch (err) {
    };
    if ((!stats) || (!stats.isDirectory()))
        fs.mkdirSync(dir);
};

forceDir("./meta");
forceDir("./objTrees");
forceDir("./typesData");
dataObjectEngine.saveSchemaToFile("./meta", "db");
dataObjectEngine.saveSchemaToFile("./objTrees", "db", "objectTree");
dataObjectEngine.saveSchemaTypesToFile("./typesData", "db");
console.log("Generation finished !!!");
process.exit(0);
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

