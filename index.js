const fs = require('fs');
const path = require('path');
// const { electron } = require('process');
const ELETCTRON_PROCESS = require('process');
const electron = require('electron');

var state = {
    showing_image_absolute_path: null,
    showing_image_gallery_root: null,
    use_next_image2_fallback: false, // TOOD load user setting
    loop_images_in_current_directory: false, // TOOD load user setting
    read_next_image_to_cache_in_ram: false, // TOOD load user setting
};

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

const SORTING_METHOD_NONE = 0;
const SORTING_METHOD_FILENAME = 1;
const SORTING_METHOD_FILESIZE = 2;
const SORTING_METHOD_GROUP_BY_EXTENSION_AND_SORT_BY_FILENAME = 3;
const SORTING_METHOD_IGNORE_EXTENSION_AND_SORT_BY_NUMBER = 4;
const SORTING_METHOD_GROUP_BY_FILE_TYPE_AND_SORT_BY_FILENAME = 5;
const SORTING_METHOD_MODIFICATION_TIME = 6;
const SORTING_METHOD_CREATION_TIME = 7;

_1KB = 1024;
_1MB = 1024 * _1KB;
_1GB = 1024 * _1MB;

_20MB = 20 * _1MB;
_5GB = 5 * _1GB;

function read_file_content_to_cache(input_filepath, recursive) {
    if (input_filepath == null) {
        console.error('input_filepath is null');
        return;
    }

    if (recursive == null) {
        recursive = false;
    } else if (recursive == true) {
        // recursive = true;
    } else {
        recursive = false;
    }
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

        return;
    } else if (file_stat.isDirectory()) {
        if (recursive) {
            let child_filename_list = fs.readdirSync(input_filepath);
            for (let child_filename of child_filename_list) {
                let child_filepath = path.join(input_filepath, child_filename);
                read_file_content_to_cache(child_filepath, true);
            }
        }
    }
}

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

function get_saved_sorting_method(input_dict) {
    if (typeof (input_dict) == null) {
        return null;
    }

    let input_path = input_dict['input_path'];
    let default_sorting_method = input_dict['default_sorting_method'];
    let retval = default_sorting_method;
    let saved_sorting_method_array = input_dict['saved_sorting_method_array'];

    if (typeof (input_path) !== 'string') {
        return retval;
    }

    if (typeof (saved_sorting_method_array) !== 'object') {
        return retval;
    }

    if (typeof (saved_sorting_method_array.length) !== 'number') {
        return retval;
    }

    if (saved_sorting_method_array.length > 0) { } else {
        return retval;
    }

    let _input_path = to_internal_path(input_path);
    for (let i = 0; i < saved_sorting_method_array.length; i++) {
        let saved_sorting_method_info = saved_sorting_method_array[i];
        if (saved_sorting_method_info.location == null) {
            continue;
        }

        if (typeof (saved_sorting_method_info.location) !== 'string') {
            continue;
        }

        let _saved_path = to_internal_path(saved_sorting_method_info.location);

        if (_input_path === _saved_path) {
            sorting_method = saved_sorting_method_info.method;
            // TODO validate sorting_method
            break;
        }
    }

    return retval;
}

