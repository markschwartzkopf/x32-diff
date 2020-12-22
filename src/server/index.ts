'use strict';
import globalObj from './global';
import fs from 'fs';
const x32json = require('./../x32.json');
import('./server');
import('./api');
import('./mixer');



//testing code:
import x32 from './x32';



/* function oscFileToObject(filename: string) {
  return new Promise((res, rej) => {
    fs.readFile(filename, (err, data) => {
      if (err) {
        rej('File error:' + err);
      } else {
        let dataStrings = data.toString().split('\n');
        let obj: any = x32.oscToObject(dataStrings);
        res(obj);
      }
    });
  });
} */

/* oscFileToObject(__dirname + '/../x32-files/GDQ_Studio.scn')
  .then((obj) => {
    globalObj.refObject = obj;
    oscFileToObject(__dirname + '/../x32-files/GDQ_Studio_tst.scn')
      .then((obj) => {
        globalObj.oscObject = obj;
        globalObj.diff = getDiffObj(globalObj.refObject, globalObj.oscObject);
        //console.log(JSON.stringify(globalObj.diff, null, 2));
      })
      .catch((err) => {
        console.error(err);
      });
  })
  .catch((err) => {
    console.error(err);
  }); */

/* oscFileToObject(__dirname + '/../x32-files/S.scn').then((obj: any) => {
  globalObj.refObject = obj;
}); */

/* function getDiffObj(ref: oscObject, osc: oscObject): diffObject {
  let returnObj: diffObject = {};
  for (const key in ref) {
    if (
      typeof ref[key] == 'string' &&
      typeof osc[key] == 'string' &&
      ref[key] != osc[key]
    ) {
      returnObj[key] = { reference: ref[key], current: osc[key], shown: false };
    }
    if (typeof ref[key] == 'object' && typeof osc[key] == 'object') {
      returnObj[key] = getDiffObj(ref[key], osc[key]);
      if (Object.keys(returnObj[key]).length == 0) delete returnObj[key];
    }
  }
  if (Object.keys(returnObj).length > 0) returnObj.shown = false;
  return returnObj;
} */






