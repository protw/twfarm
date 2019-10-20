'use strict';
var fs = require('fs');
var child_process = require('child_process');
const jconfile = 'tw_build_conf_2.json';
let jd, wiki_name, tw_dir;

if (!wiki_farm_conf())
	Error('Configuration incomplete!');

console.log('Eventually %d wiki folders have been counted:\n',Object.keys(jd.wiki_farm).length)
let i = 1, html_file;
for (wiki_name in jd.wiki_farm) {
	if (wiki_name == 'main_wiki') continue;
	console.log('%d) Wiki %s', i++, wiki_name.toUpperCase());

	update_logo_to_main_wiki(wiki_name);

	tw_dir = jd.wiki_farm[wiki_name].local_dir;
	html_file = tw_dir + jd.conf.build_dir + '\\' + jd.conf.html_file;
	if (is_git_commit_needed(tw_dir) || !fs.existsSync(html_file)) {
		console.log(' - html wiki to rebuild\n');
  		tw_html_builder(wiki_name); // building a particular wiki from the farm
	}
	else
		console.log(' - html wiki is up to date\n');
}

// building main wiki
let w_name = 'main_wiki';
wiki_name = jd.wiki_farm[w_name].wiki_name;
console.log('Main wiki %s', wiki_name.toUpperCase());
tw_dir = jd.wiki_farm[w_name].local_dir;
html_file = tw_dir + jd.conf.html_file;
if (is_git_commit_needed(tw_dir) || !fs.existsSync(html_file)) {
	console.log(' - html wiki to rebuild\n');
	tw_html_builder(w_name);
}
else {
	console.log(' - html wiki is up to date\n');
}

console.log('DONE!\n');
let exit_code = run_cmd('timeout /t 10');


console.log('This is the end of the script');


