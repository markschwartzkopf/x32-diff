'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const global_1 = __importDefault(require("./global"));
global_1.default.server = {};
const express_1 = __importDefault(require("express"));
const app = express_1.default();
const ws_1 = __importDefault(require("ws"));
class myWebSocket extends ws_1.default {
    constructor() {
        super(...arguments);
        this.isAlive = true;
        this.ip = 'no ip given';
    }
}
app.use(express_1.default.static(__dirname + '/../public', { index: 'index.html' }));
const server = app.listen(80, () => console.log('Listening on port 80.'));
const wss = new ws_1.default.Server({ server });
wss.on('connection', (ws, req) => {
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
        ws.send(JSON.stringify(global_1.default.is('processApiCmd', '{ "command": "init" }')));
    };
    ws.pushOsc = (osc) => {
        ws.send(JSON.stringify({ type: 'osc', data: osc }));
    };
    ws.pushFiles = (files) => {
        ws.send(JSON.stringify({ type: 'files', data: files }));
    };
    global_1.default.event.on('pushAllOsc', ws.pushAllOsc);
    global_1.default.event.on('osc', ws.pushOsc);
    global_1.default.event.on('activeFiles', ws.pushFiles);
    ws.on('close', () => {
        global_1.default.event.removeListener('pushAllOsc', ws.pushAllOsc);
        global_1.default.event.removeListener('osc', ws.pushOsc);
        global_1.default.event.removeListener('activeFiles', ws.pushFiles);
        console.log('Connection properly closed for: ' + ws.ip);
    });
    ws.on('message', (msg) => {
        /* console.log(
          'msg from:' + ws._socket.remoteAddress.replace(/^.*:/, '') + ':\n' + msg
        ); */
        ws.send(JSON.stringify(global_1.default.is('processApiCmd', msg)));
    });
});
const beatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            ws.terminate();
            console.log('closed dead connection for: ' + ws.ip);
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);
global_1.default.connectedClients = () => {
    let clients = [];
    wss.clients.forEach((ws) => {
        clients.push(ws.ip);
    });
    return clients;
};
wss.on('close', () => {
    clearInterval(beatInterval);
});
