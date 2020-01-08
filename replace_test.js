var util = require('util');


let sv = [
    '<div _canonical_uri="./images/tw-farm-icon.svg" created="20190730120311643" modified="20190730120315361" tags="" title="tw-farm-icon.svg" type="image/svg+xml" revision="0" bag="default">',
    '<pre>undefined</pre>',
    '</div>',
    '<div _canonical_uri="./images/TW5%2520Farm-logo.svg" tags="" title="TW5 Farm-logo.svg" type="image/svg+xml" revision="0" bag="default">',
    '<pre>undefined</pre>',
    '</div>',
    '<div _canonical_uri="./images/windows-10.svg" tags="" title="windows-10.svg" type="image/svg+xml" revision="0" bag="default">',
    '<pre>undefined</pre>',
    '</div>'
];
let s = '';
for (var sve of sv)
    s += util.format('%s\n',sve);

s = remove_pre_content(s);

console.log(s);


function remove_pre_content(s) {
	// This is a patch for removing the content between <pre> and </pre> 
	// in a _canonical_uri tiddler locating in a HTML-single-file wiki.
	let search_token = new RegExp("(<div[^>]+_canonical_uri[^>]+>[\\s\\r\\n]*<pre>)([^<>]+)(</pre>[\\s\\r\\n]*</div>)","gim");
	let replace_token = "$1$3";

    return s.replace(search_token, replace_token);
}
