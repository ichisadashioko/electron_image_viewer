const fs = require('fs');
const path = require('path');
const electron = require('electron');

const default_chromium_user_data_path = path.join(__dirname, 'chromium_user_data');
console.log(default_chromium_user_data_path);

// read every files in the chromium_user_data folder to cache them in RAM

_1KB = 1024;
_1MB = 1024 * _1KB;
_1GB = 1024 * _1MB;

_20MB = 20 * _1MB;
_5GB = 5 * _1GB;

function read_files(input_filepath) {
    if (!fs.existsSync(input_filepath)) {
        return;
    }

    let file_stat = fs.statSync(input_filepath);
    if (file_stat.isSymbolicLink()) {
        console.log('symbolic link: ' + input_filepath);
        console.log('skip symbolic link');
        return;
    } else if (file_stat.isFile()) {
        console.log('open and read file: ' + input_filepath);
        // fs.openSync()
        // fs.open(input_filepath, 'rb', function (err, fd) {
        let file_descriptor = fs.openSync(input_filepath, 'r');
        if (file_descriptor == null) {
            console.log('failed to open file');
            // console.log(input_filepath);
            // console.log(err);
        } else {
            // console.log('opened file');
            // console.log(input_filepath);
            // console.log(fd);

            {
                console.log('reading file')
                var buffer = Buffer.alloc(_20MB);
                let loop_count = 0;
                let total_bytes_read = 0;
                while (true) {
                    loop_count += 1;
                    console.log('loop count: ' + loop_count);
                    console.log('total bytes read: ' + total_bytes_read);
                    let bytes_read = fs.readSync(file_descriptor, buffer, 0, _20MB, null);
                    if (bytes_read == 0) {
                        break;
                    }

                    total_bytes_read += bytes_read;
                    // console.log(buffer);
                }

                console.log('loop count: ' + loop_count);
                console.log('total bytes read: ' + total_bytes_read);
            }

            fs.closeSync(file_descriptor);
        }

        // fs.open(input_filepath, 'r', function (err, fd) {
        //     if (err) {
        //         console.log('failed to open file');
        //         console.log(input_filepath);
        //         console.log(err);
        //         return;
        //     }

        //     console.log('reading file')
        //     var buffer = Buffer.alloc(_20MB);
        //     let loop_count = 0;
        //     let total_bytes_read = 0;
        //     while (true) {
        //         loop_count += 1;
        //         console.log('loop count: ' + loop_count);
        //         console.log('total bytes read: ' + total_bytes_read);
        //         let bytes_read = fs.readSync(fd, buffer, 0, _20MB, null);
        //         if (bytes_read == 0) {
        //             break;
        //         }

        //         total_bytes_read += bytes_read;
        //         // console.log(buffer);
        //     }

        //     console.log('loop count: ' + loop_count);
        //     console.log('total bytes read: ' + total_bytes_read);
        //     // console.log(fd);
        //     fs.close(fd, function (err) {
        //         if (err) {
        //             console.log('failed to close file');
        //             console.log(input_filepath);
        //             console.log(err);
        //             return;
        //         }
        //     });
        // })
        // fs.readFileSync(input_filepath, 'rb');
        return;
    } else if (file_stat.isDirectory()) {
        let child_filename_list = fs.readdirSync(input_filepath);
        for (let child_filename of child_filename_list) {
            let child_filepath = path.join(input_filepath, child_filename);
            read_files(child_filepath);
        }
    }
}

console.log('read files to cache them in RAM')
read_files(default_chromium_user_data_path);
console.log('done reading files to cache them in RAM')

electron.app.setPath('userData', default_chromium_user_data_path);

var browser_window;

function createWindow() {
    browser_window = new electron.BrowserWindow({
        width: 1600,
        height: 900,
        show: false,
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
    browser_window.on('enter-full-screen', function () {
        browser_window.setMenuBarVisibility(false);
    })

    // Show the menu bar when exiting full screen mode
    browser_window.on('leave-full-screen', function () {
        browser_window.setMenuBarVisibility(true);
    })

    browser_window.loadFile('index.html');

    browser_window.once('ready-to-show', function () {
        browser_window.show();
    });
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
