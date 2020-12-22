'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require('events');
let globalObj = {};
globalObj.event = new EventEmitter();
globalObj.is = function (m) {
    if (typeof globalObj[m] === 'function') {
        return globalObj[m](...[...arguments].slice(1));
    }
    else {
        console.error('Global function "' + m + '" does not exist');
        return new Error('Global function "' + m + '" does not exist');
    }
};
exports.default = globalObj;
