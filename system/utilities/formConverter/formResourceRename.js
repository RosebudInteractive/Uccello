var fs = require('fs');
var path = require('path');
var Config = require('../../../config/config.js')
var config = new Config();

var resNames = {};

if (process.argv.length == 2) {
    console.log("Please provide folder with forms in arguments");
    process.exit(-1);
} if (process.argv.length > 3) {
    console.log("Please provide only one parameter in arguments");
    process.exit(-1);
}

var classNames = {};
for (var name in config.classGuids) {
    var guid = config.classGuids[name];
    classNames[guid] = name;
}

var formsPath = process.argv[2];
fs.stat(formsPath, function(err, stats) {
    if (err && err.errno === 34) {
        console.error("Path not found");
        process.exit(-1);
    } if (err) {
        console.error("Convertion failed: " + err.message);
        process.exit(-1);
    }

    var files = fs.readdirSync(formsPath);

    for (var i = 0; i < files.length; i++) {
        var fName = files[i];
        if (path.extname(fName).toLowerCase() == ".json") {
            var fullName = path.join(formsPath, fName);
            var data = fs.readFileSync(fullName, 'utf8');
            if (data) {
                var form = JSON.parse(data);
                var convertedForm = convertObject(form);
                if (convertedForm)
                    fs.writeFileSync(fullName, JSON.stringify(convertedForm, null, 2));
            } else {
                console.log("Error reading file " + fullName);
                process.exit(-1);
            }
        }
    }

    process.exit(0);
});

function convertObject(form) {
    if (form["$sys"].typeGuid != "10217b8e-b1f8-4221-a419-f20735219dd2") return null;

    if ("Children" in form.collections) return null;
    form.collections.Children = form.collections.Form;
    delete form.collections.Form;

    convertControl(form.collections.Children[0]);

    return form;
}

function convertControl(control) {
    control.fields.Id = control.fields.ResElemName;

    if (!(control.fields.Name) || control.fields.Name in resNames) {
        var className = classNames[control.$sys.typeGuid] || "UnknownClass";
        resNum = 1;
        while ((className + resNum) in resNames) resNum++;
        var resName = className + resNum;
        control.fields.ResElemName = resName;
        resNames[resName] = true;
    } else {
        control.fields.ResElemName = control.fields.Name
        resNames[control.fields.ResElemName] = true;
    }

    var cols = control.collections;
    if (cols) {
        for (var colName in cols) {
            var collection = cols[colName];
            for (var i in collection) {
                convertControl(collection[i]);
            }
        }
    }
    return resName;
}
