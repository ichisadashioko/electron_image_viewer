const { app, BrowserWindow } = require('electron');

var browser_window;

function createWindow() {
    browser_window = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            plugins: true,
            contextIsolation: false,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true,
            backgroundThrottling: false,
            nativeWindowOpen: true,
            devTools: true,
        },
    });

    browser_window.loadFile('index.html');

    // const contents = browser_window.webContents;
    // console.log(contents);
}

app.whenReady().then(() => {
    createWindow()
});

// quitting the app when no windows are open on non-macOS platforms
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit(); }
});
