const { app, BrowserWindow } = require('electron');
const path = require('path');

const default_chromium_user_data_path = path.join(__dirname, 'chromium_user_data');
console.log(default_chromium_user_data_path);

app.setPath('userData', default_chromium_user_data_path);

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
            autoHideMenuBar: true,
        },
    });

    // Hide the menu bar when in full screen mode
    browser_window.on('enter-full-screen', () => {
        browser_window.setMenuBarVisibility(false);
    })

    // Show the menu bar when exiting full screen mode
    browser_window.on('leave-full-screen', () => {
        browser_window.setMenuBarVisibility(true);
    })

    browser_window.loadFile('index.html');

    // const contents = browser_window.webContents;
    // console.log(contents);
}

app.whenReady().then(() => {
    createWindow();
});

// quitting the app when no windows are open on non-macOS platforms
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit(); }
});
