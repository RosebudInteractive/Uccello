/**
 * Created by kiknadze on 18.02.2016.
 */

var fs = require('fs');
var path = require('path');

if (process.argv.length == 2) {
    console.log("Please provide folder with forms in arguments");
    process.exit(-1);
} if (process.argv.length > 3) {
    console.log("Please provide only one parameter in arguments");
    process.exit(-1);
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

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function convertObject(form) {
    if (form["$sys"].typeGuid == "10217b8e-b1f8-4221-a419-f20735219dd2") return null;

    var resName = 1;

    var converted = {
        "$sys": {
            "guid": form["$sys"].guid,
            "typeGuid": "10217b8e-b1f8-4221-a419-f20735219dd2"
        },
        "fields": {
            "Id": 1,
            "ResName": form.fields.Title
        },
        "collections": {
            "Form": [form]
        }
    };

    form["$sys"].guid = guid();
    convertControl(form, resName);

    return converted;
}

function convertControl(control, resName) {
    control.fields.ResElemName = resName.toString();
    resName++;
    var cols = control.collections;
    if (cols) {
        for (var colName in cols) {
            var collection = cols[colName];
            for (var i = 0; i < collection.length; i++) {
                resName = convertControl(collection[i], resName);
            }
        }
    }
    return resName;
}



