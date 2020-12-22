'use strict';
export {};
import globalObj from './global';

globalObj.processApiCmd = (msgJSON: string): apiObject => {
  console.log('apiMsg: ' + msgJSON);
  let msg: apiCommand = JSON.parse(msgJSON);
  switch (msg.command) {
    case 'init':
      console.log('init');
      return { type: 'full', data: globalObj.diff };
      break;
    case 'refresh':
      console.log('refresh');
      globalObj.event.emit('refresh');
      return { type: 'info', data: 'Refresh command received'}
      break;
    default:
      return {
        type: 'error',
        data: 'Invalid command received',
      };
  }
};
