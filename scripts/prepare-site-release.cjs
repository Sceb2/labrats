'use strict';
const fs=require('node:fs'),{createHash}=require('node:crypto');
const read=name=>fs.readFileSync(name),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const old=JSON.parse(read('version.json'));
const files=['app.js','core.js','ui.js','styles.css','experience.js','effects.js','review.js',
  'updates.js','learning-resources.js','questions.json','assets.json','learning-resources.json',
  'student-login.js','student-login.html','student-login.css','progress-sync.js','auth-config.json',
  'staff.js','staff.html','staff.css','chemistry.html','applied-science.html','subjects.json','hub.css','applied-app.js','applied-science/Pilot_Question_Bank.json','applied-science/Physics_Lesson_Map.json','applied-science/learning-bank.json','applied-science/physics.css'];
const fingerprint=createHash('sha256');for(const file of files)fingerprint.update(file).update(file.endsWith('.html')?read(file).toString().replace(/\?v=r-[a-zA-Z0-9-]+/g,'').replace(/window\.(?:CHEM_BUILD|AAQ_BUILD)=\{[^;]+\};/g,''):read(file));
const id='r-'+fingerprint.digest('hex').slice(0,20), label='1.13.0-subject-prototype';
const build={schema:1,id,label,bankVersion:JSON.parse(read('questions.json')).meta.bankVersion,
  questionsSha256:sha(read('questions.json')),assetsSha256:sha(read('assets.json')),resourcesSha256:sha(read('learning-resources.json'))};
let html=read('chemistry.html').toString();
if(!html.includes('window.CHEM_BUILD=')||!old.id)throw Error('Missing release metadata.');
html=html.replace(/window\.CHEM_BUILD=\{[^;]+\};/,()=>`window.CHEM_BUILD=${JSON.stringify(build)};`)
  .replaceAll('?v='+old.id,'?v='+id)
  .replace('src="progress-sync.js"',`src="progress-sync.js?v=${id}"`)
  .replace('href="student-login.css"',`href="student-login.css?v=${id}"`)
  .replace(/(id="release-check-status" role="status">)[^<]+/,`$1Version ${label}`)
  .replace(/Revision bank · v[^<]+/,`Revision bank · v${label}`);
html=html.replace(/(href="hub\.css)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('chemistry.html',html);
let applied=read('applied-science.html').toString();
const ab=JSON.parse(read('applied-science/Pilot_Question_Bank.json'));
const am={schema:1,id,label,bankVersion:ab.bankVersion,questionsSha256:sha(read('applied-science/Pilot_Question_Bank.json')),mapSha256:sha(read('applied-science/Physics_Lesson_Map.json'))};
applied=applied.replace(/window\.CHEM_BUILD=\{[^;]+\};/g,'').replace(/window\.AAQ_BUILD=\{[^;]+\};/,()=>`window.CHEM_BUILD=${JSON.stringify(build)};window.AAQ_BUILD=${JSON.stringify(am)};`).replace(/\?v=r-[a-zA-Z0-9-]+/g,'?v='+id).replace(/((?:src|href)="(?:applied-app\.js|progress-sync\.js|student-login\.css|hub\.css))(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('applied-science.html',applied);
let login=read('student-login.html').toString();
login=login.replace(/(href="(?:styles|student-login)\.css)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`)
  .replace(/(src="student-login\.js)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('student-login.html',login);
let staff=read('staff.html').toString();
staff=staff.replace(/(href="(?:styles|student-login|staff)\.css)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`)
  .replace(/(src="staff\.js)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('staff.html',staff);
fs.writeFileSync('version.json',JSON.stringify(build,null,2)+'\n');
