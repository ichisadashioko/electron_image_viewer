const fs = require('fs');
const path = require('path');
// const { electron } = require('process');
// const electron = require('electron');
// const ELECTRON_REMOTE = require('electron');

var state = {};
var GLOBAL_LISTING_LOCATION_ARRAY = [];
var IMAGE_EXTENSIONS = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'webp',
    'tiff',
];

function to_platform_path(inpath) {
    let platform_path_separator = '/';
    if (process.platform === 'win32') {
        platform_path_separator = '\\';
    }

    let tmp_array = inpath.split('/');
    let tmp_array2 = [];
    for (let i = 0; i < tmp_array.length; i++) {
        let tmp_str = tmp_array[i];
        if (tmp_str.length > 0) {
            let tmp_array3 = tmp_str.split('\\');
            for (let j = 0; j < tmp_array3.length; j++) {
                let tmp_str2 = tmp_array3[j];
                if (tmp_str2.length > 0) {
                    tmp_array2.push(tmp_str2);
                }
            }
        }
    }

    let retval = tmp_array2.join(platform_path_separator);
    if (process.platform === 'win32') { } else {
        if (inpath[0] === '/') {
            retval = '/' + retval;
        }
    }

    // let retval = inpath.replace(/\//g, platform_path_separator);
    return retval;
}

function to_web_friendly_path(inpath) {
    let tmp_array = inpath.split('/');
    let tmp_array2 = [];
    for (let i = 0; i < tmp_array.length; i++) {
        let tmp_str = tmp_array[i];
        if (tmp_str.length > 0) {
            let tmp_array3 = tmp_str.split('\\');
            for (let j = 0; j < tmp_array3.length; j++) {
                let tmp_str2 = tmp_array3[j];
                if (tmp_str2.length > 0) {
                    tmp_array2.push(tmp_str2);
                }
            }
        }
    }

    let uri_encoded_path_components = [];
    let tmp_str = tmp_array2[0];

    if ((process.platform === 'win32') && (tmp_str.length === 2) && (tmp_str[1] === ':')) {
        uri_encoded_path_components.push(tmp_array2[0]);

        for (let i = 1; i < tmp_array2.length; i++) {
            let tmp_str = tmp_array2[i];
            let uri_encoded_str = encodeURIComponent(tmp_str);
            uri_encoded_path_components.push(uri_encoded_str);
        }
    } else {
        for (let i = 0; i < tmp_array2.length; i++) {
            let tmp_str = tmp_array2[i];
            let uri_encoded_str = encodeURIComponent(tmp_str);
            uri_encoded_path_components.push(uri_encoded_str);
        }
    }

    let retval = uri_encoded_path_components.join('/');

    if (process.platform === 'win32') {

    } else {
        if (inpath[0] === '/') {
            retval = '/' + retval;
        }
    }

    retval = 'file://' + retval;
    return retval;
}

function to_internal_path(inpath) {
    let platform_path_separator = '/';
    let tmp_array = inpath.split('/');
    let tmp_array2 = [];
    for (let i = 0; i < tmp_array.length; i++) {
        let tmp_str = tmp_array[i];
        if (tmp_str.length > 0) {
            let tmp_array3 = tmp_str.split('\\');
            for (let j = 0; j < tmp_array3.length; j++) {
                let tmp_str2 = tmp_array3[j];
                if (tmp_str2.length > 0) {
                    tmp_array2.push(tmp_str2);
                }
            }
        }
    }

    let retval = tmp_array2.join(platform_path_separator);
    if (process.platform === 'win32') { } else {
        if (inpath[0] === '/') {
            retval = '/' + retval;
        }
    }

    return retval;
}

function is_regular_file(filepath) {
    let path_info = get_path_info(filepath);
    if (path_info['type'] == 'regular_file') {
        return true;
    }
}

function sort_filename_array_method0(file_info_array) {
    let retval = [];
    let tmp_array = [];
    for (let i = 0; i < file_info_array.length; i++) {
        let file_info = file_info_array[i];
        let filename = file_info['filename'];
        let basename = path.basename(filename);
        tmp_array.push({
            'key': basename,
            'value': file_info,
        });
    }

    tmp_array.sort(function (a, b) {
        let a_key = a['key'];
        let b_key = b['key'];
        if (a_key < b_key) {
            return -1;
        } else if (a_key > b_key) {
            return 1;
        } else {
            return 0;
        }
    });

    for (let i = 0; i < tmp_array.length; i++) {
        let tmp = tmp_array[i];
        retval.push(tmp['value']);
    }

    return retval;
}

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
        let file_stat = fs.statSync(to_platform_path(inpath));
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

