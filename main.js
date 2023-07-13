const electron = require('electron');
const path = require('path');

const default_chromium_user_data_path = path.join(__dirname, 'chromium_user_data');
console.log(default_chromium_user_data_path);

electron.app.setPath('userData', default_chromium_user_data_path);

var browser_window;

function createWindow() {
    browser_window = new electron.BrowserWindow({
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
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    electron.ipcMain.on('toggle_fullscreen', function () {
        if (browser_window.isFullScreen()) {
            browser_window.setFullScreen(false);
        } else {
            browser_window.setFullScreen(true);
        }
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

electron.app.whenReady().then(function () {
    createWindow();
});

// quitting the app when no windows are open on non-macOS platforms
electron.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') { electron.app.quit(); }
});
