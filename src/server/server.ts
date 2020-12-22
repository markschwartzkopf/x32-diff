'use strict';
export {};
import globalObj from './global';
globalObj.server = {};

import express from 'express';
const app = express();
import WebSocket from 'ws';

class myWebSocket extends WebSocket {
  isAlive: boolean = true;
  ip: string = 'no ip given';
  pushAllOsc?: () => void;
  pushOsc?: (osc: any) => void;
  pushFiles?: (files: string[]) => void;
}

app.use(express.static(__dirname + '/../public', { index: 'index.html' }));

const server = app.listen(80, () => console.log('Listening on port 80.'));

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: myWebSocket, req) => {
  if (req.socket.remoteAddress) {
    ws.ip = req.socket.remoteAddress.replace(/^.*:/, '');
  }
  console.log('Client connected: ' + ws.ip);
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.pushAllOsc = () => {
    console.log('pushing OSC object to ' + ws.ip);
    ws.send(
      JSON.stringify(globalObj.is('processApiCmd', '{ "command": "init" }'))
    );
  };
  ws.pushOsc = (osc: any) => {
    ws.send(JSON.stringify({ type: 'osc', data: osc }));
  };
  ws.pushFiles = (files) => {
    ws.send(JSON.stringify({ type: 'files', data: files }));
  };
  globalObj.event.on('pushAllOsc', ws.pushAllOsc);
  globalObj.event.on('osc', ws.pushOsc);
  globalObj.event.on('activeFiles', ws.pushFiles);
  ws.on('close', () => {
    globalObj.event.removeListener('pushAllOsc', ws.pushAllOsc);
    globalObj.event.removeListener('osc', ws.pushOsc);
    globalObj.event.removeListener('activeFiles', ws.pushFiles);
    console.log('Connection properly closed for: ' + ws.ip);
  });
  ws.on('message', (msg: string) => {
    /* console.log(
      'msg from:' + ws._socket.remoteAddress.replace(/^.*:/, '') + ':\n' + msg
    ); */
    ws.send(JSON.stringify(globalObj.is('processApiCmd', msg)));
  });
});

const beatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if ((<myWebSocket>ws).isAlive === false) {
      ws.terminate();
      console.log('closed dead connection for: ' + (<myWebSocket>ws).ip);
    }
    (<myWebSocket>ws).isAlive = false;
    ws.ping();
  });
}, 30000);

globalObj.connectedClients = () => {
  let clients: string[] = [];
  wss.clients.forEach((ws) => {
    clients.push((<myWebSocket>ws).ip);
  });
  return clients;
};

wss.on('close', () => {
  clearInterval(beatInterval);
});
