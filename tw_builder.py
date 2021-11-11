# TW Farm Builder v. 2.0, 20.10.2019
# Author (c) Olegh Bondarenko, https://protw.github.io/oleghbond

import subprocess, json, os, tempfile, shutil, re, glob, time
from datetime import datetime, date

# global jd
jconfile = 'tw_build_conf.json'

def wiki_farm_conf():
    global jd
    # Reading wiki farm config file
    with open(jconfile, encoding='utf-8') as jf:
        jd = json.load(jf)
    if len(jd['wiki_farm'].keys()) <= 1:
        raise Exception('The wiki farm list is too short!')
    d = jd['wiki_farm']['main_wiki']['local_dir']
    if not tw_exist(d):
        raise Exception(f"Main wiki does not exist in {d}")
    tmp_dir = jd['conf']['tmp_dir']
    if not os.path.isdir(tmp_dir):
        os.mkdir(tmp_dir)
    sep_git_dir = jd['conf']['sep_git_dir']
    if not os.path.isdir(sep_git_dir):
        os.mkdir(sep_git_dir)
    subprocess.run('git config --global core.autocrlf false')
    conf_complete = True
    # local_dir, wiki_name, spec_dir
    for w_name in jd['wiki_farm']:
        local_dir = jd['wiki_farm'][w_name]['local_dir']
        if w_name == 'main_wiki':
            wiki_name = jd['wiki_farm'][w_name]['wiki_name']
            spec_dir = local_dir + jd['conf']['tid_dir'] + jd['conf']['logo_dir'] + '\\'
        else:
            wiki_name = w_name
            spec_dir = local_dir + jd['conf']['build_dir']
        
        # Check the node TW existence
        if not tw_exist(local_dir):
            print('Wiki %s does not exist\n' % wiki_name.upper())
            conf_complete = False
            break

        if not os.path.isdir(spec_dir):
            os.mkdir(spec_dir)
        sep_git_dir = jd['conf']['sep_git_dir'] + '\\' + wiki_name
        if not os.path.isdir(sep_git_dir):
            os.mkdir(sep_git_dir)
        sep_git_file = local_dir + '\\.git'
        if not os.path.isfile(sep_git_file):
            subprocess.run(f'git -C "{local_dir}" init --separate-git-dir "{sep_git_dir}"')
        git_ignore_file = local_dir + '\\.gitignore'
        if not os.path.isfile(git_ignore_file):
            s = 'desktop.ini'
            with open(git_ignore_file, 'w') as f:
                f.write(s)

    return conf_complete

def tw_exist(tw_dir):
    global jd
    return os.path.isfile(tw_dir + '\\' + jd['conf']['tw_info']) and \
           os.path.isdir(tw_dir + jd['conf']['tid_dir'])

def is_git_commit_needed(tw_dir):
    res1 = subprocess.run(f'git -C "{tw_dir}" diff --exit-code --quiet', 
                          shell=True)
    res2 = subprocess.run(f'git -C "{tw_dir}" status -u', shell=True)
    if res2.stdout is None:
        exit_code2 = 0
    else:
        exit_code2 = 'untracked' in res2.stdout
    return res1.returncode or exit_code2

