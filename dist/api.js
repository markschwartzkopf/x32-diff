'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const global_1 = __importDefault(require("./global"));
global_1.default.processApiCmd = (msgJSON) => {
    console.log('apiMsg: ' + msgJSON);
    let msg = JSON.parse(msgJSON);
    switch (msg.command) {
        case 'init':
            console.log('init');
            return { type: 'full', data: global_1.default.diff };
            break;
        case 'refresh':
            console.log('refresh');
            global_1.default.event.emit('refresh');
            return { type: 'info', data: 'Refresh command received' };
            break;
        default:
            return {
                type: 'error',
                data: 'Invalid command received',
            };
    }
};