function get_parent_path(filepath) {
    // remove trailing slash using regex
    let path_without_trailing_slash = filepath.replace(/\/+$/, '');
    let i = path_without_trailing_slash.lastIndexOf('/');
    if (i == -1) {
        // TODO handle windows style paths
        throw new Error('invalid path');
    }

    let parent_path = path_without_trailing_slash.substring(0, i);
    return parent_path;
}

function os_path_split(filepath) {
    let tmp_array = filepath.split('/');
    let path_component_array = [];
    for (let i = 0; i < tmp_array.length; i++) {
        let tmp_str = tmp_array[i];
        if (tmp_str.length > 0) {
            let tmp_array3 = tmp_str.split('\\');
            for (let j = 0; j < tmp_array3.length; j++) {
                let tmp_str2 = tmp_array3[j];
                if (tmp_str2.length > 0) {
                    path_component_array.push(tmp_str2);
                }
            }
        }
    }

    let parent_path = null;
    let filename = null;

    if (path_component_array.length == 0) {
        if (process.platform == 'win32') { } else {
            if (filepath[0] == '/') {
                filename = '/';
            }
        }
    } else {
        if (path_component_array.length == 1) {
            filename = path_component_array[0];
        } else {
            filename = path_component_array[path_component_array.length - 1];
            parent_path = '';
            for (let i = 0; i < path_component_array.length - 1; i++) {
                let tmp_str = path_component_array[i];
                if (i == 0) {
                    parent_path += tmp_str;
                } else {
                    parent_path += '/' + tmp_str;
                }
            }

            if (process.platform == 'win32') { } else {
                if (filepath[0] == '/') {
                    parent_path = '/' + parent_path;
                }
            }
        }
    }

    return {
        'parent': parent_path,
        'filename': filename,
    };
}

function show_single_image(file_info) {
    let preview_panel = document.getElementById('preview_view');
    if (preview_panel == null) {
        console.error('preview panel not found');
        return;
    }

    // TODO should we error check here?
    let filepath = file_info['filepath'];
    let parent_path = file_info['parent'];
    let gallery_root = file_info['gallery_root'];

    state.showing_image_absolute_path = filepath;
    state.showing_image_parent_path = parent_path;
    state.showing_image_gallery_root = gallery_root;

    // TODO add support for multiple images
    // TODO load image asynchronously to reduce disk usage
    let img = document.createElement('img');
    img.classList.add('single_image_auto_fit');
    // TODO handle URI encode for browser compatibility
    img.src = to_web_friendly_path(filepath);
    while (preview_panel.firstChild) { preview_panel.removeChild(preview_panel.firstChild); }
    preview_panel.appendChild(img);

    img.addEventListener('mousedown', function (event) {
        if (event.button === 0) {
            // left click
            // TODO allow user to configure this behavior
            if (state.change_image_lock) {
                console.log('next image lock is on');
                return;
            }

            state.change_image_lock = true;
            try {
                (function () {
                    if (next_image()) {
                        event.preventDefault();
                    }
                })();
            } catch (error) {
                console.log(error);
            }

            state.change_image_lock = false;
        } else if (event.button === 2) {
            // right click
            // TODO allow user to configure this behavior
            if (state.change_image_lock) {
                console.log('next image lock is on');
                return;
            }

            state.change_image_lock = true;
            try {
                (function () {
                    if (next_image(true)) {
                        event.preventDefault();
                    }
                })();
            } catch (error) {
                console.log(error);
            }

            state.change_image_lock = false;
        }
    });
    return true;
}

function listing_valid_image_files(inpath) {
    let child_filename_array = fs.readdirSync(to_platform_path(inpath));
    let valid_image_filepath_info_array = [];
    for (let i = 0; i < child_filename_array.length; i++) {
        let child_filename = child_filename_array[i];
        let child_filepath = inpath + '/' + child_filename;
        if (!is_regular_file(child_filepath)) {
            continue;
        }
        if (!is_supported_image_file(child_filename)) {
            continue;
        }
        valid_image_filepath_info_array.push({
            'filename': child_filename,
            'filepath': child_filepath,
        });
    }

    return valid_image_filepath_info_array;
}