def tw_html_builder(w_name):
    global jd
    # wiki_name, html_dir
    github_repo = jd['wiki_farm'][w_name]['github']
    tw_dir = jd['wiki_farm'][w_name]['local_dir']
    if w_name == 'main_wiki':  # main wiki case
        wiki_name = jd['wiki_farm'][w_name]['wiki_name']
        html_dir = tw_dir
    
    else: # wiki_name from the wiki farm
        wiki_name = w_name
        html_dir = tw_dir + jd['conf']['build_dir']
    
    html_index_file = html_dir + '\\' + jd['conf']['html_file']
    html_images_dir = html_dir + jd['conf']['img_dir']
    if not is_git_commit_needed(tw_dir) and os.path.exists(html_index_file):
        print(' - html wiki is up to date')
        return

    print(' - html wiki to rebuild')
    # create temporary directory for canonical externalization of images
    tmp_dir = tempfile.TemporaryDirectory(dir=jd['conf']['tmp_dir'])
    # set tiddlywiki filter for all the images except system files
    img_filter = '"[is[image]] -[prefix[$:/]]"'

    html_tw_build_cmds = [
        # delete all files inside directory {html_images_dir} and then the 
        # directory
        # delete directory {html_images_dir}
        f'IF EXIST "{html_images_dir}" attrib -r -h /S "{html_images_dir}\\*.*"',
        f'IF EXIST "{html_images_dir}" del /Q "{html_images_dir}\\*.*"',
        f'IF EXIST "{html_images_dir}" attrib -r /D "{html_images_dir}"',
        f'IF EXIST "{html_images_dir}" rmdir /Q "{html_images_dir}"',
        # delete file {html_index_file}
        f'IF EXIST "{html_index_file}" del /Q "{html_index_file}"',
        # copy all wiki files recursively from {tw_dir} to {tmp_dir} for 
        # canonical externalization
        f'xcopy /s/i/q "{tw_dir}\\*.*" "{tmp_dir.name}" /exclude:tw_exclude.list',
        # canonical externalization all selected images {img_filter} of wiki 
        # in directory {tmp_dir} and generating the result in {html_index_file} 
        # and {html_images_dir}
        f'tiddlywiki "{tmp_dir.name}" ' +
        f'--savetiddlers {img_filter} "{html_images_dir}" ' +
        f'--setfield {img_filter} _canonical_uri ' +
        '$:/core/templates/canonical-uri-external-image text/plain ' +
        f'--setfield {img_filter} text "" text/plain ' +
        f'--rendertiddler $:/plugins/tiddlywiki/tiddlyweb/save/offline "{html_index_file}" text/plain'
    ]
    for html_tw_build_cmd in html_tw_build_cmds:
        subprocess.run(html_tw_build_cmd, shell=True)

    # patching html_index_file
    remove_pre_content_patch(html_index_file)
    # delete all files in directory tmp_dir + jd.conf.tid_dir and directory itself
    shutil.rmtree(tmp_dir.name + jd['conf']['tid_dir'])
    # delete all files in directory tmp_dir and directory itself
    shutil.rmtree(tmp_dir.name)

    today_label = datetime.today().strftime('%Y-%m-%d %H:%M:%S')
    git_sync = [
        f'git -C "{tw_dir}" add -A',
        f'git -C "{tw_dir}" commit -a -m "Update of {today_label}"',
        f'git -C "{tw_dir}" push --progress {github_repo} master --force'
    ]
    # THE LAST COMMAND IS EXECUTED WITH CARE SO FAR
    print('Github repo of %s is syncronizing...', wiki_name.upper())
    for s_git in git_sync:
        subprocess.run(s_git, shell=True)

def remove_pre_content_patch(file):
    # This is a patch for removing the content between <pre> and </pre>
    # in a _canonical_uri tiddler locating in a HTML-single-file wiki.
    search_token = r'(<div[^>]+_canonical_uri[^>]+>[\s]*<pre>)([^<]*)(</pre>[\s]*</div>)'
    replace_token = r'\1\3'
    with open(file, 'r', encoding='utf-8') as f:
        s_html_code = f.read()
    s_html_code_patched = re.sub(search_token, replace_token, s_html_code)
    with open(file, 'w') as f:
        f.write(s_html_code_patched)

