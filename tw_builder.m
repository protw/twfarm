function tw_builder
  jconfile = "tw_build_conf.json";
  jd = get_tw_build_conf(jconfile);
  wiki_farm_len = length(jd.wiki_farm);
  
  # check and init wiki_farm files and folders
  conf_complete = conf_wiki_environment(jd); # main_wiki
  if !conf_complete, return, endif
  for i=1:wiki_farm_len
    conf_complete = conf_wiki_environment(jd,i);
    if !conf_complete, return, endif
  endfor  

  printf("Eventually %d wiki folders are to process:\n",wiki_farm_len)
  # Main cycle for building htmls
  for i=1:wiki_farm_len
    wiki_name = jd.wiki_farm(i).wiki_name;
    printf("%d) Wiki %s",i,upper(wiki_name))

    update_logo_to_main_wiki(jd, i);

    tw_dir = jd.wiki_farm(i).local_dir;
    if is_git_commit_needed(tw_dir)
      printf(" - html wiki to rebuild\n")
      tw_html_builder(jd, wiki_name); # building a particular wiki from farm
      update_flag = true;
    else
      printf(" - html wiki is up to date\n")
    endif
  endfor

  wiki_name = jd.main_wiki.wiki_name;
  printf("Main wiki %s",upper(wiki_name))
  tw_dir = jd.main_wiki.local_dir;
  if is_git_commit_needed(tw_dir)
    printf(" - html wiki to rebuild\n")
    tw_html_builder(jd); # building main wiki
  else
    printf(" - html wiki is up to date\n")
  endif

  printf("DONE!\n")
  system('timeout /t 10')
endfunction

function res = tw_exist(tw_dir, jd)
  res = isfile([tw_dir "\\" jd.tw_info]) && ...
        isfolder([tw_dir jd.tid_dir ]);
endfunction

function str2file(s,f)
  fh = fopen(f,'w');
  fdisp(fh,s);
  fclose(fh);
endfunction

function jd = get_tw_build_conf(jconfile)
  # Configuration
  # LOADJSON - with a use of https://github.com/fangq/jsonlab/
  jconfile_attrib = dir(jconfile);
  if length(jconfile_attrib) != 1
    error('No distinct single config TWFARM file found');
  endif
  jd = loadjson(jconfile);
  # Check the number of node wikis
  if length(jd.wiki_farm) == 0
    error("The wiki farm list is empty!")
  endif
  # Check presence of MAIN_WIKI
  if !tw_exist(jd.main_wiki.local_dir, jd)
    error(["Main wiki does not exist in " upper(jd.main_wiki.local_dir)])
  endif
  # convert from cell array to struct array
  for i = 1:length(jd.wiki_farm)
    wiki_farm(i) = jd.wiki_farm{i};
  endfor
  jd.wiki_farm=wiki_farm;
  jd.datenum = jconfile_attrib.datenum;
  system('git config core.autocrlf true');
endfunction

function conf_complete = conf_wiki_environment(jd,i)
  conf_complete = true;
  if exist("i","var")
    local_dir = jd.wiki_farm(i).local_dir;
    wiki_name = jd.wiki_farm(i).wiki_name;
    spec_dir = [local_dir jd.build_dir];
  else
    local_dir = jd.main_wiki.local_dir;
    wiki_name = jd.main_wiki.wiki_name;
    spec_dir = [local_dir jd.tid_dir jd.main_wiki.logo_dir "\\"];
  endif
  # Check the node TW existence
  if !tw_exist(local_dir, jd)
    printf("Wiki %s does not exist\n",upper(wiki_name))
    conf_complete = false;
    return;
  endif
  if !isfolder(spec_dir)
    system(['mkdir "' spec_dir '"']);
  endif
  sep_git_dir = [jd.sep_git_dir "\\" wiki_name];
  if !isfolder(sep_git_dir)
    system(['mkdir "' sep_git_dir '"']);
  endif
  sep_git_file = [local_dir '\\.git'];
  if !isfile(sep_git_file)
    system(['git -C "' local_dir '" init --separate-git-dir "' sep_git_dir '"']);
  endif
  git_ignore_file = [local_dir '\\.gitignore'];
  if !isfile(git_ignore_file)
    s = 'desktop.ini';
    str2file(s,git_ignore_file)
  endif
endfunction

