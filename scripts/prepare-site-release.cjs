'use strict';
const fs=require('node:fs'),{createHash}=require('node:crypto');
const read=name=>fs.readFileSync(name),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const old=JSON.parse(read('version.json'));
const files=['fonts.css',...fs.readdirSync('assets/fonts').sort().map(name=>'assets/fonts/'+name),'flashcards.html','flashcard-app.js','flashcards.css','flashcards/topics.json','flashcards/sample-pack.json','design.css','feedback.js','app.js','core.js','ui.js','styles.css','experience.js','effects.js','review.js',
  'updates.js','learning-resources.js','questions.json','assets.json','learning-resources.json',
  'student-login.js','student-login.html','student-login.css','progress-sync.js','auth-config.json',
  'index.html','assets/subjects/applied-science.png','assets/subjects/chemistry.png','staff.js','staff.html','staff.css','chemistry.html','applied-science.html','subjects.json','hub.css','applied-app.js','applied-science/Pilot_Question_Bank.json','applied-science/Physics_Lesson_Map.json','applied-science/learning-bank.json','applied-science/physics.css'];
// Diagram-only corrections must invalidate the same release as their questions.
const diagramPaths=[...Object.values(JSON.parse(read('assets.json'))).map(a=>a.path),
 ...JSON.parse(read('applied-science/Pilot_Question_Bank.json')).questions.map(q=>q.asset).filter(Boolean).map(asset=>'applied-science/'+asset)];
for(const file of [...new Set(diagramPaths)].sort()){
 if(!/^(?:applied-science\/)?assets\/[a-zA-Z0-9_/-]+\.svg$/.test(file))throw Error('Unsafe release diagram path.');
 files.push(file);
}
const fingerprint=createHash('sha256');for(const file of files)fingerprint.update(file).update(file.endsWith('.html')?read(file).toString().replace(/\?v=r-[a-zA-Z0-9-]+/g,'').replace(/window\.(?:CHEM_BUILD|AAQ_BUILD)=\{[^;]+\};/g,''):read(file));
const id='r-'+fingerprint.digest('hex').slice(0,20), label='1.13.0-subject-prototype';
const build={schema:1,id,label,bankVersion:JSON.parse(read('questions.json')).meta.bankVersion,
  questionsSha256:sha(read('questions.json')),assetsSha256:sha(read('assets.json')),resourcesSha256:sha(read('learning-resources.json'))};
let html=read('chemistry.html').toString();
if(!html.includes('window.CHEM_BUILD=')||!old.id)throw Error('Missing release metadata.');
html=html.replace(/window\.CHEM_BUILD=\{[^;]+\};/,()=>`window.CHEM_BUILD=${JSON.stringify(build)};`)
  .replaceAll('?v='+old.id,'?v='+id)
  .replace(/((?:href|src)="(?:fonts\.css|design\.css|flashcards\.css|feedback\.js))(?:\?v=[^"]*)?"/g,`$1?v=${id}"`)
  .replace('src="progress-sync.js"',`src="progress-sync.js?v=${id}"`)
  .replace('href="student-login.css"',`href="student-login.css?v=${id}"`)
  .replace(/(<p class="side-footer">)[^<]+/,`$1v${label.match(/\d+\.\d+\.\d+/)[0]}`);
html=html.replace(/(href="hub\.css)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('chemistry.html',html);
let applied=read('applied-science.html').toString();
const ab=JSON.parse(read('applied-science/Pilot_Question_Bank.json'));
const am={schema:1,id,label,bankVersion:ab.bankVersion,questionsSha256:sha(read('applied-science/Pilot_Question_Bank.json')),mapSha256:sha(read('applied-science/Physics_Lesson_Map.json'))};
applied=applied.replace(/window\.CHEM_BUILD=\{[^;]+\};/g,'').replace(/window\.AAQ_BUILD=\{[^;]+\};/,()=>`window.CHEM_BUILD=${JSON.stringify(build)};window.AAQ_BUILD=${JSON.stringify(am)};`).replace(/\?v=r-[a-zA-Z0-9-]+/g,'?v='+id).replace(/((?:src|href)="(?:applied-app\.js|feedback\.js|design\.css|progress-sync\.js|student-login\.css|hub\.css|flashcards\.css))(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
applied=applied.replace(/(<p class="side-footer">)[^<]+/,`$1v${label.match(/\d+\.\d+\.\d+/)[0]}`);
fs.writeFileSync('applied-science.html',applied);
let login=read('student-login.html').toString();
login=login.replace(/(href="(?:styles|student-login|design)\.css)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`)
  .replace(/(src="student-login\.js)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('student-login.html',login);
let staff=read('staff.html').toString();
staff=staff.replace(/(href="(?:styles|student-login|staff|fonts|design|flashcards)\.css)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`)
  .replace(/(src="staff\.js)(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('staff.html',staff);
let flashcards=read('flashcards.html').toString();
flashcards=flashcards.replace(/((?:src|href)="(?:[a-z-]+\.css|flashcard-app\.js))(?:\?v=[^"]*)?"/g,`$1?v=${id}"`);
fs.writeFileSync('flashcards.html',flashcards);
fs.writeFileSync('version.json',JSON.stringify(build,null,2)+'\n');
