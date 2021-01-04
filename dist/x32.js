'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter = require('events');
const dgram_1 = __importDefault(require("dgram"));
const x32json = require('./../x32.json');
const x32nodes = require('./../x32nodes');
const x32luts = require('./../x32luts');
const X32_UDP_PORT = 10023;
class X32 extends EventEmitter {
    constructor(X32_address, localAddress, localPort) {
        super();
        this.connected = false;
        this.checkers = [];
        this.oscObj = {};
        this.on('connected', () => {
            this.connected = true;
        });
        this.on('disconnected', () => {
            this.connected = false;
        });
        if (!localAddress)
            localAddress = '0.0.0.0';
        if (!localPort)
            localPort = 52361;
        this.socket = dgram_1.default.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket.bind(localPort, localAddress, () => {
            this.socket.connect(X32_UDP_PORT, X32_address, () => {
                this.emit('connected');
                this.subscribe('/xremote');
                this.populateOsc();
                this.socket.on('message', (msg, rinfo) => {
                    let msgObj = X32.bufToObj(msg);
                    //console.log(msg.toString())
                    //console.log(msg);
                    if (typeof msgObj == 'object') {
                        let oscMsgObj = msgObj;
                        for (let x = 0; x < this.checkers.length; x++) {
                            this.checkers[x](oscMsgObj, x);
                        }
                        if (msgObj.command == 'xremote') {
                            if (msgObj.address.slice(0, 3) == 'fx/' &&
                                msgObj.address.slice(4, 8) == '/par') {
                                this.getNode(0, msgObj.address.slice(0, 8))
                                    .then((msgs) => {
                                    for (let y = 0; y < msgs.length; y++) {
                                        X32.addToObject(this.oscObj, msgs[y].address.split('/'), msgs[y].values, undefined, () => {
                                            let tinyOscObject = {};
                                            X32.addToObject(tinyOscObject, msgs[y].address.split('/'), msgs[y].values, undefined, () => {
                                                this.emit('osc', tinyOscObject);
                                            });
                                        });
                                    }
                                })
                                    .catch((err) => {
                                    console.error(err);
                                });
                            }
                            else {
                                X32.addToObject(this.oscObj, msgObj.address.split('/'), msgObj.values, undefined, () => {
                                    let tinyOscObject = {};
                                    X32.addToObject(tinyOscObject, oscMsgObj.address.split('/'), oscMsgObj.values, undefined, () => {
                                        this.emit('osc', tinyOscObject);
                                    });
                                });
                            }
                        }
                        //console.log(JSON.stringify(this.oscObj, null, 2));
                    }
                    this.emit('message', msgObj, rinfo);
                });
            });
        });
    }
    subscribe(address) {
        let command = X32.strToBuf(address);
        this.send(command);
        this.subscriptions = setInterval(() => {
            this.send(command);
        }, 9000);
    }
    send(msg) {
        this.socket.send(msg, (err) => {
            if (err)
                console.error(err);
        });
    }
    populateOsc() {
        (async () => {
            for (let x = 0; x < x32nodes.length; x++) {
                await this.getNode(x)
                    .then((msgs) => {
                    for (let y = 0; y < msgs.length; y++) {
                        X32.addToObject(this.oscObj, msgs[y].address.split('/'), msgs[y].values);
                    }
                })
                    .catch((err) => {
                    x = x32nodes.length + 1;
                    console.error(err);
                });
            }
            this.emit('populated');
            this.emit('osc');
        })();
    }
    getNode(index, address) {
        return new Promise((res, rej) => {
            let command = X32.strToBuf('/node');
            let format = X32.strToBuf(',s');
            if (!address)
                address = x32nodes[index];
            let splitter = address.indexOf('[');
            if (splitter == -1)
                splitter = address.indexOf('{');
            if (splitter == -1) {
                let arg = X32.strToBuf(address);
                let message = Buffer.concat([command, format, arg]);
                let retry = setInterval(() => {
                    attempts++;
                    //console.log('now doing attempt ' + attempts)
                    this.send(message);
                    if (attempts > 5) {
                        this.checkers = [];
                        this.emit('disconnected');
                        rej('X32 has not responded after 5 attempts. Failed message:' +
                            message.toString());
                        clearInterval(retry);
                    }
                }, 1000);
                let attempts = 1;
                let checker = (msg, x) => {
                    if (msg.command == 'node' && msg.address == address) {
                        clearInterval(retry);
                        res([msg]);
                        this.checkers.splice(x, 1);
                    }
                };
                this.checkers.push(checker);
                this.send(message);
            }
            else {
                let splitter2 = address.indexOf(']');
                let splitString = '...';
                if (address[splitter] == '{') {
                    splitter2 = address.indexOf('}');
                    splitString = ',';
                }
                let prefix = address.slice(0, splitter);
                let infix = address
                    .slice(splitter + 1, splitter2)
                    .split(splitString);
                let suffix = address.slice(splitter2 + 1);
                if (infix.length == 2 || splitString == ',') {
                    if (splitString == '...') {
                        let range = [
                            parseInt(infix[0]),
                            parseInt(infix[1]),
                            infix[0].length,
                        ];
                        infix = [];
                        for (let i = range[0]; i <= range[1]; i++) {
                            let infixElem = i.toString();
                            while (infixElem.length < range[2])
                                infixElem = '0' + infixElem;
                            infix.push(infixElem);
                        }
                    }
                    (async () => {
                        let rslv = [];
                        for (let i = 0; i < infix.length; i++) {
                            await this.getNode(-1, prefix + infix[i] + suffix)
                                .then((msgs) => {
                                rslv = [...rslv, ...msgs];
                            })
                                .catch((err) => {
                                i = infix.length + 1;
                                rej(err);
                            });
                        }
                        res(rslv);
                    })();
                }
                else {
                    rej('Invalid node address');
                }
            }
        });
    }
    static strToBuf(str) {
        let buf = Buffer.from(str);
        let bufPad = Buffer.alloc(4 - (buf.length % 4));
        return Buffer.concat([buf, bufPad]);
    }
    static bufToObj(buf) {
        let index = buf.indexOf(0x00);
        let command = buf.toString('utf-8', 0, index); //command
        index = index + 4 - (index % 4);
        let buff = buf.slice(index);
        switch (command) {
            case 'node':
                index = buff.indexOf(0x00);
                let format = buff.toString('utf-8', 1, index); //starts at 1 to chop off leading comma
                if (format != 's')
                    return 'error';
                index = index + 4 - (index % 4);
                buff = buff.slice(index);
                index = buff.indexOf(0x0a);
                let oscNode = X32.parseNode(buff.toString('utf-8', 1, index)); //starts at 1 to chop off leading slash
                let address = oscNode.path.join('/');
                return { command: command, address: address, values: oscNode.values };
                break;
            case '/':
                console.log(buff.toString());
                return 'fix me ' + buff.toString();
            default:
                //assume type leafAddress from "/xremote" subscription
                let xaddress = command.slice(1);
                command = 'xremote';
                if (xaddress[0] == '-')
                    return 'unneeded update';
                let xformat = X32.getFormat(xaddress);
                if (xformat.slice(0, 5) == 'error')
                    return xformat;
                index = buff.indexOf(0x00);
                let oscFormat = buff.toString('utf-8', 1, index); //starts at 1 to chop off leading comma
                index = index + 4 - (index % 4);
                buff = buff.slice(index);
                let xvalue = '';
                if (xformat[0] == '[') {
                    let formatArr = JSON.parse(xformat);
                    if (formatArr[0] == 'int' && typeof formatArr[1] == 'number') {
                        //int
                        if (oscFormat != 'i')
                            return 'error: invalid osc format';
                        xvalue = buff.readInt32BE().toString();
                    }
                    else if (formatArr[0] == 'bitmap' &&
                        typeof formatArr[1] == 'number') {
                        //bitmap
                        if (oscFormat != 'i')
                            return 'error: invalid osc format';
                        xvalue = buff.readInt32BE().toString(2);
                        while (xvalue.length < formatArr[1])
                            xvalue = '0' + xvalue;
                        xvalue = '%' + xvalue;
                    }
                    else if (formatArr.length == 3 && typeof formatArr[0] == 'number') {
                        //linf
                        if (oscFormat != 'f')
                            return 'error: invalid osc format';
                        let baseFloat = buff.readFloatBE();
                        let stepNumber = (formatArr[1] - formatArr[0]) / formatArr[2];
                        baseFloat *= stepNumber;
                        baseFloat = Math.round(baseFloat);
                        baseFloat /= stepNumber;
                        baseFloat *= formatArr[1] - formatArr[0];
                        baseFloat += formatArr[0];
                        xvalue = baseFloat.toString();
                    }
                    else {
                        //enum
                        if (oscFormat != 'i')
                            return 'error: invalid osc format';
                        let enumIndex = buff.readInt32BE();
                        xvalue = formatArr[enumIndex];
                    }
                }
                else {
                    switch (JSON.parse(xformat)) {
                        case 'level':
                            if (oscFormat != 'f')
                                return 'error: invalid osc format';
                            let levelFloat = buff.readFloatBE();
                            let db = 1337;
                            if (levelFloat == 0) {
                                xvalue = '-oo';
                            }
                            else {
                                if (levelFloat >= 0.5) {
                                    db = levelFloat * 40 - 30;
                                }
                                else if (levelFloat >= 0.25) {
                                    db = levelFloat * 80 - 50;
                                }
                                else if (levelFloat >= 0.0625) {
                                    db = levelFloat * 160 - 70;
                                }
                                else if (levelFloat >= 0.0) {
                                    db = levelFloat * 480 - 90;
                                }
                                xvalue = (Math.round(db * 10) / 10).toString();
                            }
                            break;
                        case 'level161':
                            if (oscFormat != 'f')
                                return 'error: invalid osc format';
                            let float161 = buff.readFloatBE();
                            float161 = Math.round(float161 * 160) / 160;
                            let db161 = 1337;
                            if (float161 == 0) {
                                xvalue = '-oo';
                            }
                            else {
                                if (float161 >= 0.5) {
                                    db161 = float161 * 40 - 30;
                                }
                                else if (float161 >= 0.25) {
                                    db161 = float161 * 80 - 50;
                                }
                                else if (float161 >= 0.0625) {
                                    db161 = float161 * 160 - 70;
                                }
                                else if (float161 >= 0.0) {
                                    db161 = float161 * 480 - 90;
                                }
                                xvalue = db161.toFixed(1).toString();
                            }
                            break;
                        case 'oscFreq':
                            let oscFreqIndex = Math.round(buff.readFloatBE() * 120);
                            xvalue = x32luts.oscFreq[oscFreqIndex];
                            break;
                        case 'freq':
                            let freqIndex = Math.round(buff.readFloatBE() * 200);
                            xvalue = x32luts.freq[freqIndex];
                            break;
                        case 'q':
                            let qIndex = Math.round(buff.readFloatBE() * 71);
                            xvalue = x32luts.q[qIndex];
                            break;
                        case 'hpf':
                            let hpfIndex = Math.round(buff.readFloatBE() * 100);
                            xvalue = x32luts.hpf[hpfIndex];
                            break;
                        case 'hold':
                            let holdIndex = Math.round(buff.readFloatBE() * 100);
                            xvalue = x32luts.hold[holdIndex];
                            break;
                        case 'release':
                            let releaseIndex = Math.round(buff.readFloatBE() * 100);
                            xvalue = x32luts.release[releaseIndex];
                            break;
                        case 'string':
                            index = buff.indexOf(0x00);
                            xvalue = '"' + buff.toString('utf-8', 0, index) + '"';
                            break;
                        case 'fxParam':
                            xvalue = (Math.round(buff.readFloatBE() * 10) / 10).toString();
                            break;
                        case 'fx':
                            if (parseInt(xaddress.split('/')[1]) < 5) {
                                let enumIndex = buff.readInt32BE();
                                xvalue = x32luts['fx1-4'][enumIndex];
                            }
                            else {
                                let enumIndex = buff.readInt32BE();
                                xvalue = x32luts['fx5-8'][enumIndex];
                            }
                            break;
                        case 'trim':
                            let trimIndex = Math.round(buff.readFloatBE() * 144);
                            xvalue = x32luts.trim[trimIndex];
                            break;
                        default:
                            return 'error: invalid type ' + xformat + ' in x32.json';
                    }
                }
                //let xvalues = [xformat, buff.toString()];
                return { command: command, address: xaddress, values: [xvalue] };
        }
    }
    static getFormat(address, obj) {
        if (!obj)
            obj = x32json;
        let index = address.indexOf('/');
        if (index == -1) {
            let leafIndex = X32.getLeafIndex(address, obj.leaves);
            if (obj.leaves && obj.leaves[leafIndex] && obj.leaves[leafIndex].type) {
                return JSON.stringify(obj.leaves[leafIndex].type);
            }
            else {
                return 'error: ' + address + ' not found';
            }
        }
        else {
            let newRoot = address.slice(0, index);
            if (newRoot.length <= 3)
                newRoot = X32.digitsToSlash(newRoot);
            if (obj[newRoot]) {
                return X32.getFormat(address.slice(index + 1), obj[newRoot]);
            }
            else {
                return 'error: ' + newRoot + ' not found';
            }
        }
        console.log(address.slice(0, index));
        console.log(address.slice(index + 1));
        return 'blah';
    }
    static getLeafIndex(key, arr) {
        let index = -1;
        if (Array.isArray(arr)) {
            for (let x = 0; x < arr.length; x++) {
                if (arr[x] && arr[x].name == key) {
                    index = x;
                }
            }
        }
        return index;
    }
    static parseNode(str) {
        let tempValues = str.split(' ');
        let path = tempValues.shift().split('/');
        let values = [''];
        if (tempValues.length > 0) {
            //recombine string arguments that were separated by spaces
            let i = 0;
            for (let x = 0; x < tempValues.length; x++) {
                if (values[i] != '')
                    values[i] += ' ';
                values[i] = values[i] + tempValues[x];
                if (values[i].split('"').length - 1 != 1 && values[i] != '') {
                    //increment to next argument unless there exists exactly one '"', or it is empty (caused by extraneous spaces)
                    i++;
                    if (x < tempValues.length - 1)
                        values[i] = '';
                    //console.log(tempValues.length + ' ' + x)
                }
            }
        }
        else
            console.error('OSC path with no arguments');
        return { path: path, values: values };
    }
    static oscToObject(osc, returnObj) {
        if (!returnObj)
            returnObj = {};
        for (let x = 0; x < osc.length; x++) {
            if (osc[x][0] == '/') {
                //^^process only OSC, not metadata
                osc[x] = osc[x].slice(1);
                let oscNode = X32.parseNode(osc[x]);
                X32.addToObject(returnObj, oscNode.path, oscNode.values);
            }
        }
        return returnObj;
    }
    static addToObject(obj, path, val, absPath, callback) {
        if (!absPath)
            absPath = [...path];
        if (path.length == 0 || val.length == 0)
            return;
        if (path.length == 1) {
            X32.processOscValueArray(obj, path[0], val, absPath);
        }
        else {
            let newRoot = path.shift();
            if (typeof obj[newRoot] != 'object' || obj[newRoot] == null)
                obj[newRoot] = {};
            X32.addToObject(obj[newRoot], path, val, absPath);
        }
        if (callback)
            callback();
    }
    static processOscValueArray(obj, path, val, absPath) {
        let keyArray = X32.getKeyArray(absPath);
        if (typeof keyArray == 'string') {
            if (keyArray == 'atLeaf') {
                obj[path] = val[0];
            }
            else {
                console.error('Missing path for absPath: ' + absPath);
                console.error('value: ' + val);
                console.log(keyArray);
            }
        }
        else {
            //assume that val length is correct.
            obj[path] = {};
            for (let x = 0; x < keyArray.length; x++) {
                while (val[x] == '')
                    val.splice(x, 1);
                obj[path][keyArray[x].name] = val[x];
            }
        }
    }
    static getKeyArray(pathIn, x32Obj) {
        let path = pathIn.slice(0); //don't mutate the argument
        if (!x32Obj)
            x32Obj = x32json;
        let newRoot = path.shift();
        /* if (path[0] && path[0].length < 4) {
          path[0] = X32.digitsToSlash(path[0]);
        } */
        let oldRoot = newRoot;
        if (newRoot.length < 4) {
            newRoot = X32.digitsToSlash(newRoot);
        }
        if (path.length == 0) {
            if (x32Obj[newRoot] && x32Obj[newRoot].leaves) {
                return x32Obj[newRoot].leaves;
            }
            else {
                if (x32Obj.leaves) {
                    for (let x = 0; x < x32Obj.leaves.length; x++) {
                        if (x32Obj.leaves[x].name == oldRoot)
                            return 'atLeaf';
                    }
                }
                console.log(newRoot);
                return 'missing path';
            }
        }
        else {
            if (x32Obj[newRoot]) {
                return X32.getKeyArray(path, x32Obj[newRoot]);
            }
            else {
                console.log('2');
                return 'missing path';
            }
        }
    }
    static digitsToSlash(str) {
        let convert = true;
        let rtn = str;
        let strArray = Array.from(str);
        for (let x = 0; x < strArray.length; x++) {
            if (parseInt(strArray[x]).toString() != strArray[x])
                convert = false;
        }
        if (convert) {
            for (let x = 0; x < strArray.length; x++) {
                strArray[x] = '/';
            }
            rtn = strArray.join('');
        }
        return rtn;
    }
    static getDiffObj(ref, osc) {
        let returnObj = {};
        for (const key in ref) {
            if (typeof ref[key] == 'string' &&
                typeof osc[key] == 'string' &&
                !(ref[key] == osc[key] ||
                    (parseFloat(ref[key]) != NaN &&
                        parseFloat(ref[key]) == parseFloat(osc[key])))) {
                returnObj[key] = {
                    reference: ref[key],
                    current: osc[key],
                    shown: false,
                };
            }
            if (typeof ref[key] == 'object' && typeof osc[key] == 'object') {
                returnObj[key] = X32.getDiffObj(ref[key], osc[key]);
                if (Object.keys(returnObj[key]).length == 0)
                    delete returnObj[key];
            }
        }
        if (Object.keys(returnObj).length > 0)
            returnObj.shown = true;
        return returnObj;
    }
    static getTinyDiffObj(ref, osc) {
        let returnObj = {};
        for (const key in ref) {
            if (typeof ref[key] == 'string' && typeof osc[key] == 'string') {
                returnObj[key] = {
                    reference: ref[key],
                    current: osc[key],
                    shown: false,
                };
            }
            if (typeof ref[key] == 'object' && typeof osc[key] == 'object') {
                returnObj[key] = X32.getTinyDiffObj(ref[key], osc[key]);
                if (Object.keys(returnObj[key]).length == 0)
                    delete returnObj[key];
            }
        }
        if (Object.keys(returnObj).length > 0)
            returnObj.shown = true;
        return returnObj;
    }
}
exports.default = X32;