function update_logo_to_main_wiki(jd, i)
  logo_dir = [jd.main_wiki.local_dir jd.tid_dir jd.main_wiki.logo_dir "\\"];
  tw_dir = jd.wiki_farm(i).local_dir;
  wiki_name = jd.wiki_farm(i).wiki_name;
  wiki_domain = jd.wiki_domain;
  github_main = jd.github_main;
  
  # logo_js - logo tiddler name inside tiddler
  # Find a standard logo tiddler '$__boa_logo.*' in the current 
  # node wiki and copy it to folder logo_dir
  logo_pref = regexprep(jd.logo_js,'[:/]','_');
  logo_file_mask = [tw_dir jd.tid_dir "\\" logo_pref ".*"];
  logo_files = dir(logo_file_mask);
  latest_date_of_logo_files = max([logo_files.datenum]);
  # Check the number of logo_files == 2
  if length(logo_files) != 2
    templ_s = [
      "Number of files '%s.* in wiki %s'\n" ...
      "is not equal 2, therefore their copying omitted.\n" ...
      "Execution stops!" ];
    err_s = sprintf(templ_s,logo_pref,wiki_name);
    error(err_s)
  endif
  # Find standard logo file in main_wiki folder for logos
  mw_logo_file_mask = [logo_dir wiki_name ".*"];
  mw_logo_files = dir(mw_logo_file_mask);
  latest_date_of_mw_logo_files = max([mw_logo_files.datenum]);
  # check if the logo in the main wiki is up to date (ie later than from wiki)
  # than no actions are needed and transf_complete = true;
  if latest_date_of_mw_logo_files > latest_date_of_logo_files || ...
     latest_date_of_mw_logo_files > jd.datenum; 
    return
  endif

  # delete logo files of a specific wiki in main_wiki
  system(['del "' mw_logo_file_mask '">nul']);

  # Copying and renaming logo files into 'logo_dir' folder
  for j = 1:length(logo_files)
    [~,f_name,f_ext] = fileparts(logo_files(j).name);
    logo_file = [logo_files(j).folder "\\" logo_files(j).name];
    if strcmpi(f_ext,".meta")
      [~,~,img_ext] = fileparts(f_name);
      s_tid = fileread(logo_file);
      tidstruct = tidstr2tidstruct(s_tid);
      tidstruct.title = [wiki_name img_ext];
      tidstruct.('wiki-created') = tidstruct.created;
      tidstruct.('wiki-modified') = datestr(now(),'yyyymmddHHMMSSFFF');
      tidstruct.('wiki-address') = [wiki_domain wiki_name];
      tidstruct.('wiki-github') = [github_main wiki_name];
      new_s_tid = tidstruct2tidstr(tidstruct);
      f_name_new = regexprep(f_name,"([^\.]+)(\.[^\.]+)",[wiki_name "$2"]);
      meta_file = [logo_dir "\\" f_name_new ".meta"];
      str2file(new_s_tid,meta_file)
    else
      system(['copy /y "' logo_file '" "' logo_dir wiki_name f_ext '">nul']);
    endif
  endfor
endfunction

function diff_code = is_git_commit_needed(tw_dir)
  diff_code = system(['git -C "' tw_dir '" diff --exit-code > nul']);
endfunction

function tw_html_builder(jd, wiki_name)
  if exist("wiki_name", "var") # wiki_name from the wiki farm
    i = find(strcmp({jd.wiki_farm.wiki_name},wiki_name));
    tw_dir = jd.wiki_farm(i).local_dir;
    html_dir = [tw_dir jd.build_dir];
    github_repo = jd.wiki_farm(i).github;
  else # main wiki case
    wiki_name = jd.main_wiki.wiki_name;
    tw_dir = jd.main_wiki.local_dir;
    html_dir = tw_dir;
    github_repo = jd.main_wiki.github;
  endif
  
  html_index_file = [html_dir '\' jd.html_file];
  html_images_dir = [html_dir jd.img_dir];
  tmp_dir = tempname();
  if isfolder(tmp_dir), system(['rmdir /s/q "' tmp_dir '"']); endif
  if isfolder(html_images_dir), system(['rmdir /s/q "' html_images_dir '"']); endif
  if isfile(html_index_file), system(['del /f/q "' html_index_file '"']); endif
  system(['xcopy /s/i/q "' tw_dir '\*.*" "' tmp_dir ...
    '" /exclude:tw_exclude.list > nul']);
  img_filter = ["[is[image]] -[title[" jd.logo_js "]] -[[$:/favicon.ico]]"];
  html_tw_build_cmd = [
    'tiddlywiki "' tmp_dir '" ' ...
    '--savetiddlers "' img_filter '" "' html_images_dir '" '...
    '--setfield "' img_filter '" _canonical_uri ' ...
    '$:/core/templates/canonical-uri-external-image text/plain ' ...
    '--setfield "' img_filter '" text "" text/plain '...
    '--rendertiddler $:/plugins/tiddlywiki/tiddlyweb/save/offline "'...
    html_index_file '" text/plain > nul'
  ];
  system(html_tw_build_cmd);
  system(['rmdir /s/q "' tmp_dir '"']);
  
  # %1 = tw_dir
  # %2 = strftime("%Y-%m-%e %X",localtime(time()))
  # %3 = github_repo
  git_sync = {
    'git -C "%1" add -A'
    'git -C "%1" commit -a -m "Update %2"'
    'git -C "%1" push --progress "%3" master --force'
  };
  git_sync = strrep(git_sync,"%1",tw_dir);
  git_sync = strrep(git_sync,"%2",strftime("%Y-%m-%e %X",localtime(time())));
  git_sync = strrep(git_sync,"%3",github_repo);
  printf("Github repo of %s is syncronizing...\n",upper(wiki_name))
  ###### THE LAST COMMAND IS EXECUTED WITH CARE SO FAR
  #selected={'airzoom' 'twfarm' 'prosteer' 'treemap'};
  for i = 1:length(git_sync)
    printf("%s\n",git_sync{i})
    #if i < 3 || i == 3 && any(strcmp(selected,wiki_name))
      system(git_sync{i});
    #endif
  endfor
endfunction

function tidstruct = tidstr2tidstruct(s)
x=strsplit(s,'\n');
for i = 1:length(x)
  if isempty(x{i}), continue, endif
  y=strsplit(x{i},': ');
  if length(y) < 2, error('Wrong format of *.meta tiddler'), endif
  tidstruct.(y{1}) = strjoin({y{2:end}},': ');
endfor
if (length(x) - i) > 1, tidstruct.text = strjoin(x{i+1:end},'\n'); endif
endfunction

function s = tidstruct2tidstr(tidstruct)
  f = fieldnames(tidstruct);
  iexcl = find(strcmp(f,'text'));
  if !isempty(iexcl), f(iexcl) = []; endif
  s = '';
  for i = 1:length(f)
    s = [s sprintf('%s: %s\n',f{i},tidstruct.(f{i}))];
  endfor
  if !isempty(iexcl), s = [s sprintf('\n%s',tidstruct.text)]; endif
endfunction
