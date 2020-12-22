'use strict';
const EventEmitter = require('events');
let globalObj: any = {};
globalObj.event = new EventEmitter();
globalObj.is = function (m: string) {
  if (typeof globalObj[m] === 'function') {
    return globalObj[m](...[...arguments].slice(1));
  } else {
    console.error('Global function "' + m + '" does not exist');
    return new Error('Global function "' + m + '" does not exist');
  }
};

export default globalObj;