function sort_file_info_array_by_sorting_method(file_info_array, sorting_method) {
    if (typeof (file_info_array) !== 'object') {
        return;
    }

    if (typeof (file_info_array.length) !== 'number') {
        return;
    }

    if (file_info_array.length < 2) {
        return file_info_array;
    }

    if (sorting_method == null) {
        return file_info_array;
    }

    let retval = file_info_array;

    if (sorting_method === SORTING_METHOD_NONE) {
        // TODO
    } else if (sorting_method === SORTING_METHOD_IGNORE_EXTENSION_AND_SORT_BY_NUMBER) {
        retval = sort_filename_by_first_found_integer_strip_extension_push_invalid_basename_at_the_end(file_info_array);
    } else {
        // TODO
        console.warn(`${G}TODO${RS} handle unknown sorting_method ${R}${sorting_method}${RS}`);
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

function is_digit(c) {
    if (c == null) {
        return false;
    }

    if (typeof (c) !== 'string') {
        return false;
    }

    if (c.length !== 1) {
        return false;
    }

    return /\d/.test(c);
}

function find_first_integer_in_string(input_str) {
    if (input_str == null) {
        return null;
    }

    if (typeof (input_str) !== 'string') {
        return null;
    }

    let first_digit = false;
    let reading_integer = false;
    let retval_integer_str = '';
    for (let i = 0; i < input_str.length; i++) {
        let c = input_str[i];
        if (!first_digit) {
            if (is_digit(c)) {
                first_digit = true;
                reading_integer = true;
                retval_integer_str = retval_integer_str.concat(c);
            }
        }

        if (reading_integer) {
            if (is_digit(c)) {
                retval_integer_str = retval_integer_str.concat(c);
            } else {
                break;
            }
        }
    }

    if (retval_integer_str.length < 1) {
        return null;
    }

    return parseInt(retval_integer_str);
}

function sort_filename_by_integer_strip_extension_push_invalid_basename_at_the_end(file_info_array) {
    if (file_info_array == null) {
        return;
    }

    if (typeof (file_info_array) !== 'object') {
        return file_info_array;
    }

    if (typeof (file_info_array.length) !== 'number') {
        return file_info_array;
    }

    if (file_info_array.length < 2) {
        return file_info_array;
    }

    let retval = [];
    let tmp_array = [];
    let invalid_file_info_array = [];

    for (let i = 0; i < file_info_array.length; i++) {
        let file_info = file_info_array[i];
        let filename = file_info['filename'];

        if (filename == null) {
            return file_info_array;
        }

        if (typeof (filename) !== 'string') {
            return file_info_array;
        }

        let _filename = filename;
        let dot_idx = _filename.lastIndexOf('.');

        if (dot_idx === -1) { }
        else if (dot_idx === 0) {
            invalid_file_info_array.push(file_info);
            continue;
        } else {
            _filename = _filename.substring(0, dot_idx);
        }

        if (_filename.length === 0) {
            invalid_file_info_array.push(file_info);
            continue;
        }

        let basename = _filename;

        if (basename.length === 0) {
            invalid_file_info_array.push(file_info);
            continue;
        }

        let is_integer = /^\d+$/.test(basename);
        if (!is_integer) {
            invalid_file_info_array.push(file_info);
            continue;
        }

        let int_value = parseInt(basename);
        tmp_array.push({
            'key': int_value,
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

    if (invalid_file_info_array.length > 0) {
        retval = retval.concat(invalid_file_info_array);
    }

    return retval;
}


function sort_filename_by_first_found_integer_strip_extension_push_invalid_basename_at_the_end(file_info_array) {
    if (file_info_array == null) {
        return;
    }

    if (typeof (file_info_array) !== 'object') {
        return file_info_array;
    }

    if (typeof (file_info_array.length) !== 'number') {
        return file_info_array;
    }

    if (file_info_array.length < 2) {
        return file_info_array;
    }

    let retval = [];
    let tmp_array = [];
    let invalid_file_info_array = [];

    for (let i = 0; i < file_info_array.length; i++) {
        let file_info = file_info_array[i];
        let filename = file_info['filename'];

        if (filename == null) {
            return file_info_array;
        }

        if (typeof (filename) !== 'string') {
            return file_info_array;
        }

        let _filename = filename;
        let dot_idx = _filename.lastIndexOf('.');

        if (dot_idx === -1) { }
        else if (dot_idx === 0) {
            invalid_file_info_array.push(file_info);
            continue;
        } else {
            _filename = _filename.substring(0, dot_idx);
        }

        if (_filename.length === 0) {
            invalid_file_info_array.push(file_info);
            continue;
        }

        let basename = _filename;

        if (basename.length === 0) {
            invalid_file_info_array.push(file_info);
            continue;
        }

        let is_integer = find_first_integer_in_string(basename);
        if (is_integer == null) {
            invalid_file_info_array.push(file_info);
            continue;
        }

        let int_value = is_integer;
        tmp_array.push({
            'key': int_value,
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

    if (invalid_file_info_array.length > 0) {
        retval = retval.concat(invalid_file_info_array);
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
    let filepath = to_platform_path(file_info['filepath']);
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

    document.title = filepath;

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
                        if (state.read_next_image_to_cache_in_ram) {

                        }
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

    // valid_image_filepath_info_array = sort_filename_array_method0(valid_image_filepath_info_array);
    valid_image_filepath_info_array = sort_filename_by_first_found_integer_strip_extension_push_invalid_basename_at_the_end(valid_image_filepath_info_array);
    let first_image_filepath_info = valid_image_filepath_info_array[0];
    return show_single_image({
        'filepath': first_image_filepath_info['filepath'],
        'parent': filepath,
        'gallery_root': gallery_root,
    });
}

function is_in_top_level_location(input_dict) {
    if (input_dict == null) {
        console.error('input_dict is null');
        return;
    }

    let current_location = input_dict['current_location'];
    let top_level_location = input_dict['top_level_location'];
    let ignore_case = input_dict['ignore_case'];

    if (current_location == null) {
        console.error('current_location is null');
        return;
    }

    if (typeof (current_location) !== 'string') {
        console.error('current_location is not a string');
        return;
    }

    if (top_level_location == null) {
        console.error('top_level_location is null');
        return;
    }

    if (typeof (top_level_location) !== 'string') {
        console.error('top_level_location is not a string');
        return;
    }

    if (ignore_case == null) {
        ignore_case = false;
    }

    if (typeof (ignore_case) !== 'boolean') {
        console.error('ignore_case is not a boolean');
        return;
    }

    let current_location_parts = [];
    current_location = current_location.replace(/[\/\\\\]+/g, '/')
    let _parts = current_location.split('/');
    for (let i = 0; i < _parts.length; i++) {
        let _part = _parts[i];
        if (_part.length == 0) {
            continue;
        }

        if (ignore_case) {
            // TODO handle ASCII and unicode - only ASCII is handled here
            _part = _part.toUpperCase();
        }

        current_location_parts.push(_part);
    }

    let top_level_location_parts = [];
    top_level_location = top_level_location.replace(/[\/\\\\]+/g, '/')
    _parts = top_level_location.split('/');
    for (let i = 0; i < _parts.length; i++) {
        let _part = _parts[i];
        if (_part.length == 0) {
            continue;
        }

        if (ignore_case) {
            // TODO handle ASCII and unicode - only ASCII is handled here
            _part = _part.toUpperCase();
        }

        top_level_location_parts.push(_part);
    }

    if (current_location_parts.length < top_level_location_parts.length) {
        return false;
    }

    for (let i = 0; i < top_level_location_parts.length; i++) {
        let _part = top_level_location_parts[i];
        if (current_location_parts[i] !== _part) {
            return false;
        }
    }

    return true;
}

function next_image_in_top_level_location(input_dict) {
    // console.log(input_dict);
    if (input_dict == null) {
        console.error('input_dict is null');
        return;
    }

    let check_current_location = input_dict['check_current_location'];
    if (check_current_location == null) {
        check_current_location = true;
    }

    let current_location = input_dict['current_location'];
    let top_level_location = input_dict['top_level_location'];
    let backward = input_dict['backward'];
    let default_sorting_method = input_dict['default_sorting_method'];
    let saved_sorting_method_array = input_dict['saved_sorting_method_array'];

    console.log(current_location);
    console.log('- ' + top_level_location);

    if (check_current_location) {
        if (current_location == null) {
            console.error('current_location is null');
            return;
        }

        if (typeof (current_location) !== 'string') {
            current_location = null;
            console.error('current_location is not a string');
            return;
        }

        // TODO handle FTP and network path and archive file
        if (!fs.existsSync(current_location)) {
            console.error('current_location does not exist');
            return;
        }
    }

    if (top_level_location == null) {
        console.error('top_level_location is null');
        return;
    }

    if (typeof (top_level_location) !== 'string') {
        console.error('top_level_location is not a string');
        return;
    }

    // TODO handle FTP and network path and archive file
    if (!fs.existsSync(top_level_location)) {
        console.error('top_level_location does not exist');
        return;
    }

    if (backward == null) {
        backward = false;
    }

    if (default_sorting_method == null) {
        // default_sorting_method = SORTING_METHOD_NONE;
        default_sorting_method = SORTING_METHOD_IGNORE_EXTENSION_AND_SORT_BY_NUMBER;
    }

    if (!check_current_location) {
        let _parent = top_level_location;
        let child_filename_array = fs.readdirSync(to_platform_path(_parent));

        if (child_filename_array.length === 0) {
            console.log('no child file found');
            // TODO handle deleted file and directory
            return;
        }

        let sorting_method = get_saved_sorting_method({
            'input_path': _parent,
            'default_sorting_method': default_sorting_method,
            'saved_sorting_method_array': saved_sorting_method_array,
        });

        let _tmp_file_info_array = [];
        for (let i = 0; i < child_filename_array.length; i++) {
            let _tmp_file_info = {
                'filename': child_filename_array[i],
            };

            _tmp_file_info_array.push(_tmp_file_info);
        }

        _tmp_file_info_array = sort_file_info_array_by_sorting_method(_tmp_file_info_array, sorting_method);
        let _tmp_child_filename_array = [];
        for (let i = 0; i < _tmp_file_info_array.length; i++) {
            let _tmp_file_info = _tmp_file_info_array[i];
            let _tmp_child_filename = _tmp_file_info['filename'];
            _tmp_child_filename_array.push(_tmp_child_filename);
        }

        child_filename_array = _tmp_child_filename_array;

        let found_location = null;

        for (let i = 0; i < child_filename_array.length; i++) {
            let child_filename = child_filename_array[i];
            let child_filepath = _parent + '/' + child_filename;

            let child_file_info = get_path_info(child_filepath);

            if (child_file_info == null) {
                console.error('child_file_info is null');
                return;
            }

            if (child_file_info['type'] === 'symbolic_link') {
                console.warn('TODO handle symbolic link');
                continue;
            } else if (child_file_info['type'] === 'directory') {
                found_location = next_image_in_top_level_location({
                    'current_location': child_filepath,
                    'top_level_location': child_filepath,
                    'backward': backward,
                    'default_sorting_method': default_sorting_method,
                    'saved_sorting_method_array': saved_sorting_method_array,
                    'check_current_location': false,
                });

                if (found_location != null) {
                    return found_location;
                }
            } else if (child_file_info['type'] === 'regular_file') {
                if (is_supported_image_file(child_filename)) {
                    return child_filepath;
                }
            } else {
                console.error('unknown file type');
                continue;
            }
        }

        return found_location;
    } {
        let current_location_info = get_path_info(current_location);
        if (current_location_info == null) {
            console.error('current_location_info is null');
            return;
        }

        let _parent = null;
        let _filename = null;
        let _retval = os_path_split(current_location);
        _parent = _retval['parent'];
        _filename = _retval['filename'];

        if (_parent == null) {
            console.log('invalid path');
            return;
        }

        if (!is_in_top_level_location({
            'current_location': _parent,
            'top_level_location': top_level_location,
            'ignore_case': true,
        })) {
            console.log('not in top level location');
            // TODO handle loopback
            return;
        }


        let child_filename_array = fs.readdirSync(to_platform_path(_parent));
        let sorting_method = default_sorting_method;
        if (saved_sorting_method_array != null) {
            if (saved_sorting_method_array.length > 0) {
                for (let i = 0; i < saved_sorting_method_array; i++) {
                    let saved_sorting_method_info = saved_sorting_method_array[i];
                    if (saved_sorting_method_info.location == null) {
                        continue;
                    }

                    if (typeof (saved_sorting_method_info.location) !== 'string') {
                        continue;
                    }

                    if (to_platform_path(saved_sorting_method_info.location) === to_platform_path(_parent)) {
                        sorting_method = saved_sorting_method_info.method;
                        // TODO validate sorting_method
                        break;
                    }
                }
            }
        }

        if (sorting_method === SORTING_METHOD_NONE) {
            // TODO
        } else {
            // TODO
            console.warn('TODO handle sorting_method');
        }

        if (child_filename_array.length === 0) {
            console.log('no child file found');
            // TODO handle deleted file and directory
            return;
        }

        let current_idx = child_filename_array.indexOf(_filename);

        if (current_idx < 0) {
            console.error('current location not found in parent');
            // TODO pass known index and show the next entry in case we deleted the current file
            return;
        }

        let found_location = null;

        if (backward) {
            current_idx--;
            for (let i = current_idx; i >= 0; i--) {
                let child_filename = child_filename_array[i];
                let child_filepath = _parent + '/' + child_filename;

                let child_file_info = get_path_info(child_filepath);

                if (child_file_info == null) {
                    console.error('child_file_info is null');
                    return;
                }

                if (child_file_info['type'] === 'symbolic_link') {
                    console.warn('TODO handle symbolic link');
                    continue;
                } else if (child_file_info['type'] === 'directory') {
                    found_location = next_image_in_top_level_location({
                        'current_location': child_filepath,
                        'top_level_location': child_filepath,
                        'backward': backward,
                        'default_sorting_method': default_sorting_method,
                        'saved_sorting_method_array': saved_sorting_method_array,
                        'r': true,
                    });

                    if (found_location != null) {
                        break;
                    }
                } else if (child_file_info['type'] === 'regular_file') {
                    if (is_supported_image_file(child_filename)) {
                        found_location = child_filepath;
                        break;
                    }
                } else {
                    console.error('unknown file type');
                    continue;
                }
            }
        } else {
            current_idx++;
            for (let i = current_idx; i < child_filename_array.length; i++) {
                let child_filename = child_filename_array[i];
                let child_filepath = _parent + '/' + child_filename;

                let child_file_info = get_path_info(child_filepath);

                if (child_file_info == null) {
                    console.error('child_file_info is null');
                    return;
                }

                if (child_file_info['type'] === 'symbolic_link') {
                    console.warn('TODO handle symbolic link');
                    continue;
                } else if (child_file_info['type'] === 'directory') {
                    found_location = next_image_in_top_level_location({
                        'current_location': child_filepath,
                        'top_level_location': child_filepath,
                        'backward': backward,
                        'default_sorting_method': default_sorting_method,
                        'saved_sorting_method_array': saved_sorting_method_array,
                        'check_current_location': false,
                    });

                    if (found_location != null) {
                        break;
                    }
                } else if (child_file_info['type'] === 'regular_file') {
                    if (is_supported_image_file(child_filename)) {
                        found_location = child_filepath;
                        break;
                    }
                } else {
                    console.error('unknown file type');
                    continue;
                }
            }
        }

        let _exclude_filepath = _parent;
        let split_retval = os_path_split(_exclude_filepath);
        let _exclude_filename = split_retval.filename;
        let _indexing_location = split_retval.parent;

        while (is_in_top_level_location({
            'current_location': _indexing_location,
            'top_level_location': top_level_location,
            'ignore_case': true,
        })) {
            let child_filename_array = fs.readdirSync(to_platform_path(_indexing_location));
            // TOOD handle sorting
            let current_idx = child_filename_array.indexOf(_exclude_filename);

            if (current_idx < 0) {
                console.error('current location not found in parent');
                return;
            }

            let increment = 1;
            if (backward) {
                increment = -1;
            }

            while (true) {
                current_idx += increment;
                if (current_idx < 0) {
                    break;
                }

                if (current_idx >= child_filename_array.length) {
                    break;
                }

                let child_filename = child_filename_array[current_idx];
                let child_filepath = _indexing_location + '/' + child_filename;


                let child_file_info = get_path_info(child_filepath);

                if (child_file_info == null) {
                    console.error('child_file_info is null');
                    return;
                }

                if (child_file_info['type'] === 'symbolic_link') {
                    console.warn('TODO handle symbolic link');
                    continue;
                } else if (child_file_info['type'] === 'directory') {
                    found_location = next_image_in_top_level_location({
                        'current_location': child_filepath,
                        'top_level_location': child_filepath,
                        'backward': backward,
                        'default_sorting_method': default_sorting_method,
                        'saved_sorting_method_array': saved_sorting_method_array,
                        'check_current_location': false,
                    });

                    if (found_location != null) {
                        return found_location;
                    }
                } else if (child_file_info['type'] === 'regular_file') {
                    if (is_supported_image_file(child_filename)) {
                        return child_filepath;
                    }
                } else {
                    console.error('unknown file type');
                    continue;
                }
            }

            let _retval = next_image_in_top_level_location({
                'current_location': _exclude_filepath,
                'top_level_location': _indexing_location,
                'backward': backward,
                'default_sorting_method': default_sorting_method,
                'saved_sorting_method_array': saved_sorting_method_array,
            })

            if (_retval != null) {
                return _retval;
            }

            let _retval2 = os_path_split(_indexing_location);
            _exclude_filepath = _indexing_location;
            _exclude_filename = _retval2.filename;
            _indexing_location = _retval2['parent'];
        }
    }

    return null;
}

function next_image(
    backward,
    return_next_image_flag,
) {
    if (return_next_image_flag == null) {
        return_next_image_flag = false;
    } else if (return_next_image_flag === true) { } else {
        return_next_image_flag = false;
    }

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

    // valid_image_filepath_info_array = sort_filename_array_method0(valid_image_filepath_info_array);
    valid_image_filepath_info_array = sort_filename_by_first_found_integer_strip_extension_push_invalid_basename_at_the_end(valid_image_filepath_info_array);
    let current_showing_image_index = -1;
    for (let i = 0; i < valid_image_filepath_info_array.length; i++) {
        let image_filepath_info = valid_image_filepath_info_array[i];
        if (image_filepath_info.filename == current_showing_image_filename) {
            current_showing_image_index = i;
            break;
        }
    }

    let next_image_idx1 = -1;
    let next_image_idx2 = -1;

    if (current_showing_image_index == -1) {
        console.log('current showing image not found');
        next_image_idx1 = 0;

        if (return_next_image_flag) {
            if (valid_image_filepath_info_array.length > 1) {
                if (backward) {
                    next_image_idx2 = valid_image_filepath_info_array.length - 1;
                } else {
                    next_image_idx2 = 1;
                }
            }
        }
    } else {
        let next_image_step1 = 1;
        let next_image_step2 = 2;
        if (backward) {
            next_image_step1 = -1;
            next_image_step2 = -2;
        }

        // note % is remainder, not modulo
        next_image_idx1 = current_showing_image_index + next_image_step1;
        next_image_idx1 = (next_image_idx1 + valid_image_filepath_info_array.length) % valid_image_filepath_info_array.length;

        if (return_next_image_flag) {
            next_image_idx2 = current_showing_image_index + next_image_step2;
            next_image_idx2 = (next_image_idx2 + valid_image_filepath_info_array.length) % valid_image_filepath_info_array.length;
        }
    }

    let next_image_filepath_info1 = valid_image_filepath_info_array[next_image_idx1];
    let next_image_filepath_info2 = null;

    if (next_image_filepath_info1 == null) {
        console.error('next_image_filepath_info1 == null');
        return;
    }

    if (return_next_image_flag) {
        if (next_image_idx2 === next_image_idx1) {
            next_image_idx2 = -1;
        } else {
            next_image_filepath_info2 = valid_image_filepath_info_array[next_image_idx2];
            if (next_image_filepath_info2 == null) {
                console.error('next_image_filepath_info2 == null');
            }
        }

    }

    let next_image_filepath1 = null;
    let next_image_filepath2 = null;

    next_image_filepath1 = next_image_filepath_info1.filepath;
    if (next_image_filepath1 == null) {
        console.error('next image filepath not found');
        return;
    }

    if (return_next_image_flag) {
        if (next_image_filepath_info2 != null) {
            next_image_filepath2 = next_image_filepath_info2.filepath;
        }
    }

    if (to_web_friendly_path(current_showing_image_absolute_path) === to_web_friendly_path(next_image_filepath1)) {
        // TODO handle loop back to first image feedback
        console.error('this directory only have a single image');
        return;
    }

    let render_retval = show_single_image({
        'filepath': next_image_filepath1,
        'parent': current_showing_image_directory,
        'gallery_root': state.showing_image_gallery_root,
    });

    // if (return_next_image_flag) {
    //     if (next_image_filepath2 != null) {
    //         if (state.read_next_image_to_cache_in_ram) {
    //             setTimeout(function () {
    //                 // read_file_content_to_cache(next_image_filepath2);
    //                 let img = document.createElement('img');
    //                 img.src = to_web_friendly_path(next_image_filepath2);
    //             }, 100);
    //         }
    //     }
    // }

    return render_retval;
    // return {
    //     'render_retval': render_retval,
    //     'filepath': next_image_filepath1,
    //     'next_filepath': next_image_filepath2,
    //     'parent': current_showing_image_directory,
    //     'gallery_root': state.showing_image_gallery_root,
    // };
}

function next_image2(backward) {
    let preview_panel = document.getElementById('preview_view');
    if (preview_panel == null) {
        console.log('preview panel not found');
        return;
    }

    console.log('====================================================');

    let next_image_filepath = next_image_in_top_level_location({
        'current_location': state.showing_image_absolute_path,
        'top_level_location': state.showing_image_gallery_root,
        'backward': backward,
    });

    console.log('====================================================');

    if (next_image_filepath == null) {
        console.log('next image filepath not found');
        return;
    }

    return show_single_image({
        'filepath': next_image_filepath,
        'parent': os_path_split(next_image_filepath).parent,
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

    let _tmp_file_info_array = [];
    for (let i = 0; i < child_filename_array.length; i++) {
        let _tmp_file_info = {
            'filename': child_filename_array[i],
        };

        _tmp_file_info_array.push(_tmp_file_info);
    }

    _tmp_file_info_array = sort_filename_by_first_found_integer_strip_extension_push_invalid_basename_at_the_end(_tmp_file_info_array);
    let _tmp_child_filename_array = [];
    for (let i = 0; i < _tmp_file_info_array.length; i++) {
        let _tmp_file_info = _tmp_file_info_array[i];
        let _tmp_child_filename = _tmp_file_info['filename'];
        _tmp_child_filename_array.push(_tmp_child_filename);
    }

    child_filename_array = _tmp_child_filename_array;

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
        name_div.classList.add('ui_text');
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

            if (event.ctrlKey) {
                console.log('ctrl key pressed');
                let first_image_filepath = next_image_in_top_level_location({
                    'current_location': null,
                    'top_level_location': local_path,
                    'check_current_location': false,
                    'backward': false,
                })

                console.log(first_image_filepath);
                if (first_image_filepath == null) { return; }
                show_single_image({
                    'filepath': first_image_filepath,
                    'parent': os_path_split(local_path).parent,
                    'gallery_root': gallery_root,
                })

                return;
            }

            // check for expanded class
            for (let _class_idx = 0; _class_idx < name_div.classList.length; _class_idx++) {
                let _class_name = name_div.classList[_class_idx];
                if (_class_name == 'expanded') {
                    name_div.classList.remove('expanded');
                    // remove children
                    let child_container = li.querySelector('.child_container');
                    if (child_container == null) {

                    } else {
                        // clear child container
                        while (child_container.firstChild) {
                            child_container.removeChild(child_container.firstChild);
                        }
                    }

                    return;
                }
            }

            let path_info = get_path_info(local_path);
            if (path_info['type'] == 'directory') {
                console.log('directory');
                let child_filename_array = fs.readdirSync(to_platform_path(local_path));
                console.log(child_filename_array);

                let _tmp_file_info_array = [];
                for (let i = 0; i < child_filename_array.length; i++) {
                    let _tmp_file_info = {
                        'filename': child_filename_array[i],
                    };

                    _tmp_file_info_array.push(_tmp_file_info);
                }

                _tmp_file_info_array = sort_filename_by_first_found_integer_strip_extension_push_invalid_basename_at_the_end(_tmp_file_info_array);
                let _tmp_child_filename_array = [];
                for (let i = 0; i < _tmp_file_info_array.length; i++) {
                    let _tmp_file_info = _tmp_file_info_array[i];
                    let _tmp_child_filename = _tmp_file_info['filename'];
                    _tmp_child_filename_array.push(_tmp_child_filename);
                }

                child_filename_array = _tmp_child_filename_array;

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

                    name_div.classList.add('expanded');
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

// TODO function start with _ are non functional - they use global variables
// auto handle missing input parameters
// do not raise error

function find_next_image_in_location(input_dict) {
    let _loop = input_dict['loop'];
    let _current_location = input_dict['current'];
    let _parent_location = input_dict['parent'];
    let _backward = input_dict['backward'];

    // TODO migrate to using int-function dict
    let default_sorting_method = input_dict['default_sorting_method'];
    let saved_sorting_method_array = input_dict['saved_sorting_method_array'];

    if (_current_location == null) {
        console.error('current location is null');
        return;
    }

    // TODO handle network location
    let _current_location_absolute_path = path.resolve(to_platform_path(_current_location));
    let _retval = os_path_split(_current_location_absolute_path);
    let _current_location_filename = _retval['filename'];

    if (_current_location_filename == null) {
        console.error('failed to get filename from current location');
        return;
    }

    if (_parent_location == null) {
        _parent_location = _retval['parent'];
        if (_parent_location == null) {
            console.error('parent location is null and cannot be inferred from current location');
            return;
        }
    }

    let _parent_location_absolute_path = path.resolve(to_platform_path(_parent_location));
    // TODO handle deleted location
    let child_filename_array = fs.readdirSync(_parent_location_absolute_path);
    if (child_filename_array == null) {
        console.error(_parent_location_absolute_path);
        console.error('cannot list files in parent location');
        return;
    }

    if (child_filename_array.length == 0) {
        console.error('no files in parent location');
        return;
    }

    let _current_location_index = child_filename_array.indexOf(_current_location_filename);
    if (_current_location_index == -1) {
        console.error('current location not found in parent location');
        return;
    }

    let _next_location_index = _current_location_index;
    if (_backward) {
        _next_location_index--;
    } else {
        _next_location_index++;
    }

    if (_next_location_index < 0) {
        if (_loop) {
            _next_location_index = child_filename_array.length - 1;
        } else {
            console.error('cannot go backward');
            return;
        }
    }

    if (_next_location_index >= child_filename_array.length) {
        if (_loop) {
            _next_location_index = 0;
        } else {
            console.error('cannot go forward');
            return;
        }
    }

    let _next_location_filename = child_filename_array[_next_location_index];
    let _next_location_absolute_path = path.join(_parent_location_absolute_path, _next_location_filename);

    return {
        'parent': _parent_location,
        'filepath': _next_location_absolute_path,
        'filename': _next_location_filename
    };
}

function _next_image3() {
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

    // valid_image_filepath_info_array = sort_filename_array_method0(valid_image_filepath_info_array);
    valid_image_filepath_info_array = sort_filename_by_first_found_integer_strip_extension_push_invalid_basename_at_the_end(valid_image_filepath_info_array);

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

function toggle_popup_container_visibility() {
    let navigation_panel = document.getElementById('popup_container');
    if (navigation_panel == null) {
        console.log('navigation panel not found');
        return;
    }

    // adding and removing hidden class
    let was_hidden = navigation_panel.classList.toggle('hidden');
    let show_popup_container = document.getElementById('show_popup_container');
    if (show_popup_container == null) {
        console.log('show_popup_container not found');
        return;
    }

    if (!was_hidden) {
        show_popup_container.classList.add('hidden');
    } else {
        show_popup_container.classList.remove('hidden');
    }
}

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
        toggle_popup_container_visibility();
        // let navigation_panel = document.getElementById('popup_container');
        // if (navigation_panel == null) {
        //     console.log('navigation panel not found');
        //     return;
        // }
        // // adding and removing hidden class
        // navigation_panel.classList.toggle('hidden');
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
            if (event.ctrlKey) {
                (function () {
                    if (next_image2(false)) {
                        event.preventDefault();
                    }
                })();

            } else {
                (function () {
                    if (next_image(false)) {
                        event.preventDefault();
                    } else if (state.use_next_image2_fallback) {
                        if (next_image2(false)) {
                            event.preventDefault();
                        }
                    }
                })();
            }
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
            if (event.ctrlKey) {
                (function () {
                    if (next_image2(true)) {
                        event.preventDefault();
                    }
                })();
            } else {
                (function () {
                    if (next_image(true)) {
                        event.preventDefault();
                    } else if (state.use_next_image2_fallback) {
                        if (next_image2(true)) {
                            event.preventDefault();
                        }
                    }
                })();
            }
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
        let window = electron.remote.getCurrentWindow();
        window.setFullScreen(!window.isFullScreen());
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

let hide_popup_button = document.getElementById('hide_popup_button');
if (hide_popup_button == null) {
    console.error('hide_popup_button not found');
} else {
    hide_popup_button.addEventListener('click', function (event) {
        toggle_popup_container_visibility();
    });
}

let show_popup_container = document.getElementById('show_popup_container');
if (show_popup_container == null) {
    console.error('show_popup_container not found');
} else {
    show_popup_container.addEventListener('click', function () {
        toggle_popup_container_visibility();
    });
}

let use_next_image2_fallback_checkbox = document.getElementById('use_next_image2_fallback');
if (use_next_image2_fallback_checkbox == null) {
    console.error('use_next_image2_fallback not found');
} else {
    use_next_image2_fallback_checkbox.addEventListener('change', function (event) {
        state.use_next_image2_fallback = use_next_image2_fallback_checkbox.checked;
    });
}

let loop_images_in_current_directory_checkbox = document.getElementById('loop_images_in_current_directory');
if (loop_images_in_current_directory_checkbox == null) {
    console.error('loop_images_in_current_directory_checkbox not found');
} else {
    loop_images_in_current_directory_checkbox.addEventListener('change', function (event) {
        state.loop_images_in_current_directory = loop_images_in_current_directory_checkbox.checked;
    });
}

let read_next_image_to_cache_in_ram_checkbox = document.getElementById('read_next_image_to_cache_in_ram');
if (read_next_image_to_cache_in_ram_checkbox == null) {
    console.error('read_next_image_to_cache_in_ram_checkbox not found');
} else {
    read_next_image_to_cache_in_ram_checkbox.addEventListener('change', function (event) {
        state.read_next_image_to_cache_in_ram = read_next_image_to_cache_in_ram_checkbox.checked;
    });
}
