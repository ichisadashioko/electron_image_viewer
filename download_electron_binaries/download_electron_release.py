import os
import time
import json
import hashlib
import stat
import threading
import traceback
import io

import urllib
import urllib.parse

import requests
import enlighten


# for (let i = 0; i < anchor_list.length; i++) {
#     let anchor_el = anchor_list[i]; let url_str = anchor_el.href; let filename = anchor_el.text; url_info_list.push({ 'url': url_str, 'filename': filename }); }


RS = '\033[0m'
R = '\033[91m'
G = '\033[92m'
Y = '\033[93m'

########################################################################

cache_donwload_info_filepath = 'cache_donwload_info.tsv'
cache_lock = threading.Lock()


def split_input_list_for_threads(
    input_list: list,
    num_threads=8,
):
    num_threads = max(1, num_threads)
    num_threads = min(num_threads, len(input_list))

    # if num_threads == 0:
    #     return []

    thread_index = 0
    thread_input_list = [[] for _ in range(num_threads)]
    for input_item in input_list:
        thread_index = thread_index % num_threads
        thread_input_list[thread_index].append(input_item)
        thread_index += 1

    return thread_input_list


def check_if_url_is_cached(url_str: str):
    quoted_url_str = urllib.parse.quote(url_str, safe='')
    with cache_lock:
        if os.path.exists(cache_donwload_info_filepath):
            bs = open(cache_donwload_info_filepath, 'rb').read()
            line_list = bs.decode('utf-8').splitlines()
            for line in line_list:
                stripped_line = line.strip()
                if len(stripped_line) == 0:
                    continue

                cell_list = stripped_line.split('\t')
                if len(cell_list) == 0:
                    continue

                if cell_list[0] == quoted_url_str:
                    return True


def normalize_cell_list_for_tsv(cell_list: list):
    normalized_cell_list = []
    for cell_value in cell_list:
        if not isinstance(cell_value, str):
            cell_value = repr(cell_value)

        if '\t' in cell_value:
            cell_value = cell_value.replace('\t', '\\t')

        normalized_cell_list.append(cell_value)

    return normalized_cell_list


def store_cache_data(
    url_str: str,
    response_status_code: int,
    response_header_dict: dict,
    response_content_bs: bytes,
    used_proxy_url=None,
    timestamp_ns=None,
):
    quoted_url_str = urllib.parse.quote(url_str, safe='')
    response_content_length = len(response_content_bs)
    response_content_md5 = hashlib.md5(response_content_bs).hexdigest()
    # store response content in a separate file
    response_content_filepath = f'response_content_root/{response_content_md5}_{response_content_length}.bin'
    with cache_lock:
        if not os.path.exists(response_content_filepath):
            _parent_dir = os.path.split(response_content_filepath)[0]
            if not os.path.exists(_parent_dir):
                try:
                    os.makedirs(_parent_dir)
                except Exception as ex:
                    pass
                with open(response_content_filepath, 'wb') as outfile:
                    outfile.write(response_content_bs)

    cell_list = [
        quoted_url_str,
        response_status_code,
        json.dumps(response_header_dict, ensure_ascii=False),
        response_content_length,
        response_content_md5,
        used_proxy_url,
        timestamp_ns,
    ]

    normalized_cell_list = normalize_cell_list_for_tsv(cell_list)

    with cache_lock:
        with open(cache_donwload_info_filepath, 'ab+') as outfile:
            outfile.write('\t'.join(normalized_cell_list).encode('utf-8'))
            outfile.write('\n'.encode('utf-8'))


