'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const global_1 = __importDefault(require("./global"));
const fs_1 = __importDefault(require("fs"));
const x32_1 = __importDefault(require("./x32"));
const config = require('./../x32-files/config.json');
const X32_address = '192.168.1.53';
let activeFiles = [];
let x32 = new x32_1.default(X32_address);
function oscFileToObject(filename, ignore) {
    return new Promise((res, rej) => {
        fs_1.default.readFile(filename, (err, data) => {
            if (err) {
                rej('File error:' + err);
            }
            else {
                let inStrings = data.toString().split('\n');
                let outStrings = [];
                if (ignore) {
                    for (let x = 0; x < inStrings.length; x++) {
                        let push = true;
                        for (let y = 0; y < ignore.length; y++) {
                            if (inStrings[x].slice(0, ignore[y].length) == ignore[y]) {
                                push = false;
                            }
                        }
                        if (push)
                            outStrings.push(inStrings[x]);
                    }
                }
                else
                    outStrings = inStrings;
                let obj = x32_1.default.oscToObject(outStrings);
                res(obj);
            }
        });
    });
}
global_1.default.reference = [];
for (let x = 0; x < config.files.length; x++) {
    let ignore = [];
    if (config.files[x].ignore)
        ignore = config.files[x].ignore;
    oscFileToObject(__dirname + '/../x32-files/' + config.files[x].file, ignore)
        .then((obj) => {
        global_1.default.reference[x] = {
            obj: obj,
            name: config.files[x].name,
            conditionals: config.files[x].conditionals,
        };
    })
        .catch((err) => console.error(err));
}
x32.on('message', (msg) => {
    //console.log('msg: ' + JSON.stringify(msg));
});
x32.on('connected', () => {
    console.log('X32 connected');
    global_1.default.event.on('refresh', () => {
        x32.populateOsc();
    });
});
x32.on('disconnected', () => {
    console.log('X32 disconnected.');
});
x32.on('populated', () => {
    console.log('X32 populated');
    global_1.default.event.emit('pushAllOsc');
});
x32.on('osc', (oscObject) => {
    let oldFiles = activeFiles.slice(0);
    activeFiles = [];
    let smallDiff = {};
    if (!global_1.default.diff)
        global_1.default.diff = {};
    for (let x = 0; x < global_1.default.reference.length; x++) {
        let evaluate = true;
        if (Array.isArray(global_1.default.reference[x].conditionals))
            for (let y = 0; y < global_1.default.reference[x].conditionals.length; y++) {
                let conditional = global_1.default.reference[x].conditionals[y].split(' ');
                let path = conditional[0].slice(1).split('/');
                if (conditional[1] != getObjVal(path, x32.oscObj))
                    evaluate = false;
            }
        if (evaluate) {
            activeFiles.push(global_1.default.reference[x].name);
            global_1.default.diff[global_1.default.reference[x].name] = x32_1.default.getDiffObj(global_1.default.reference[x].obj, x32.oscObj);
            if (oscObject) {
                smallDiff[global_1.default.reference[x].name] = x32_1.default.getTinyDiffObj(global_1.default.reference[x].obj, oscObject);
            }
        }
        else
            global_1.default.diff[global_1.default.reference[x].name] = {};
    }
    for (const key in global_1.default.diff) {
        if (Object.keys(global_1.default.diff[key]).length === 0) {
            delete global_1.default.diff[key];
        }
        else {
            global_1.default.diff[key].shown = false;
        }
    }
    for (const key in smallDiff) {
        if (Object.keys(smallDiff[key]).length === 0) {
            delete smallDiff[key];
        }
    }
    if (Object.keys(smallDiff).length != 0) {
        global_1.default.event.emit('osc', smallDiff);
    }
    if (JSON.stringify(activeFiles) != JSON.stringify(oldFiles)) {
        global_1.default.event.emit('pushAllOsc');
        //globalObj.event.emit('activeFiles', activeFiles);
    }
});
function getObjVal(path, obj) {
    if (obj[path[0]]) {
        if (path.length == 1) {
            if (typeof obj[path[0]] == 'string') {
                return obj[path[0]];
            }
            else
                return null;
        }
        else if (typeof obj[path[0]] == 'object') {
            return getObjVal(path.slice(1), obj[path[0]]);
        }
        else
            return null;
    }
    else
        return null;
}