function show_directory_first_image(file_info) {
    let preview_panel = document.getElementById('preview_view');
    if (preview_panel == null) {
        console.error('preview panel not found');
        return;
    }

    // TODO should we error check here?
    let filepath = file_info['filepath'];
    let gallery_root = file_info['gallery_root'];

    let valid_image_filepath_info_array = listing_valid_image_files(filepath);

    if (valid_image_filepath_info_array.length == 0) {
        // TODO tell the caller that no valid image is found in this directory
        console.log('no valid image found');
        return;
    }

    valid_image_filepath_info_array = sort_filename_array_method0(valid_image_filepath_info_array);
    let first_image_filepath_info = valid_image_filepath_info_array[0];
    return show_single_image({
        'filepath': first_image_filepath_info['filepath'],
        'parent': filepath,
        'gallery_root': gallery_root,
    });
}

function next_image(backward) {
    let preview_panel = document.getElementById('preview_view');
    if (preview_panel == null) {
        console.log('preview panel not found');
        return;
    }

    /** @type {string} */
    let current_showing_image_absolute_path = state.showing_image_absolute_path;
    if (current_showing_image_absolute_path == null) {
        console.log('no image is showing');
        return;
    }


    let _retval = os_path_split(current_showing_image_absolute_path);
    let current_showing_image_directory = _retval['parent'];
    let current_showing_image_filename = _retval['filename'];

    if (current_showing_image_directory == null) {
        console.log('invalid path');
        return;
    }

    if (current_showing_image_filename == null) {
        console.log('invalid path');
        return;
    }

    let valid_image_filepath_info_array = listing_valid_image_files(current_showing_image_directory);

    if (valid_image_filepath_info_array.length == 0) {
        console.log('no valid image found');
        return;
    }

    valid_image_filepath_info_array = sort_filename_array_method0(valid_image_filepath_info_array);
    let current_showing_image_index = -1;
    for (let i = 0; i < valid_image_filepath_info_array.length; i++) {
        let image_filepath_info = valid_image_filepath_info_array[i];
        if (image_filepath_info.filename == current_showing_image_filename) {
            current_showing_image_index = i;
            break;
        }
    }

    let next_image_filepath_info = null;
    if (current_showing_image_index == -1) {
        console.log('current showing image not found');
        next_image_filepath_info = valid_image_filepath_info_array[0];
    } else {
        if (backward) {
            if (current_showing_image_index == 0) {
                console.log('current showing image is the first one');
                next_image_filepath_info = valid_image_filepath_info_array[valid_image_filepath_info_array.length - 1];
            } else {
                next_image_filepath_info = valid_image_filepath_info_array[current_showing_image_index - 1];
            }
        } else {
            if (current_showing_image_index == valid_image_filepath_info_array.length - 1) {
                console.log('current showing image is the last one');
                next_image_filepath_info = valid_image_filepath_info_array[0];
            } else {
                next_image_filepath_info = valid_image_filepath_info_array[current_showing_image_index + 1];
            }
        }
    }


    if (next_image_filepath_info == null) {
        console.log('next image not found');
        return;
    }

    let next_image_filepath = next_image_filepath_info.filepath;
    if (next_image_filepath == null) {
        console.log('next image filepath not found');
        return;
    }

    return show_single_image({
        'filepath': next_image_filepath,
        'parent': current_showing_image_directory,
        'gallery_root': state.showing_image_gallery_root,
    });
}

