'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const esbuild = require('esbuild');
const {validatePublicConfig} = require('../src/student-identity.cjs');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const hash = value => createHash('sha256').update(value).digest('base64');
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c');
const escape = value => String(value).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
function body(name) {
  const match = read(name).match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  if (!match) throw new Error('Missing document body: ' + name);
  return match[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/[ \t]+$/gm,'');
}
function buildSitePreview(config = JSON.parse(read('auth-config.json')), output = path.join(root, 'student-site-preview.html'), subject = 'chemistry') {
  const applied=subject==='applied-science';
  const {url, key} = validatePublicConfig(config);
  const assets = JSON.parse(read('assets.json'));
  const images = Object.fromEntries(Object.entries(assets).map(([id, asset]) => {
    const filename = path.resolve(root, asset.path);
    if (!filename.startsWith(root + path.sep) || !filename.endsWith('.svg')) throw new Error('Unsafe preview diagram path.');
    return [id, 'data:image/svg+xml;base64,' + fs.readFileSync(filename).toString('base64')];
  }));
  const data = {'auth-config.json': JSON.stringify({supabaseUrl: url, publishableKey: key}),
    'questions.json': read('questions.json'), 'assets.json': read('assets.json'),
    'learning-resources.json': read('learning-resources.json'), 'report-config.json': '{}'};
  let scripts = ['updates.js', 'core.js', 'ui.js', 'experience.js', 'effects.js', 'review.js', 'learning-resources.js', 'app.js'].map(read);
  let appliedImages={};
  if(applied){
    const source=JSON.parse(read('applied-science/Pilot_Question_Bank.json'));
    appliedImages=Object.fromEntries([...new Set(source.questions.map(q=>q.asset).filter(Boolean))].map(asset=>[asset,'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'applied-science',asset)).toString('base64')]));
    scripts=['updates.js','experience.js','effects.js'].map(read).concat('window.AAQEffects=window.ChemEffects;',read('applied-app.js'));
  }
  const bundle = esbuild.buildSync({absWorkingDir: root, entryPoints: ['src/student-site-preview.cjs'], bundle: true,
    write: false, platform: 'browser', target: ['es2022'], minify: true,
    supported: {'template-literal': false}, legalComments: 'eof'}).outputFiles[0].text;
  const script = `(() => {\nconst files = ${safeJSON(data)};\nconst originalFetch = window.fetch.bind(window);\nconst directory = new URL('.', location.href);\nwindow.fetch = (input, init) => {\n const address = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);\n for (const [name, text] of Object.entries(files)) {\n  const local = new URL(name, directory);\n  if (address.protocol === local.protocol && address.host === local.host && address.pathname === local.pathname) return Promise.resolve(new Response(text, {headers: {'Content-Type': 'application/json'}}));\n }\n return originalFetch(input, init);\n};\nwindow.OCR_PREVIEW_SUBJECT_ID = ${safeJSON(subject)};\nwindow.OCR_PREVIEW_SUBJECT_URL = '#preview-practice';\nwindow.AAQ_EMBEDDED = ${safeJSON(applied?{bank:JSON.parse(read('applied-science/Pilot_Question_Bank.json')),map:JSON.parse(read('applied-science/Physics_Lesson_Map.json'))}:null)};\nwindow.APPLIED_ASSETS = ${safeJSON(appliedImages)};\nwindow.CHEM_OFFLINE = true;\nwindow.CHEM_BUILD = ${safeJSON(JSON.parse(read('version.json')))};\nwindow.CHEM_OFFLINE_ASSETS = ${safeJSON(images)};\nwindow.CHEM_RESOURCE_DATA = ${safeJSON(JSON.parse(read('learning-resources.json')))};\nwindow.CHEM_PARTY_SOUND = ${safeJSON('data:audio/wav;base64,' + fs.readFileSync(path.join(root, 'assets/audio/party-blowers.wav')).toString('base64'))};\nwindow.OCR_SITE_PREVIEW = ${safeJSON({scripts})};\n})();\n${bundle}`;
  const css = read('styles.css') + '\n'+read('hub.css') + (applied?'\n'+read('applied-science/physics.css'):'') + '\n' + read('student-login.css') + '\n#preview-practice:not([hidden]){display:contents}#preview-practice .design-preview-tools{display:none!important}\n';
  if (/<\/script/i.test(script) || /<\/style/i.test(css)) throw new Error('Unsafe inline preview asset.');
  // Inline style attributes are used by the existing diagram positions and
  // progress indicators; scripts remain restricted to exact build hashes.
  const policy = `default-src 'none'; script-src ${[script, ...scripts].map(value => `'sha256-${hash(value)}'`).join(' ')}; style-src 'sha256-${hash(css)}'; style-src-attr 'unsafe-inline'; connect-src ${url}; img-src data: blob:; media-src data:; frame-src https://www.youtube-nocookie.com; base-uri 'none'; form-action 'none'; object-src 'none'`;
  const login = body('student-login.html')
    .replace('<main id="main"', '<section id="preview-login-main"').replace('</main>', '</section>')
    .replace('href="#main"', 'href="#preview-login-main"')
    .replace('href="index.html">Continue browser-only practice', 'href="#preview-practice">Continue browser-only practice')
    .replace('href="index.html" hidden>Continue to practice', 'href="#preview-practice" hidden>Open practice preview');
  const practice = body(applied?'applied-science.html':'chemistry.html').replaceAll('href="index.html"','href="subject-hub-preview.html"');
  const html = `<!-- Generated by npm run build. Public configuration only; fictional accounts only. -->
<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>LabRats · ${applied?'Applied Science':'Chemistry'}</title><style>${css}</style></head><body class="login-page"><div id="preview-login">${login}</div><div id="preview-practice" hidden>${practice}</div><template id="third-party-notices">${escape(read('THIRD_PARTY_NOTICES.md'))}</template><script>${script}</script></body></html>\n`;
  fs.writeFileSync(output, html);
  return output;
}
if (require.main === module) {
 buildSitePreview();buildSitePreview(undefined,path.join(root,'applied-science-preview.html'),'applied-science');
 let hub=read('index.html').replace('<link rel="stylesheet" href="hub.css">',()=>'<style>'+read('hub.css')+'</style>').replaceAll('href="chemistry.html"','href="student-site-preview.html"').replaceAll('href="applied-science.html"','href="applied-science-preview.html"').replaceAll('href="staff.html"','href="staff-preview.html"').replaceAll('href="student-login.html"','href="student-site-preview.html"');
 for(const name of ['applied-science','chemistry'])hub=hub.replace('src="assets/subjects/'+name+'.png"','src="data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/subjects/'+name+'.png')).toString('base64')+'"');
 fs.writeFileSync(path.join(root,'subject-hub-preview.html'),hub);
}
module.exports = {buildSitePreview};