def update_logo_to_main_wiki(wiki_name):
    global jd
    if(wiki_name == 'main_wiki'):
        return

    mw_logo_dir = jd['wiki_farm']['main_wiki']['local_dir'] + jd['conf']['tid_dir'] + jd['conf']['logo_dir'] + '\\'
    tw_dir = jd['wiki_farm'][wiki_name]['local_dir']

    # logo_js - logo tiddler name inside tiddler
    # Find a standard logo tiddler '$__boa_logo.*' in the current
    # node wiki and copy it to folder logo_dir
    logo_file_mask= '\\' + re.sub('[:/]', '_', jd['conf']['logo_js']) + '.*' # '\\' is for escaping 1st symbol '$'
    logo_file_dir = tw_dir + jd['conf']['tid_dir']
    logo_files = latest_filtered_file(logo_file_dir, logo_file_mask)
    if len(logo_files) == 0:
        raise Exception('Logo file does not exist in wiki ' + wiki_name.upper())

    # Find standard logo file in main_wiki folder for logos
    mw_logo_file_mask = wiki_name + '.*'
    mw_logo_files = latest_filtered_file(mw_logo_dir, mw_logo_file_mask)
    # check if the logo in the main wiki is up to date (ie later than from wiki)
    # than no actions are needed and transf_complete = true;
    if mw_logo_files['latest_date'] > logo_files['latest_date']:
        return

    # delete logo files of a specific wiki in main_wiki
    for mw_logo_file in mw_logo_files['files']:
        os.remove(mw_logo_dir + mw_logo_file.split('\\')[-1])

    # Copying and renaming logo files into 'logo_dir' folder
    for file in logo_files['files']:
        f_name_parts = file.split('.')
        f_ext = '.' + f_name_parts[-1]
        logo_file = logo_file_dir + '\\' + file.split('\\')[-1]
        if f_ext == '.meta':
            img_ext = '.' + f_name_parts[-2]
            with open(logo_file, 'r', encoding='utf-8') as f:
                s_tid = f.read()
            tidstruct = tidstr2tidstruct(s_tid)
            tidstruct['title'] = wiki_name + img_ext
            tidstruct['wiki-created'] = tidstruct['created']
            tidstruct['wiki-modified'] = date.today().strftime('%Y%d%m%H%M%S')
            tidstruct['wiki-address'] = jd['conf']['wiki_domain'] + wiki_name
            tidstruct['wiki-github'] = jd['conf']['github_main'] + wiki_name
            new_s_tid = tidstruct2tidstr(tidstruct)
            meta_file = mw_logo_dir + wiki_name + '.' + f_name_parts[-2] + f_ext
            with open(meta_file, 'w', encoding='utf-8') as f:
                f.write(new_s_tid)
        else:
            shutil.copyfile(logo_file, mw_logo_dir + wiki_name + f_ext)
    return

def latest_filtered_file(file_dir, file_mask):
    # Get list of all files only in the given directory
    file_list = filter(os.path.isfile, glob.glob(file_dir + file_mask)) ####

    # Sort list of files based on last modification time in ascending order
    file_list = sorted(file_list, key = os.path.getmtime)

    if len(file_list) == 0:
        return {'files':file_list, 'latest_date':'0'}
    elif len(file_list) != 2:
        raise Exception(f'Number of files "{file_mask}" in wiki is not equal 2.')

    # Get list of last modification time of file 
    latest_date = time.strftime('%Y%d%m-%H%M%S',\
                                time.gmtime(os.path.getmtime(file_list[-1])))

    return {'files':file_list, 'latest_date':latest_date}

def tidstr2tidstruct(s):
    tidstruct = {}
    x = s.split('\n')
    for i,val in enumerate(x):
        if len(val) == 0:
            continue
        y = val.split(': ')
        if len(y) < 2:
            break
            #raise Exception('Wrong format of *.meta tiddler')
        tidstruct[y[0]] = ': '.join(y[1:])

    if len(x) - 1 > i:
        tidstruct['text'] = '\n'.join(x[i-1:])
    return tidstruct

def tidstruct2tidstr(tidstruct):
    s = ''
    for key,val in tidstruct.items():
        if key == 'text':
            continue
        s += key + ": " + val + '\n'

    if 'text' in tidstruct:
        s += tidstruct['text']
    return s

##=== MAIN ===

print('TW Farm Builder v. 3.0, 8.11.2021')
print('Olegh Bondarenko (c), https://protw.github.io/oleghbond')

if not wiki_farm_conf(): 
    raise Exception('Configuration incomplete!')

print('Eventually %d wiki folders have been counted:' % len(jd['wiki_farm'].keys()))
i = 1
for wiki_name in jd['wiki_farm']:
    if wiki_name == 'main_wiki':
        continue
    print(f'== {i}) Wiki {wiki_name.upper()}', end='')
    i += 1
    update_logo_to_main_wiki(wiki_name)
    if not jd['wiki_farm'][wiki_name]['to_publish']:
        print(' - is not being publishing')
        continue

    tw_html_builder(wiki_name) # building a particular wiki from the farm

# building main wiki
wiki_name = 'main_wiki'
print('==== MAIN WIKI',end='')
tw_html_builder(wiki_name)

print('DONE!\n')

subprocess.run('timeout /t 10')
print('This is the end of the script')