function tw_html_builder(w_name) {
	let wiki_name, html_dir, exit_code;
	let github_repo = jd.wiki_farm[w_name].github;
	let tw_dir = jd.wiki_farm[w_name].local_dir;
	if (w_name == 'main_wiki') { // main wiki case
		wiki_name = jd.wiki_farm[w_name].wiki_name;
		html_dir = tw_dir;
	}
	else { // wiki_name from the wiki farm
		wiki_name = w_name;
		html_dir = tw_dir + jd.conf.build_dir;
	}
  
	let html_index_file = `"${html_dir}\\${jd.conf.html_file}"`;
	let html_images_dir = `"${html_dir}${jd.conf.img_dir}"`;
	let tmp_dir = `"${__dirname}\\${fs.mkdtempSync('_')}"`;
	if (fs.existsSync(html_images_dir) && fs.statSync(html_images_dir).isDirectory()) 
		fs.rmdirSync(html_images_dir,{'recursive':true});
	if (fs.existsSync(html_index_file) && fs.statSync(html_index_file).isFile()) 
		fs.rmdirSync(html_index_file,{'recursive':true});
	child_process.execSync(`xcopy /s/i/q "${tw_dir}\\*.*" ${tmp_dir} /exclude:tw_exclude.list`);
	let img_filter = `"[is[image]] -[title[${jd.logo_js}]] -[[$:/favicon.ico]]"`;
	let html_tw_build_cmd = 
		`tiddlywiki ${tmp_dir} ` +
    	`--savetiddlers ${img_filter} ${html_images_dir} ` + 
		`--setfield ${img_filter} _canonical_uri ` +
		`$:/core/templates/canonical-uri-external-image text/plain ` +
		`--setfield ${img_filter} text "" text/plain ` +
		`--rendertiddler $:/plugins/tiddlywiki/tiddlyweb/save/offline ` +
		`${html_index_file} text/plain`;
	run_cmd(html_tw_build_cmd); // child_process.execSync
	fs.rmdirSync(tmp_dir + jd.conf.tid_dir, {'recursive':true});
	fs.rmdirSync(tmp_dir, {'recursive':true});

	let today_label = Date();
	let git_sync = [
		`git -C ${tw_dir} add -A`,
		`git -C ${tw_dir} commit -a -m "Update of ${today_label}"`,
		`git -C ${tw_dir} push --progress ${github_repo} master --force`
	];
	////// THE LAST COMMAND IS EXECUTED WITH CARE SO FAR
	console.log('Github repo of %s is syncronizing...\n', wiki_name.toUpperCase())
	for (var s_git of git_sync)
		exit_code = run_cmd(s_git);
}
function update_logo_to_main_wiki(wiki_name) {
	if(wiki_name == 'main_wiki') return;

	let mw_logo_dir = jd.wiki_farm.main_wiki.local_dir + jd.conf.tid_dir + jd.conf.logo_dir + '\\';
	let tw_dir = jd.wiki_farm[wiki_name].local_dir;
	var exit_code;
  
	// logo_js - logo tiddler name inside tiddler
	// Find a standard logo tiddler '$__boa_logo.*' in the current 
	// node wiki and copy it to folder logo_dir
	let logo_file_mask= '\\' + jd.conf.logo_js.replace(/[:\/]/g, '_') + '\\..+'; // '\\' is for escaping 1st symbol '$'
	let logo_file_dir = tw_dir + jd.conf.tid_dir;
	let logo_files = latest_filtered_file(logo_file_dir, logo_file_mask);
	if (logo_files.length == 0)
		Error('Logo file does not exist in wiki ' + wiki_name.toUpperCase());

	// Find standard logo file in main_wiki folder for logos
	let mw_logo_file_mask = wiki_name + '\\..+';
	let mw_logo_files = latest_filtered_file(mw_logo_dir, mw_logo_file_mask);
	// check if the logo in the main wiki is up to date (ie later than from wiki)
	// than no actions are needed and transf_complete = true;
	if (mw_logo_files.latest_date > logo_files.latest_date)
		return;

	// delete logo files of a specific wiki in main_wiki
	for (let mw_logo_file of mw_logo_files)
		fs.unlinkSync(mw_logo_dir + mw_logo_file);

	// Copying and renaming logo files into 'logo_dir' folder
	for (var file of logo_files.files) {
		let f_name_parts = file.split('.');
		let f_ext = '.' + f_name_parts[f_name_parts.length-1];
		let logo_file = logo_file_dir + '\\' + file;
		if (f_ext == '.meta') {
			let img_ext = f_name_parts[1];
			let s_tid = fs.readFileSync(logo_file,'utf8');
			let tidstruct = tidstr2tidstruct(s_tid);
    		tidstruct.title = wiki_name + img_ext;
    		tidstruct['wiki-created'] = tidstruct.created;
    		tidstruct['wiki-modified'] = date_str_now();
    		tidstruct['wiki-address'] = jd.conf.wiki_domain + wiki_name;
    		tidstruct['wiki-github'] = jd.conf.github_main + wiki_name;
    		let new_s_tid = tidstruct2tidstr(tidstruct);
			let meta_file = mw_logo_dir + '\\' + wiki_name + '.' + f_name_parts[f_name_parts.length-2] + '.meta'
			fs.writeFileSync(meta_file, new_s_tid);
		}
		else
			fs.copyFileSync(logo_file, mw_logo_dir + wiki_name + f_ext);
	}
}
function date_str_now () {
	var d = new Date(); 
	return d.getFullYear() + 
		String(d.getMonth() + 1).padStart(2,'0') + 
		String(d.getDate()).padStart(2,'0') +
    	String(d.getHours()).padStart(2,'0') +
    	String(d.getMinutes()).padStart(2,'0') +
    	String(d.getSeconds()).padStart(2,'0');
}
function latest_filtered_file(file_dir, file_mask) {
	let filtered_files = [];
	let files = fs.readdirSync(file_dir);
	for (var index in files) {
		if (files[index].search(file_mask) > -1) {
			filtered_files.push(files[index]);
		}
	}
	let latest = 0;
	// Check the number of filtered_files == 2
	if (filtered_files.length == 0)
		return {'files':filtered_files, 'latest_date':latest};
	else if (filtered_files.length != 2) {
    	console.log('Number of files "%s" in wiki is not equal 2.\n', file_mask);
		Error('Execution stops!')
	}
	for (var index in filtered_files) {
		let file_modified = fs.statSync(file_dir + '\\' + filtered_files[index]).mtimeMs;
		latest = latest > file_modified ? latest : file_modified; 
	}
	return {'files':filtered_files, 'latest_date':latest};
}
function tidstr2tidstruct(s) {
	let tidstruct = {};
	let x = s.split('\n');
	for (var i = 0; i < x.length; i++) {
		if (x[i].length == 0) continue;
		let y = x[i].split(': ');
		if (y.length < 2) Error('Wrong format of *.meta tiddler');
		tidstruct[y[0]] = y.slice(1, y.length).join(': ');
	}
	//if (x.length - i > 0) 
	tidstruct['text'] = x.slice(i, x.length).join('\n');
	return tidstruct;
}
function tidstruct2tidstr(tidstruct) {
	let s = '';
	for (var field in tidstruct) {
		if (field == 'text') continue;
		s += field + ": " + tidstruct[field] + '\n';
	}
	s += '\n' + tidstruct['text'];
	return s;
}
function is_git_commit_needed(tw_dir) {
  let exit_code = run_cmd(`git -C ${tw_dir} diff --exit-code`);
  return exit_code;
}
function wiki_farm_conf () {
	// Reading wiki farm config file
	jd = JSON.parse(fs.readFileSync(jconfile, 'utf8'));
	if (Object.keys(jd.wiki_farm).length <= 1)
		Error('The wiki farm list is too short!');
	if (!tw_exist(jd.wiki_farm.main_wiki.local_dir))
		Error(`Main wiki does not exist in ${jd.wiki_farm.main_wiki.local_dir}`);
	let sep_git_dir = jd.conf.sep_git_dir;
	if (!fs.existsSync(sep_git_dir) || !fs.statSync(sep_git_dir).isDirectory()) {
		fs.mkdirSync(sep_git_dir);
	}
	var exit_code = run_cmd('git config --global core.autocrlf false');
	let conf_complete = true;
	let local_dir, wiki_name, spec_dir;
	for (let w_name in jd.wiki_farm) {
		local_dir = jd.wiki_farm[w_name].local_dir;
		if (w_name == 'main_wiki') {
			wiki_name = jd.wiki_farm[w_name].wiki_name;
			spec_dir = local_dir + jd.conf.tid_dir + jd.conf.logo_dir + '\\';
		}
		else {
			wiki_name = w_name;
			spec_dir = local_dir + jd.conf.build_dir;
		}
		// Check the node TW existence
		if (!tw_exist(local_dir)) {
			console.log('Wiki %s does not exist\n',wiki_name.toUpperCase());
			conf_complete = false;
			break;
		}
		if (!fs.existsSync(spec_dir) || !fs.statSync(spec_dir).isDirectory()) {
			fs.mkdirSync(spec_dir);
		}
		sep_git_dir = jd.conf.sep_git_dir + '\\' + wiki_name;
		if (!fs.existsSync(sep_git_dir) || !fs.statSync(sep_git_dir).isDirectory()) {
			fs.mkdirSync(sep_git_dir);
		}
		let sep_git_file = local_dir + '\\.git';
		if (!fs.existsSync(sep_git_file) || !fs.statSync(sep_git_file).isFile()) {
			exit_code = run_cmd(`git -C ${local_dir} init --separate-git-dir ${sep_git_dir}`);
		}
		let git_ignore_file = local_dir + '\\.gitignore';
		if (!fs.existsSync(git_ignore_file) || !fs.statSync(git_ignore_file).isFile()) {
			const s = 'desktop.ini';
			fs.writeFileSync(git_ignore_file, s);
		}
	}
	return conf_complete;
}
function tw_exist (tw_dir) {
	return fs.statSync(tw_dir + '\\' + jd.conf.tw_info).isFile() && 
		fs.statSync(tw_dir + jd.conf.tid_dir).isDirectory();
}
function run_cmd (cmd_line) {
	let tokens=cmd_line.split(' ');
	let cmd=tokens[0];
	let args=tokens.slice(1,tokens.length);

	console.log(cmd_line);
	return child_process.spawnSync(cmd,args).status;
}