def batch_download_thread_function(input_dict: dict):
    try:
        proxy_url = input_dict['proxy_url']
        url_list = input_dict['url_list']
        enlighten_counter = input_dict['enlighten_counter']
        error_list = input_dict['error_list']
        retval_list = input_dict['retval_list']
        for url_str in url_list:
            try:
                if os.path.exists('stop'):
                    break

                if input_dict['stop']:
                    break

                enlighten_counter.update()
                if check_if_url_is_cached(url_str):
                    continue

                proxy_dict = None
                if proxy_url is not None:
                    proxy_dict = {
                        'http': proxy_url,
                        'https': proxy_url,
                    }

                response_obj = requests.get(
                    url_str,
                    proxies=proxy_dict,
                    timeout=60,
                    stream=True,
                )

                # provide update to enlighten
                response_content_buffer = io.BytesIO()

                response_status_code = response_obj.status_code
                response_header_dict = dict(response_obj.headers)

                content_length_value = None
                for k, v in response_header_dict.items():
                    if k.lower() == 'content-length':
                        content_length_value = v
                        break

                if content_length_value is not None:
                    try:
                        content_length_value = int(content_length_value)
                        # TODO
                    except Exception as ex:
                        stacktrace = traceback.format_exc()
                        print(f'{Y}{ex}{RS}', flush=True)
                        print(f'{R}{stacktrace}{RS}', flush=True)

                if isinstance(content_length_value, int):
                    start_time_ns = time.time_ns()
                    total_bytes_downloaded = 0
                    for chunk_bs in response_obj.iter_content(chunk_size=1024):
                        response_content_buffer.write(chunk_bs)
                        total_bytes_downloaded += len(chunk_bs)
                        elapsed_time_ns = time.time_ns() - start_time_ns
                        if elapsed_time_ns > 0:
                            speed_bytes_per_sec = total_bytes_downloaded / (elapsed_time_ns / 1e9)
                            enlighten_counter.desc = f'{url_str} {total_bytes_downloaded} bytes downloaded {speed_bytes_per_sec:.2f} bytes/sec'
                        else:
                            enlighten_counter.desc = f'{url_str} {total_bytes_downloaded} bytes downloaded'

                else:
                    total_bytes_downloaded = 0
                    for chunk_bs in response_obj.iter_content(chunk_size=10240):
                        response_content_buffer.write(chunk_bs)
                        total_bytes_downloaded += len(chunk_bs)
                        enlighten_counter.desc = f'{url_str} {total_bytes_downloaded} bytes downloaded'

                response_content_bs = response_content_buffer.getvalue()

                store_cache_data(
                    url_str=url_str,
                    response_status_code=response_status_code,
                    response_header_dict=response_header_dict,
                    response_content_bs=response_content_bs,
                    used_proxy_url=proxy_url,
                )
            except Exception as ex:
                stacktrace = traceback.format_exc()
                print(f'{Y}{ex}{RS}', flush=True)
                print(f'{R}{stacktrace}{RS}', flush=True)

                error_list.append({
                    'url': url_str,
                    'exception': ex,
                    'stacktrace': stacktrace,
                })
    except Exception as ex:
        stacktrace = traceback.format_exc()
        print(f'{Y}{ex}{RS}', flush=True)
        print(f'{R}{stacktrace}{RS}', flush=True)

########################################################################


# %%
input_json_str = open('github_release_page_data.json', 'rb').read().decode('utf-8')
download_info_list = json.loads(input_json_str)
print(f'len(download_info_list) {G}{len(download_info_list)}{RS}')
url_list = []
for download_info in download_info_list:
    url_list.append(download_info['url'])
print(f'len(url_list) {G}{len(url_list)}{RS}')
url_list = list(set(url_list))
print(f'len(url_list) {G}{len(url_list)}{RS}')

url_list = sorted(url_list)

# %%
input_str = open('proxy_url_list.tsv', 'rb').read().decode('utf-8')

proxy_url_list = input_str.splitlines()
proxy_url_list = list(map(lambda x: x.strip(), proxy_url_list))
proxy_url_list = list(filter(lambda x: len(x) > 0, proxy_url_list))
print(f'len(proxy_url_list) {G}{len(proxy_url_list)}{RS}')
proxy_url_list = list(set(proxy_url_list))
proxy_url_list.append(None)
print(f'len(proxy_url_list) {G}{len(proxy_url_list)}{RS}')

# %%
url_group_list = split_input_list_for_threads(url_list, num_threads=len(proxy_url_list))
print(f'len(url_group_list) {G}{len(url_group_list)}{RS}')

# %%
thread_error_list = []
thread_success_list = []
thread_list = []
manager = enlighten.get_manager()
enlighten_counter_list = []
thread_input_dict_list = []

for idx, url_group in enumerate(url_group_list):
    entry_error_list = []
    thread_error_list.append(entry_error_list)

    entry_success_list = []
    thread_success_list.append(entry_success_list)

    enlighten_counter = manager.counter(total=len(url_group))
    enlighten_counter_list.append(enlighten_counter)

    proxy_url = proxy_url_list[idx]
    thread_input_dict = {
        'url_list': url_group,
        'proxy_url': proxy_url,
        'stop': False,
        'retval_list': entry_success_list,
        'error_list': entry_error_list,
        'enlighten_counter': enlighten_counter,
    }

    thread_input_dict_list.append(thread_input_dict)

    thread = threading.Thread(
        target=batch_download_thread_function,
        args=[thread_input_dict, ],
    )

    thread_list.append(thread)
    thread.start()

for thread in thread_list:
    try:
        thread.join()
    except Exception as ex:
        stacktrace = traceback.format_exc()
        print('', flush=True)
        print(f'{Y}{ex}{RS}')
        print(f'{Y}{stacktrace}{RS}')
        print('', flush=True)

all_success_log = []
all_error_log = []

for entry_success_list in thread_success_list:
    all_success_log.extend(entry_success_list)

for entry_error_list in thread_error_list:
    all_error_log.extend(entry_error_list)

print('', flush=True)
print(f'len(all_success_log) {G}{len(all_success_log)}{RS}')
print(f'len(all_error_log) {R}{len(all_error_log)}{RS}')
print('', flush=True)
