'use strict';
const fs=require('node:fs'),{createHash}=require('node:crypto');
const read=name=>fs.readFileSync(name),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const old=JSON.parse(read('version.json'));
const files=['app.js','core.js','ui.js','styles.css','experience.js','effects.js','review.js',
  'updates.js','learning-resources.js','questions.json','assets.json','learning-resources.json',
  'student-login.js','student-login.html','student-login.css','progress-sync.js','auth-config.json'];
const fingerprint=createHash('sha256');for(const file of files)fingerprint.update(file).update(file.endsWith('.html')?read(file).toString().replace(/\?v=r-[a-zA-Z0-9-]+/g,''):read(file));
const id='r-'+fingerprint.digest('hex').slice(0,20), label='1.10.0-pilot';
const build={schema:1,id,label,bankVersion:JSON.parse(read('questions.json')).meta.bankVersion,
  questionsSha256:sha(read('questions.json')),assetsSha256:sha(read('assets.json')),resourcesSha256:sha(read('learning-resources.json'))};
let html=read('index.html').toString();
if(!html.includes('window.CHEM_BUILD=')||!old.id)throw Error('Missing release metadata.');
html=html.replace(/window\.CHEM_BUILD=\{[^;]+\};/,()=>`window.CHEM_BUILD=${JSON.stringify(build)};`)
  .replaceAll('?v='+old.id,'?v='+id)
  .replace('src="progress-sync.js"',`src="progress-sync.js?v=${id}"`)
  .replace('href="student-login.css"',`href="student-login.css?v=${id}"`)
  .replace(/(id="release-check-status" role="status">)[^<]+/,`$1Version ${label}`)
  .replace(/Revision bank · v[^<]+/,`Revision bank · v${label}`);
fs.writeFileSync('index.html',html);
let login=read('student-login.html').toString();
login=login.replace(/(href="(?:styles|student-login)\.css)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`)
  .replace(/(src="student-login\.js)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('student-login.html',login);
fs.writeFileSync('version.json',JSON.stringify(build,null,2)+'\n');
