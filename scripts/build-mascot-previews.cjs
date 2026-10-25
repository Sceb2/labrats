'use strict';
// Preview-only snapshots of the current renderer. Original user artwork is unchanged.
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/design/rat-placement');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=value=>createHash('sha256').update(value).digest('base64');
const poses=[
 {id:'curiosity',label:'Curiosity · choose topics',subject:'chemistry',why:'A small companion beside the topic heading, before practice begins.'},
 {id:'approval',label:'Approval · correct answer',subject:'chemistry',why:'A quiet acknowledgement beside the score, once the answer is marked.'},
 {id:'thoughtfulness',label:'Thoughtfulness · opened explanation',subject:'applied-science',why:'Inside the worked-answer disclosure, where a student is actively reviewing the method.'},
 {id:'celebration',label:'Celebration · session milestone',subject:'chemistry',why:'Reserved for a completed perfect-session summary rather than repeated beside every mark.'}
];
const placementCSS=`
.rat-art{display:block;object-fit:contain;pointer-events:none;user-select:none;width:48px;height:58px;flex:none}
.setup-heading .rat-topic-title{display:flex;align-items:center;justify-content:space-between;gap:14px;flex:1;min-width:230px}
.rat-topic-title .rat-title-text{min-width:0}
.feedback-heading.rat-approval-heading{position:relative;padding-right:66px;min-height:58px}
.rat-approval-heading>.rat-art{position:absolute;right:0;top:0}
.rat-thoughtful-help>.rat-art{float:right;margin:8px 0 8px 14px}
.rat-thoughtful-help::after{content:"";display:block;clear:both}
.perfect-celebration.rat-celebration-section{display:flow-root}
.rat-celebration-section>.rat-art{float:right;width:64px;height:77px;margin:0 0 8px 16px}
html.rat-hidden .rat-art{display:none}
html.rat-hidden .rat-approval-heading{padding-right:0;min-height:0}
@media(min-width:900px){.rat-art{width:56px;height:67px}.feedback-heading.rat-approval-heading{padding-right:76px;min-height:67px}.rat-celebration-section>.rat-art{width:72px;height:86px}}
@media(max-width:600px){.setup-heading .rat-topic-title{flex-basis:100%;width:100%;min-width:0}.rat-topic-title>.rat-title-text{flex:1}}
@media print{.rat-art{display:none}}
`;
const snapshotScript=`if(new URLSearchParams(location.search).get('art')==='off')document.documentElement.classList.add('rat-hidden');document.addEventListener('click',event=>{if(event.target.closest('button,a,input,select,label'))event.preventDefault();});document.addEventListener('submit',event=>event.preventDefault());`;
function galleryHTML(){
 const css=`*{box-sizing:border-box}body{margin:0;background:#e7ece8;color:#172d3a;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:1320px;margin:auto;padding:24px}h1{font:400 2rem/1.2 Georgia,serif;margin:0 0 12px}main>p{max-width:85ch}.controls{display:flex;flex-wrap:wrap;align-items:end;gap:16px;margin:24px 0}label{display:grid;gap:6px;font-weight:600;min-width:0}select,button{font:inherit;min-height:44px;border:1px solid #8b9e91;border-radius:7px;padding:9px 12px;background:white;color:inherit}button{cursor:pointer}button:focus-visible,select:focus-visible,a:focus-visible{outline:3px solid #9a6800;outline-offset:3px}button.active{background:#14563e;color:white;border-color:#14563e}.toggle{display:flex;align-items:center;gap:10px;min-height:44px}input{width:21px;height:21px;accent-color:#14563e}.explanation{max-width:85ch;min-height:3em}.frame-wrap{max-width:100%;overflow:auto;padding:0 0 10px}iframe{display:block;width:390px;max-width:100%;height:844px;border:1px solid #b9c8be;background:#f7f8f5}iframe.desktop{width:1200px;max-width:none;height:900px}.sizes{font-size:.9rem;color:#52635b;margin-top:20px}a{color:#14563e}@media(max-width:600px){main{padding:20px 12px}.controls>label:first-child{width:100%}select{width:100%}}`;
 const script=`const poses=${JSON.stringify(poses).replace(/</g,'\\u003c')},select=document.getElementById('pose'),art=document.getElementById('art'),frame=document.getElementById('page');let focus=false;function update(){const pose=poses.find(p=>p.id===select.value);document.getElementById('explanation').textContent=pose.why;frame.title=pose.label+' placement preview';frame.src=pose.id+'.html?art='+(art.checked?'on':'off')+((focus||pose.id==='thoughtfulness')?'#rat-illustration':'');}select.addEventListener('change',()=>{focus=false;update()});art.addEventListener('change',update);document.getElementById('mobile').onclick=()=>{frame.classList.remove('desktop');document.getElementById('mobile').classList.add('active');document.getElementById('desktop').classList.remove('active');};document.getElementById('desktop').onclick=()=>{frame.classList.add('desktop');document.getElementById('desktop').classList.add('active');document.getElementById('mobile').classList.remove('active');};document.getElementById('focus').onclick=()=>{focus=true;update()};document.getElementById('top').onclick=()=>{focus=false;frame.src=select.value+'.html?art='+(art.checked?'on':'off');};update();`;
 return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>LabRats · Rat illustration placements</title><style>${css}</style></head><body><main><h1>Four small, contextual additions</h1><p>Page snapshots from the current LabRats prototype, using your original artwork. The logo is not used. The gallery controls and disclosure panels work; page buttons do not start sessions or save results.</p><div class="controls"><label for="pose">Placement<select id="pose">${poses.map(p=>'<option value="'+p.id+'">'+esc(p.label)+'</option>').join('')}</select></label><button id="mobile" class="active" type="button">Mobile</button><button id="desktop" type="button">Desktop</button><label class="toggle"><input id="art" type="checkbox" checked>Illustrations on</label><button id="focus" type="button">Show illustration in context</button><button id="top" type="button">Page top</button></div><p class="explanation" id="explanation" role="status"></p><div class="frame-wrap"><iframe id="page" title="Illustration placement preview"></iframe></div><p class="sizes">One static illustration per page. Mobile: 48 × 58 px for Curiosity, Approval and Thoughtfulness; 64 × 77 px for Celebration. Native text and controls remain the main content. Original PNGs have not been edited.</p></main><script>${script}</script></body></html>`;
}
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).slice(1)||'index.html',file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||rel.startsWith('.'))throw Error('Invalid path');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav'})[path.extname(file)]||'text/plain');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';let browser;
 const errors=[],violations=[],external=[];
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
 for(const pose of poses){
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))violations.push(m.text());});
  await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)||/^(data|blob):/.test(url))return route.continue();external.push(url);return route.abort();});
  await page.goto(base+(pose.subject==='chemistry'?'student-site-preview.html':'applied-science-preview.html'));
  await page.waitForSelector('#login-form:not([hidden])');await page.locator('#preview-login header a').click();await page.waitForSelector('.setup-page');
  if(pose.id==='curiosity')await page.locator('[data-topic=alcohols]').check();
  if(pose.id==='approval'||pose.id==='celebration'){
   await page.evaluate(()=>{celebrationEffects=false;start('practice',[S.bank.questions.find(q=>q.id==='RC01')]);});
   await page.locator('#reagent').selectOption('dichromate-acid');await page.locator('#heating').selectOption('distil');await page.locator('#submit').click();assert.equal(await page.locator('#fb .feedback-heading h2').innerText(),'2 of 2 marks');
   if(pose.id==='celebration'){await page.locator('#next').click();await page.waitForSelector('.perfect-celebration');}
  }
  if(pose.id==='thoughtfulness'){
   await page.evaluate(()=>window.AppliedPrototype.openQuestion('W03','practice'));
   for(const [id,value]of Object.entries({frequency:'85','wavelength-m':'4','wavelength-mm':'4000'}))await page.locator('[data-number="'+id+'"]').fill(value);
   await page.locator('[data-part=rearrange][value=rearrange-a]').check();await page.locator('#check-answer').click();assert.equal(await page.locator('#feedback .feedback-heading h2').innerText(),'3 of 4 marks');
   await page.locator('#feedback .feedback-help>summary').click();
  }
  const bytes=await fs.readFile(path.join(root,'docs/design/rat-assets',pose.id+'.png'));
  await page.evaluate(({id,src})=>{
   const image=document.createElement('img');image.src=src;image.alt='';image.setAttribute('aria-hidden','true');image.width=id==='celebration'?64:48;image.height=id==='celebration'?77:58;image.className='rat-art';image.id='rat-art';image.dataset.ratPose=id;
   if(id==='curiosity'){const heading=document.querySelector('.setup-heading h1'),text=document.createElement('span');text.className='rat-title-text';while(heading.firstChild)text.append(heading.firstChild);heading.append(text,image);heading.classList.add('rat-topic-title');heading.id='rat-illustration';}
   else if(id==='approval'){const heading=document.querySelector('#fb .feedback-heading');heading.classList.add('rat-approval-heading');heading.id='rat-illustration';heading.append(image);}
   else if(id==='thoughtfulness'){const help=document.querySelector('#feedback .feedback-help');help.classList.add('rat-thoughtful-help');help.id='rat-illustration';help.insertBefore(image,help.querySelector('summary').nextSibling);}
   else{const section=document.querySelector('.perfect-celebration');section.querySelector('.perfect-trophy-static')?.remove();section.classList.add('rat-celebration-section');section.id='rat-illustration';section.insertBefore(image,section.firstChild);section.querySelector('h2').textContent='Every mark earned';}
  },{id:pose.id,src:'data:image/png;base64,'+bytes.toString('base64')});
  const snapshot=await page.evaluate(()=>{
   const original=document.body,clone=original.cloneNode(true);
   const controls=[...original.querySelectorAll('input,select,textarea')],copies=[...clone.querySelectorAll('input,select,textarea')];
   controls.forEach((el,i)=>{const copy=copies[i];if(el.tagName==='SELECT')[...copy.options].forEach((option,j)=>option.toggleAttribute('selected',el.options[j].selected));else if(el.tagName==='TEXTAREA')copy.textContent=el.value;else{copy.setAttribute('value',el.value);copy.toggleAttribute('checked',el.checked);}});
   clone.querySelectorAll('script,template,#preview-login,.confetti-layer,.celebration-layer,.shooting-star-layer').forEach(el=>el.remove());
   clone.querySelectorAll('*').forEach(el=>[...el.attributes].filter(a=>a.name.startsWith('on')).forEach(a=>el.removeAttribute(a.name)));
   return {body:clone.innerHTML.replace(/[ \t]+$/gm,''),screen:original.dataset.screen||'setup',style:[...document.head.querySelectorAll('style')].map(el=>el.textContent)};
  });
  const css=[...snapshot.style,placementCSS];const policy=`default-src 'none'; img-src data:; style-src ${css.map(value=>"'sha256-"+hash(value)+"'").join(' ')}; style-src-attr 'unsafe-inline'; script-src 'sha256-${hash(snapshotScript)}'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`;
  const html=`<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>${esc(pose.label)} · LabRats asset preview</title>${css.map(value=>'<style>'+value+'</style>').join('')}</head><body class="student-app" data-screen="${esc(snapshot.screen)}">${snapshot.body}<script>${snapshotScript}</script></body></html>\n`;
  await fs.writeFile(path.join(out,pose.id+'.html'),html);await context.close();
 }
 // Validate the actual delivered snapshot files, not merely the source renderer.
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))violations.push(m.text());});
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)||/^(data|blob):/.test(url))return route.continue();external.push(url);return route.abort();});
 for(const pose of poses){
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:844});await page.goto(base+'docs/design/rat-placement/'+pose.id+'.html');await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
   assert.equal(await page.locator('.rat-art').count(),1);assert.equal(await page.locator('.rat-art').getAttribute('alt'),'');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,pose.id+' overflow at '+width);
   const art=await page.locator('.rat-art').boundingBox();assert(art&&art.height<=(width<900?80:90));
   await page.mouse.move(0,0);await page.evaluate(()=>scrollTo(0,0));
   if(width!==320)await page.screenshot({path:path.join(root,'docs/previews/rat-'+pose.id+'-'+(width===390?'mobile':'desktop')+'.png'),fullPage:true});
   if(width===390&&pose.id==='thoughtfulness'){await page.locator('.rat-thoughtful-help').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'docs/previews/rat-thoughtfulness-mobile-focus.png')});}
  }
  await page.goto(base+'docs/design/rat-placement/'+pose.id+'.html?art=off');assert(await page.locator('.rat-art').isHidden());
 }
 assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);assert.deepEqual(external,[]);await context.close();
 await fs.writeFile(path.join(out,'index.html'),galleryHTML());
 await fs.writeFile(path.join(out,'placements.json'),JSON.stringify({note:'Preview-only placements. One static decorative illustration per page. Logo excluded. No account connections.',source:'User-uploaded Rat_Assets.zip',poses:await Promise.all(poses.map(async p=>({...p,sha256:createHash('sha256').update(await fs.readFile(path.join(root,'docs/design/rat-assets',p.id+'.png'))).digest('hex')})))},null,2)+'\n');
 console.log('Four previews built from the actual tool. 320/390/1280px layouts, one small decorative image per page, image-off comparison, CSP and zero external requests verified.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
