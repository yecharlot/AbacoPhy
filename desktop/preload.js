// Aislamiento: no se expone Node al renderer.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('abacophyDesktop', { platform: process.platform });
