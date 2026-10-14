// Runs src/mc-kernels.js + src/mc-worker.js in a Node worker thread with a minimal `self`, mirroring the browser's Blob worker
const { parentPort } = require('node:worker_threads');
const path = require('node:path');
globalThis.self = globalThis;
self.postMessage = msg => parentPort.postMessage(msg);
require(path.join(__dirname, '..', 'src', 'mc-kernels.js'));
require(path.join(__dirname, '..', 'src', 'mc-worker.js'));
parentPort.on('message', data => self.onmessage({ data }));
