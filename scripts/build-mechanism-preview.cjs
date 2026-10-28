'use strict';
// A self-contained, account-free gallery using the actual app renderer/scorer.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const safe=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buildMechanismPreview(){
  const bank=JSON.parse(read('questions.json')),assets=JSON.parse(read('assets.json'));
  const map=JSON.parse(read('content-drafts/mechanism-card-map.json'));
  const images=Object.fromEntries(Object.entries(assets).map(([id,asset])=>[id,'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,asset.path)).toString('base64')]));
  const files={'questions.json':read('questions.json'),'assets.json':read('assets.json'),'report-config.json':'{}'};
  const setup=`
window.CHEM_OFFLINE=true;window.CHEM_PREVIEW_ID='mechanism-recognition';
window.CHEM_OFFLINE_ASSETS=${safe(images)};
window.CHEM_RESOURCE_DATA=${safe(JSON.parse(read('learning-resources.json')))};
{const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear()}});}
{const files=${safe(files)};window.fetch=(input)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);const name=url.pathname.split('/').pop();return Object.hasOwn(files,name)?Promise.resolve(new Response(files[name],{headers:{'Content-Type':'application/json'}})):Promise.reject(new Error('Offline preview: request unavailable'));};}
`;
  const modules=['updates.js','core.js','feedback.js','ui.js','experience.js','effects.js','review.js','learning-resources.js'].map(read);
  const app=read('app.js');
  if(app.split('U.load().then(').length!==2)throw Error('App bootstrap changed; update preview adapter.');
  modules.push(app.replace('U.load().then(','window.CHEM_CARD_PREVIEW_READY=U.load().then('));
  const controls=`
window.CHEM_CARD_PREVIEW_READY.then(()=>{
 if(!S.bank||!S.progress)throw new Error('Question preview failed to initialise.');
 const ids=${safe(map.questions)},select=document.getElementById('card-select');
 const open=id=>{if(!ids.includes(id))return;stopTimer();S.session=null;S.suspended=null;S.marked=false;S.locked=false;const q=S.bank.questions.find(q=>q.id===id);S.topics=q.prerequisites;select.value=id;start('preview',[q]);document.getElementById('preview-card-status').textContent=id+' · '+(q.markPointPractice.mode==='combined'?'Combined mechanism':'Focused practice')+' · '+q.maxMark+' mark'+(q.maxMark===1?'':'s');document.getElementById('preview-previous').disabled=ids.indexOf(id)===0;document.getElementById('preview-next').disabled=ids.indexOf(id)===ids.length-1;};
 select.addEventListener('change',()=>open(select.value));
 document.getElementById('preview-next').onclick=()=>open(ids[ids.indexOf(select.value)+1]);
 document.getElementById('preview-previous').onclick=()=>open(ids[ids.indexOf(select.value)-1]);
 document.getElementById('preview-reveal').onclick=()=>reveal();
 document.getElementById('preview-reset').onclick=()=>{S.progress=C.restoreProgress(null,S.bank);open(select.value);};
 open(ids.includes(location.hash.slice(1))?location.hash.slice(1):ids[0]);
}).catch(error=>{document.getElementById('preview-card-status').textContent=error.message;});
`;
  const script=setup+'\n'+modules.join('\n;\n')+'\n;\n'+controls;
  const css=read('styles.css')+'\n'+(require('./font-css.cjs')()+'\n'+read('design.css'))+`
.card-preview-tools{border:1px solid var(--rule);border-radius:12px;background:var(--paper);padding:20px;margin-bottom:24px}.card-preview-tools h1{font-size:1.4rem}.card-preview-tools label{display:block;font-weight:650}.card-preview-tools select{width:100%;max-width:100%;margin:8px 0 14px}.card-preview-buttons{display:flex;flex-wrap:wrap;gap:8px}.card-preview-tools p{font-size:.94rem}.card-preview-tools .preview-status{font-weight:650;color:var(--accent)}.preview-badge{color:var(--accent);font-weight:700}.sidebar .side-nav,.release-footer,.design-preview-tools{display:none!important}.product-option .chem img{max-height:235px}.product-option .chem{padding:0}#main{scroll-margin-top:12px}.card-preview-tools button{min-height:44px}@media(max-width:600px){.card-preview-tools{padding:14px}.card-preview-buttons .btn{flex:1 1 140px}}
`;
  let body=read('chemistry.html').match(/<body\b[^>]*>([\s\S]*)<\/body>/i)[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const options=map.questions.map(id=>{const q=bank.questions.find(q=>q.id===id);return `<option value="${id}">${id} · ${esc(q.title)} (${q.maxMark} ${q.maxMark===1?'mark':'marks'})</option>`;}).join('');
  const gallery=`<section class="card-preview-tools" aria-label="Review the new cards"><p class="preview-badge">New question preview · Live site unchanged</p><h1>Try the 20 mechanism cards</h1><p>Choose diagrams, then use <strong>Check answer</strong> for automatic marking. Each complete feature group earns one mark. This is recognition practice, not freehand drawing. Chemistry teacher review is pending.</p><label for="card-select">Question to preview</label><select id="card-select">${options}</select><div class="card-preview-buttons"><button class="btn secondary" id="preview-previous">Previous card</button><button class="btn secondary" id="preview-next">Next card</button><button class="btn secondary" id="preview-reveal">Reveal answer · no marks</button><button class="btn secondary" id="preview-reset">Reset preview marks</button></div><p id="preview-card-status" class="preview-status" role="status">Loading preview…</p><p>No sign-in needed. Results stay in memory for this visit; your saved progress and school accounts are untouched.</p></section>`;
  body=body.replace('<section id="app">',gallery+'<section id="app">')
    .replace('Guest progress stays in this browser. Signed-in progress syncs to your account.','Question preview · Results are temporary and are discarded when this page closes.');
  const hash=value=>createHash('sha256').update(value).digest('base64');
  const policy=`default-src 'none'; script-src 'sha256-${hash(script)}'; style-src 'sha256-${hash(css)}'; style-src-attr 'unsafe-inline'; font-src data:; img-src data: blob:; media-src data:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  if(/<\/script/i.test(script)||/<\/style/i.test(css))throw Error('Unsafe inline preview source');
  const html=`<!-- Generated by node scripts/build-mechanism-preview.cjs. No accounts or persistence. -->\n<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>New mechanism cards · Interactive preview</title><style>${css}</style></head><body class="student-app">${body}<script>${script}</script></body></html>\n`;
  const filename=path.join(root,'mechanism-cards-preview.html');
  if(process.argv.includes('--check'))require('node:assert/strict').equal(read('mechanism-cards-preview.html'),html,'Preview is stale.');
  else fs.writeFileSync(filename,html);
  return filename;
}
if(require.main===module)console.log(buildMechanismPreview());
module.exports={buildMechanismPreview};
