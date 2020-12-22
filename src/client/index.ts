const socket = new WebSocket('ws://' + window.location.host);
socket.onopen = () => {
  socket.onmessage = (msg) => {
    processDataFromServer(JSON.parse(msg.data));
  };
  socket.send(JSON.stringify({ command: 'init' }));
};
const rTri = String.fromCharCode(0x25b6);
const dTri = String.fromCharCode(0x25bc);
let oscObj: diffObject = {};
let rootDiv = <HTMLDivElement>document.getElementById('diff')!;
let refresh = <HTMLButtonElement>document.getElementById('refresh')!;

refresh.onclick = () => {
  socket.send(JSON.stringify({ command: 'refresh' }));
};

function processDataFromServer(apiObj: apiObject) {
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
    default:
      console.error('Invalid message from API:' + JSON.stringify(apiObj));
  }
}

function updateOrCreateLeaf(
  update: diffObject,
  diff?: diffObject,
  pth?: string[]
) {
  if (!pth) pth = [];
  if (!diff) diff = oscObj;
  for (const key in update) {
    let path = pth.slice(0);
    path.push(key);
    if (update[key].hasOwnProperty('current')) {
      // at leaf
      if (!diff[key]) diff[key] = update[key];
      let dLeaf: diffLeaf = diff[key] as diffLeaf;
      let uLeaf: diffLeaf = update[key] as diffLeaf;
      dLeaf.current = uLeaf.current;
      dLeaf.reference = uLeaf.reference;
      deleteEmpty(path);
    } else {
      if (!diff[key]) diff[key] = update[key];
      updateOrCreateLeaf(
        update[key] as diffObject,
        diff[key] as diffObject,
        path
      );
    }
  }
}

function deleteEmpty(path: string[], diff?: diffObject, absPath?: string[]) {
  if (path.length == 0) {
    console.error('Bad path');
    return;
  }
  if (!diff) diff = oscObj;
  if (!absPath) absPath = path;
  if (!diff[path[0]]) {
    return;
  } else {
    if (diff[path[0]].hasOwnProperty('current')) {
      let leaf = diff[path[0]] as diffLeaf;
      if (leaf.current == leaf.reference) delete diff[path[0]]
      deleteEmpty(absPath.slice(0, -1))
    } else {
      if (Object.keys(diff[path[0]]).length < 2) {
        delete diff[path[0]];
        if (absPath.length > 1) deleteEmpty(absPath.slice(0, -1))
      } else {
        if (path.length > 1) deleteEmpty (path.slice(1), diff[path[0]] as diffObject, absPath)
      }
    }
  }
}

function drawTree(div: HTMLDivElement, diff: diffObject, path?: string[]) {
  if (!path) path = [];
  for (const key in diff) {
    let child = document.createElement('div');
    if (path.length > 0) {
      child.id = path.join('/') + '/' + key;
    } else child.id = key;
    child.className = 'tree';
    let label = document.createElement('div');
    let triangle: string = rTri;
    if (isShown(diff[key])) {
      triangle = dTri;
    }
    label.innerHTML = triangle + key;
    label.className = 'label';
    label.onclick = function () {
      let self = <HTMLDivElement>this;
      let parent = <HTMLDivElement>self.parentNode;
      let path = parent.id.split('/');
      let obj = <diffObject>getObject(path);
      if (self.innerHTML[0] == dTri) {
        self.innerHTML = rTri + self.innerHTML.slice(1);
        obj.shown = false;
      } else {
        self.innerHTML = dTri + self.innerHTML.slice(1);
        obj.shown = true;
      }
      rootDiv.innerHTML = '';
      drawTree(rootDiv, oscObj);
    };
    child.appendChild(label);
    if (key != 'shown') div.appendChild(child);
    if (typeof diff[key] == 'object') {
      if (diff[key].hasOwnProperty('current')) {
        let childDiff = <diffLeaf>diff[key];
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
      } else {
        let childDiff = <diffObject>diff[key];
        if (childDiff.shown) {
          drawTree(child, childDiff, [...path, key]);
        }
      }
    }
  }
}

function isShown(obj: any) {
  if (typeof obj != 'object') return false;
  if (!obj.hasOwnProperty('shown')) return false;
  return Boolean(obj.shown);
}

function getObject(path: string[], obj?: diffObject): diffObject | 'error' {
  if (!obj) obj = oscObj;
  if (path.length == 1) {
    return <diffObject>obj[path[0]];
  } else {
    let newPath = path.slice(1);
    let key = path[0];
    if (obj[key]) {
      return getObject(newPath, <diffObject>obj[key]);
    } else {
      return 'error';
    }
  }
}
