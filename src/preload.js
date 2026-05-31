const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  sendInput: (sequence) => ipcRenderer.send('send-stratagem-input', sequence)
});