function show_next_directory(backward) {
    let preview_panel = document.getElementById('preview_view');
    if (preview_panel == null) {
        console.log('preview panel not found');
        return;
    }

    /** @type {string} */
    let current_showing_image_absolute_path = state.showing_image_absolute_path;
    if (current_showing_image_absolute_path == null) {
        console.log('no image is showing');
        return;
    }

    let current_showing_image_directory = state.showing_image_parent_path;
    if (current_showing_image_directory == null) {
        current_showing_image_directory = get_parent_path(current_showing_image_absolute_path);
    }

    if (current_showing_image_directory == null) {
        console.log('current_showing_image_directory == null');
        return;
    }

    let _retval = os_path_split(current_showing_image_directory);
    let parent_path = _retval['parent'];
    let current_dir_filename = _retval['filename'];
    if (parent_path == null) {
        console.log('parent_path == null');
        return;
    }

    // check if we jump out of 'gallery_root'
    let gallery_root = to_internal_path(state.showing_image_gallery_root);
    if (gallery_root == null) {
        console.log('gallery_root == null');
        // free to roam
    } else {
        let i = parent_path.indexOf(gallery_root);
        if (i != 0) {
            console.log('parent_path.indexOf(gallery_root) != 0');
            return;
        }
    }

    let child_filename_array = fs.readdirSync(to_platform_path(parent_path));
    if (child_filename_array.length == 0) {
        console.log('no child found');
        return;
    }

    if (child_filename_array.length == 1) {
        console.log('only one child found');
        if (child_filename_array[0] == current_dir_filename) {
            console.log('only one child found, and it is the current directory');
            return;
        } else {
            console.log('only one child found, but it is not the current directory');
            // TODO handle this case
            return;
        }
    }

    // TODO load saved sorting method
    let directory_info_array = [];
    for (let i = 0; i < child_filename_array.length; i++) {
        let child_filename = child_filename_array[i];
        let child_filepath = parent_path + '/' + child_filename;
        let child_info = get_path_info(child_filepath);
        if (child_info['is_directory']) {
            directory_info_array.push({
                'filename': child_filename,
                'filepath': child_filepath,
            });
        }
    }

    if (directory_info_array.length == 0) {
        // TODO handle this case (move up to parent directory)
        console.log('no directory found');
        return;
    }

    if (directory_info_array.length == 1) {
        console.log('only one directory found');
        if (directory_info_array[0]['filename'] == current_dir_filename) {
            // TODO handle this case (move up to parent directory)
            console.log('only one directory found, and it is the current directory');
            return;
        } else {
            // TODO handle this case - show the only directory?
            console.log('only one directory found, but it is not the current directory');
            return;
        }
    }

    let idx = -1;
    for (let i = 0; i < directory_info_array.length; i++) {
        let child_filename = directory_info_array[i]['filename'];
        if (child_filename === current_dir_filename) {
            idx = i;
            break;
        }
    }

    if (idx === -1) {
        console.error('current directory not found');
        return;
    }

    let next_directory_index = -1;
    if (backward) {
        if (idx == 0) {
            next_directory_index = directory_info_array.length - 1;
        } else {
            next_directory_index = idx - 1;
        }
    } else {
        if (idx == directory_info_array.length - 1) {
            next_directory_index = 0;
        } else {
            next_directory_index = idx + 1;
        }
    }

    let next_directory_filepath = directory_info_array[next_directory_index]['filepath'];
    return show_directory_first_image({
        'filepath': next_directory_filepath,
        'gallery_root': state.showing_image_gallery_root,
    });
}

/**
 * @param {[{display_name: string, filepath: string}]} path_data_array
 */
