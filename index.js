const fs = require('fs');
const path = require('path');

var IMAGE_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'tiff',
];

/**
 * @param {string} inpath
 */
function get_path_info(inpath) {
    let retval = {
        'type': 'unknown',
        'size': null,
        'last_modified': null,
        'last_accessed': null,
        'created': null,
        'error': null,
    };

    // TODO handle ftp url
    try {
        let file_stat = fs.statSync(inpath);
        if (file_stat.isFile()) {
            retval['type'] = 'regular_file';
        } else if (file_stat.isSymbolicLink()) {
            retval['type'] = 'symbolic_link';
            // TODO add support for symbolic links
        } else if (file_stat.isDirectory()) {
            retval['type'] = 'directory';
            retval['is_directory'] = true;
        } else {
            retval['type'] = 'unknown';
        }

        retval['size'] = file_stat.size;
        retval['last_modified'] = file_stat.mtime;
        retval['last_accessed'] = file_stat.atime;
        retval['created'] = file_stat.ctime;

        return retval;
    } catch (error) {
        console.log(error);
        retval['error'] = error;
    }

    return retval;
}

/**
 * @param {string} inpath
 */
function get_filename(inpath) {
    // remove trailing slash using regex
    let path_without_trailing_slash = inpath.replace(/\/+$/, '');
    // split path into array (support both windows and unix style paths)
    let path_array = path_without_trailing_slash.split(/\/|\\/);
    if (path_array.length == 0) {
        // throw error
        throw new Error('invalid path');
    }

    // get last element of array
    let filename = path_array[path_array.length - 1];
    if (filename.length == 0) {
        // throw error
        throw new Error('invalid path');
    }

    if ((filename !== '.') && (filename !== '..')) {
        return filename;
    }

    // TODO handle . and .. cases
    throw new Error('invalid path');
}

function is_supported_image_file(filename) {
    let extension = filename.split('.').pop();
    extension = extension.toLowerCase();
    if (IMAGE_EXTENSIONS.includes(extension)) {
        return true;
    }
}

function join_path(path_array) {
    let retval = '';
    for (let i = 0; i < path_array.length; i++) {
        let path_element = path_array[i];
        if (i == 0) {
            retval += path_element;
        } else {
            retval += '/' + path_element;
        }
    }

    // use regex to remove duplicate slashes
    retval = retval.replace(/\/+/g, '/');
    return retval;
}

/**
 * @param {[{display_name: string, filepath: string}]} path_data_array
 */
function generate_listing_dom(path_data_array) {
    let retval = [];
    for (let i = 0; i < path_data_array.length; i++) {
        let display_name = path_data_array[i]['display_name'];
        let local_path = path_data_array[i]['filepath'];
        // let local_path = path_array[i];

        let li = document.createElement('div');
        li.classList.add('listing_entry');

        if ((i % 2) == 0) {
            li.classList.add('even');
        } else {
            li.classList.add('odd');
        }

        let name_div = document.createElement('div');
        name_div.classList.add('display_name');
        name_div.textContent = display_name;
        li.appendChild(name_div);
        // li.textContent = display_name;

        name_div.addEventListener('click', function (event) {
            // TODO check to see if user is trying to select the text or not
            // if user is trying to select the text, do not trigger the event
            // TODO sync with the application state
            // TODO option to go back if this event is triggered by mistake
            // TODO option to open in new window
            // TODO option to open in new tab

            console.log(local_path);
            let path_info = get_path_info(local_path);
            if (path_info['type'] == 'directory') {
                console.log('directory');
                let child_filename_array = fs.readdirSync(local_path);
                console.log(child_filename_array);
                let child_file_data_array = [];
                for (let j = 0; j < child_filename_array.length; j++) {
                    let child_filename = child_filename_array[j];
                    let child_filepath = join_path([local_path, child_filename]);
                    child_file_data_array.push({
                        'display_name': child_filename,
                        'filepath': child_filepath,
                    });
                }

                let child_listing_dom = generate_listing_dom(child_file_data_array);
                if (child_listing_dom.length == 0) {
                    // TODO handle empty directory
                    console.log('empty directory');
                } else {
                    let child_container = li.querySelector('.child_container');
                    if (child_container == null) {
                        child_container = document.createElement('div');
                        child_container.classList.add('child_container');
                        li.appendChild(child_container);
                    } else {
                        // clear child container
                        while (child_container.firstChild) {
                            child_container.removeChild(child_container.firstChild);
                        }
                    }

                    for (let j = 0; j < child_listing_dom.length; j++) {
                        child_container.appendChild(child_listing_dom[j]);
                    }
                }

                return;
            } else if (path_info['type'] == 'regular_file') {
                console.log('regular file');

                let filename = get_filename(local_path);
                let absolute_path = path.resolve(local_path);
                if (is_supported_image_file(filename)) {
                    console.log('image');
                    let preview_panel = document.getElementById('preview_view');
                    // TODO clear preview panel
                    while (preview_panel.firstChild) {
                        preview_panel.removeChild(preview_panel.firstChild);
                    }
                    // TODO add support for multiple images
                    // TODO load image asynchronously to reduce disk usage
                    let img = document.createElement('img');
                    // TODO handle URI encode for browser compatibility
                    img.src = absolute_path;
                    preview_panel.appendChild(img);
                    return;
                }

                return;
            } else {
                // TODO handle error
                console.log('error');
                console.log(path_info);
                return;
            }
        });

        retval.push(li);
    }
    return retval;
}

