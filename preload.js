const electron = require('electron');

electron.contextBridge.exposeInMainWorld('shioko', {
    toggle_fullscreen: function () {
        electron.ipcRenderer.send('toggle_fullscreen')
    },
});