function generate_listing_dom(path_data_array) {
    let retval = [];
    for (let i = 0; i < path_data_array.length; i++) {
        let display_name = path_data_array[i]['display_name'];
        let local_path = path_data_array[i]['filepath'];
        let parent_path = path_data_array[i]['parent'];
        let gallery_root = path_data_array[i]['gallery_root'];

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
            // TODO option to preview all images in directory

            console.log(local_path);
            let path_info = get_path_info(local_path);
            if (path_info['type'] == 'directory') {
                console.log('directory');
                let child_filename_array = fs.readdirSync(to_platform_path(local_path));
                console.log(child_filename_array);
                let child_file_data_array = [];
                for (let j = 0; j < child_filename_array.length; j++) {
                    let child_filename = child_filename_array[j];
                    let child_filepath = join_path([local_path, child_filename]);
                    child_file_data_array.push({
                        'display_name': child_filename,
                        'filepath': child_filepath,
                        'parent': local_path,
                        'gallery_root': gallery_root,
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
            } else if (path_info['type'] == 'regular_file') {
                console.log('regular file');

                let filename = get_filename(local_path);
                let absolute_path = path.resolve(to_platform_path(local_path));
                if (is_supported_image_file(filename)) {
                    show_single_image({
                        'filepath': absolute_path,
                        'parent': parent_path,
                        'gallery_root': gallery_root,
                    });
                }
            } else {
                // TODO handle error
                console.log('error');
                console.log(path_info);
            }
        });

        retval.push(li);
    }
    return retval;
}

function render_global_listing_location_array() {
    let _location_info_array = [];
    for (let i = 0; i < GLOBAL_LISTING_LOCATION_ARRAY.length; i++) {
        let _location = GLOBAL_LISTING_LOCATION_ARRAY[i];
        _location_info_array.push({
            'display_name': _location,
            'filepath': _location,
            'gallery_root': _location,
        });
    }

    let root_container = document.getElementById('listing_view');
    if (root_container == null) {
        console.log('root container not found');
        return;
    }

    let listing_dom = generate_listing_dom(_location_info_array);
    root_container.innerHTML = '';
    for (let i = 0; i < listing_dom.length; i++) {
        let li = listing_dom[i];
        root_container.appendChild(li);
    }
}

// TODO customize user_data location
var user_data_root_filepath = 'user_data';
var saved_paths_filepath = user_data_root_filepath + '/saved_paths.tsv';
var saved_path_list = [];

// load saved paths
fs.access(to_platform_path(saved_paths_filepath), fs.constants.F_OK, function (err) {
    if (err) {
        console.log(`${saved_paths_filepath} does not exist`);
        return;
    }

    console.log(`${saved_paths_filepath} exists`);
    fs.readFile(to_platform_path(saved_paths_filepath), 'utf8', function (err, data) {
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
        if (saved_path_list.length == 0) {
            console.log('no saved paths');
            return;
        }

        let root_container = document.getElementById('listing_view');
        if (root_container == null) {
            console.log('root container not found');
            return;
        }

        for (let i = 0; i < saved_path_list.length; i++) {
            let saved_path = saved_path_list[i];
            GLOBAL_LISTING_LOCATION_ARRAY.push(saved_path);
        }

        render_global_listing_location_array();
    });
});

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
        let navigation_panel = document.getElementById('popup_container');
        if (navigation_panel == null) {
            console.log('navigation panel not found');
            return;
        }
        // adding and removing hidden class
        navigation_panel.classList.toggle('hidden');
        event.preventDefault();
    }
    // next page (arrow right)
    else if (event.key === 'ArrowRight') {
        if (state.change_image_lock) {
            console.log('next image lock is on');
            return;
        }

        state.change_image_lock = true;
        try {
            (function () {
                if (next_image()) {
                    event.preventDefault();
                }
            })();
        } catch (error) {
            console.log(error);
        }

        state.change_image_lock = false;
    }
    // previous page (arrow left)
    else if (event.key === 'ArrowLeft') {
        if (state.change_image_lock) {
            console.log('next image lock is on');
            return;
        }

        state.change_image_lock = true;
        try {
            (function () {
                if (next_image(true)) {
                    event.preventDefault();
                }
            })();
        } catch (error) {
            console.log(error);
        }

        state.change_image_lock = false;
    }
    // next directory (arrow down)
    else if (event.key === 'ArrowDown') {
        if (state.change_image_lock) {
            console.log('next image lock is on');
            return;
        }

        state.change_image_lock = true;
        try {
            (function () {
                if (show_next_directory()) {
                    event.preventDefault();
                }
            })();
        } catch (error) {
            console.log(error);
        }

        state.change_image_lock = false;
    }
    // previous directory (arrow up)
    else if (event.key === 'ArrowUp') {
        if (state.change_image_lock) {
            console.log('next image lock is on');
            return;
        }

        state.change_image_lock = true;
        try {
            (function () {
                if (show_next_directory(true)) {
                    event.preventDefault();
                }
            })();
        } catch (error) {
            console.log(error);
        }

        state.change_image_lock = false;
    }
    else if (event.key === 'f') {

    }
});

let add_location_button = document.getElementById('add_location_button');
if (add_location_button != null) {
    add_location_button.addEventListener('click', function (event) {
        let location_input = document.getElementById('add_location_input');
        if (location_input == null) {
            console.log('location input not found');
            return;
        }

        let location_str = location_input.value;
        if (location_str.length == 0) {
            console.log('location input is empty');
            return;
        }

        if (!GLOBAL_LISTING_LOCATION_ARRAY.includes(location_str)) {
            GLOBAL_LISTING_LOCATION_ARRAY.push(location_str);
        }

        render_global_listing_location_array();
        // ELECTRON_REMOTE.dialog.showOpenDialog({
        //     properties: ['openDirectory'],
        // }, function (filepath_array) {
        //     if (filepath_array == null) {
        //         return;
        //     }

        //     for (let i = 0; i < filepath_array.length; i++) {
        //         GLOBAL_LISTING_LOCATION_ARRAY.push(filepath_array[i]);
        //         render_global_listing_location_array();
        //     }
        // });
    });
}
