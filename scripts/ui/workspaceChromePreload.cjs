const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nora', {
  getToolUsage: () => ipcRenderer.invoke('fixture:tool-usage'),
  openExternalUrl: url => ipcRenderer.invoke('fixture:open-url', url)
});
