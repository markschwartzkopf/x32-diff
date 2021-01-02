'use strict';
export {};
import globalObj from './global';
import fs from 'fs';
import X32 from './x32';
const config = require('./../x32-files/config.json');

const X32_address = '192.168.1.53';

let activeFiles: string[] = [];

let x32 = new X32(X32_address);

function oscFileToObject(filename: string, ignore?: string[]) {
  return new Promise((res, rej) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        rej('File error:' + err);
      } else {
        let inStrings = data.toString().split('\n');
        let outStrings: string[] = [];
        if (ignore) {
          for (let x = 0; x < inStrings.length; x++) {
            let push = true;
            for (let y = 0; y < ignore.length; y++) {
              if (inStrings[x].slice(0, ignore[y].length) == ignore[y]) {
                push = false;
              }
            }
            if (push) outStrings.push(inStrings[x]);
          }
        } else outStrings = inStrings;

        let obj: any = X32.oscToObject(outStrings);
        res(obj);
      }
    });
  });
}

globalObj.reference = [];
for (let x = 0; x < config.files.length; x++) {
  let ignore = [];
  if (config.files[x].ignore) ignore = config.files[x].ignore;
  oscFileToObject(__dirname + '/../x32-files/' + config.files[x].file, ignore)
    .then((obj: any) => {
      globalObj.reference[x] = {
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
  globalObj.event.on('refresh', () => {
    x32.populateOsc();
  });
});
x32.on('disconnected', () => {
  console.log('X32 disconnected.');
});
x32.on('populated', () => {
  console.log('X32 populated');
  globalObj.event.emit('pushAllOsc');
});

x32.on('osc', (oscObject) => {
  let oldFiles = activeFiles.slice(0);
  activeFiles = [];
  let smallDiff: diffObject = {};
  if (!globalObj.diff) globalObj.diff = {};

  for (let x = 0; x < globalObj.reference.length; x++) {
    let evaluate = true;
    if (Array.isArray(globalObj.reference[x].conditionals))
      for (let y = 0; y < globalObj.reference[x].conditionals.length; y++) {
        let conditional = globalObj.reference[x].conditionals[y].split(' ');
        let path = conditional[0].slice(1).split('/');
        if (conditional[1] != getObjVal(path, x32.oscObj)) evaluate = false;
      }
    if (evaluate) {
      activeFiles.push(globalObj.reference[x].name);
      globalObj.diff[globalObj.reference[x].name] = X32.getDiffObj(
        globalObj.reference[x].obj,
        x32.oscObj
      );
      if (oscObject) {
        smallDiff[globalObj.reference[x].name] = X32.getTinyDiffObj(
          globalObj.reference[x].obj,
          oscObject
        );
      }
    } else globalObj.diff[globalObj.reference[x].name] = {};
  }
  for (const key in globalObj.diff) {
    if (Object.keys(globalObj.diff[key]).length === 0) {
      delete globalObj.diff[key];
    } else {
      globalObj.diff[key].shown = false;
    }
  }
  for (const key in smallDiff) {
    if (Object.keys(smallDiff[key]).length === 0) {
      delete smallDiff[key];
    }
  }
  if (Object.keys(smallDiff).length != 0) {
    globalObj.event.emit('osc', smallDiff);
  }
  if (JSON.stringify(activeFiles) != JSON.stringify(oldFiles)) {
    globalObj.event.emit('pushAllOsc');
    //globalObj.event.emit('activeFiles', activeFiles);
  }
});

function getObjVal(path: string[], obj: { [key: string]: any }): string | null {
  if (obj[path[0]]) {
    if (path.length == 1) {
      if (typeof obj[path[0]] == 'string') {
        return obj[path[0]];
      } else return null;
    } else if (typeof obj[path[0]] == 'object') {
      return getObjVal(path.slice(1), obj[path[0]]);
    } else return null;
  } else return null;
}
