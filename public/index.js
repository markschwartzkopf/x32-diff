"use strict";
const socket = new WebSocket('ws://' + window.location.host);
socket.onopen = () => {
    socket.onmessage = (msg) => {
        processDataFromServer(JSON.parse(msg.data));
    };
    socket.send(JSON.stringify({ command: 'init' }));
};
const rTri = String.fromCharCode(0x25b6);
const dTri = String.fromCharCode(0x25bc);
let oscObj = {};
let rootDiv = document.getElementById('diff');
let refresh = document.getElementById('refresh');
refresh.onclick = () => {
    socket.send(JSON.stringify({ command: 'refresh' }));
};
function processDataFromServer(apiObj) {
    switch (apiObj.type) {
        case 'full':
            oscObj = apiObj.data;
            rootDiv.innerHTML = '';
            drawTree(rootDiv, oscObj);
            break;
        case 'info':
            console.log(apiObj.data);
            break;
        case 'osc':
            updateOrCreateLeaf(apiObj.data);
            rootDiv.innerHTML = '';
            drawTree(rootDiv, oscObj);
            break;
        case 'files':
            //not currently implemented. This requires the client to be able to poll for one file's diff
            //currently the server resends all data when the file list changes, so anything this code would do would be redundant
            for (const key in oscObj) {
                if (apiObj.data.indexOf(key) == -1) {
                    //delete oscObj[key]
                }
            }
            for (let x = 0; x < apiObj.data.length; x++) {
                if (!oscObj.hasOwnProperty(apiObj.data[x])) {
                    //poll for file diff from server
                }
            }
            break;
        default:
            console.error('Invalid message from API:' + JSON.stringify(apiObj));
    }
}
function updateOrCreateLeaf(update, diff, pth) {
    if (!pth)
        pth = [];
    if (!diff)
        diff = oscObj;
    for (const key in update) {
        let path = pth.slice(0);
        path.push(key);
        if (update[key].hasOwnProperty('current')) {
            // at leaf
            if (!diff[key])
                diff[key] = update[key];
            let dLeaf = diff[key];
            let uLeaf = update[key];
            dLeaf.current = uLeaf.current;
            dLeaf.reference = uLeaf.reference;
            deleteEmpty(path);
        }
        else {
            if (!diff[key])
                diff[key] = update[key];
            updateOrCreateLeaf(update[key], diff[key], path);
        }
    }
}
function deleteEmpty(path, diff, absPath) {
    if (path.length == 0) {
        console.error('Bad path');
        return;
    }
    if (!diff)
        diff = oscObj;
    if (!absPath)
        absPath = path;
    if (!diff[path[0]]) {
        return;
    }
    else {
        if (diff[path[0]].hasOwnProperty('current')) {
            let leaf = diff[path[0]];
            if (leaf.current == leaf.reference || (parseFloat(leaf.current) == parseFloat(leaf.reference) && parseFloat(leaf.current) != NaN))
                delete diff[path[0]];
            deleteEmpty(absPath.slice(0, -1));
        }
        else {
            if (Object.keys(diff[path[0]]).length < 2) {
                delete diff[path[0]];
                if (absPath.length > 1)
                    deleteEmpty(absPath.slice(0, -1));
            }
            else {
                if (path.length > 1)
                    deleteEmpty(path.slice(1), diff[path[0]], absPath);
            }
        }
    }
}
function drawTree(div, diff, path) {
    if (!path)
        path = [];
    let keys = Object.keys(diff);
    keys.sort();
    for (let x = 0; x < keys.length; x++) {
        const key = keys[x];
        let child = document.createElement('div');
        if (path.length > 0) {
            child.id = path.join('/') + '/' + key;
        }
        else
            child.id = key;
        child.className = 'tree';
        let label = document.createElement('div');
        let triangle = rTri;
        if (isShown(diff[key])) {
            triangle = dTri;
        }
        label.innerHTML = triangle + key;
        label.className = 'label';
        label.onclick = function () {
            let self = this;
            let parent = self.parentNode;
            let path = parent.id.split('/');
            let obj = getObject(path);
            if (self.innerHTML[0] == dTri) {
                self.innerHTML = rTri + self.innerHTML.slice(1);
                obj.shown = false;
            }
            else {
                self.innerHTML = dTri + self.innerHTML.slice(1);
                obj.shown = true;
            }
            rootDiv.innerHTML = '';
            drawTree(rootDiv, oscObj);
        };
        child.appendChild(label);
        if (key != 'shown')
            div.appendChild(child);
        if (typeof diff[key] == 'object') {
            if (diff[key].hasOwnProperty('current')) {
                let childDiff = diff[key];
                if (childDiff.shown) {
                    let leaf = document.createElement('div');
                    leaf.innerHTML = 'Reference: ' + childDiff.reference;
                    leaf.className = 'leaf';
                    child.appendChild(leaf);
                    leaf = document.createElement('div');
                    leaf.innerHTML = 'Current: ' + childDiff.current;
                    leaf.className = 'leaf';
                    child.appendChild(leaf);
                }
            }
            else {
                let childDiff = diff[key];
                if (childDiff.shown) {
                    drawTree(child, childDiff, [...path, key]);
                }
            }
        }
    }
}
function isShown(obj) {
    if (typeof obj != 'object')
        return false;
    if (!obj.hasOwnProperty('shown'))
        return false;
    return Boolean(obj.shown);
}
function getObject(path, obj) {
    if (!obj)
        obj = oscObj;
    if (path.length == 1) {
        return obj[path[0]];
    }
    else {
        let newPath = path.slice(1);
        let key = path[0];
        if (obj[key]) {
            return getObject(newPath, obj[key]);
        }
        else {
            return 'error';
        }
    }
}