// TODO customize user_data location
var user_data_root_filepath = 'user_data';
var saved_paths_filepath = user_data_root_filepath + '/saved_paths.tsv';
var saved_path_list = [];

// TODO load saved paths
fs.access(saved_paths_filepath, fs.constants.F_OK, function (err) {
    if (err) {
        console.log(`${saved_paths_filepath} does not exist`);
        return;
    }

    console.log(`${saved_paths_filepath} exists`);
    fs.readFile(saved_paths_filepath, 'utf8', function (err, data) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(data);
        let line_array = data.split('\n');
        for (let i = 0; i < line_array.length; i++) {
            let line = line_array[i];
            if (line.length == 0) { continue; }
            // if line starts with #, skip
            if (line[0] == '#') { continue; }
            saved_path_list.push(line);
        }

        console.log(saved_path_list);
        // TODO display saved paths
        if (saved_path_list.length == 0) {
            console.log('no saved paths');
            return;
        }

        let root_container = document.getElementById('listing_view');
        if (root_container == null) {
            console.log('root container not found');
            return;
        }

        let _path_data_array = [];
        for (let i = 0; i < saved_path_list.length; i++) {
            let saved_path = saved_path_list[i];
            _path_data_array.push({
                'display_name': saved_path,
                'filepath': saved_path,
            });
        }

        let listing_dom = generate_listing_dom(_path_data_array);
        for (let i = 0; i < listing_dom.length; i++) {
            let li = listing_dom[i];
            root_container.appendChild(li);
        }
    });
});

var state = {};

// manga view
// right to left
// load image on demand
// load next image on demand
// double pages

// image rendering options
// fit height
// fit width

// download image from ftp url

document.body.addEventListener('keydown', function (event) {
    // Check if the event was triggered by a text input element
    const isTextInput = ['INPUT', 'TEXTAREA', 'CONTENTEDITABLE'].includes(event.target.tagName);

    // Execute your shortcut code only if the event was not triggered by a text input element
    if (isTextInput) {
        // TODO test if this works
        return;
    }

    // if (event.key === 's' && event.ctrlKey) {
    //     // Ctrl+S was pressed, execute your save code
    // } else if (event.key === 'z' && event.ctrlKey) {
    //     // Ctrl+Z was pressed, execute your undo code
    // }

    // toggle navigation panel visibility
    if (event.key === 'n') {
        let navigation_panel = document.getElementById('listing_view');
        if (navigation_panel == null) {
            console.log('navigation panel not found');
            return;
        }
        // adding and removing hidden class
        navigation_panel.classList.toggle('hidden');
        event.preventDefault();
    }
});
