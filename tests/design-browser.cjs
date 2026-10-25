'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),bank=require('../questions.json'),applied=require('../applied-science/Pilot_Question_Bank.json');
test('unified subject/topic layouts and score-first feedback preserve both marking engines and first attempts',async t=>{
 let browser;const errors=[],violations=[],external=[];
 const server=http.createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).slice(1)||'index.html',file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||rel.startsWith('.'))throw Error('Invalid path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'})[path.extname(file)]||'text/plain');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';
 try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))violations.push(m.text());});
 await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)||/^(data|blob):/.test(url))return route.continue();external.push(url);return route.abort();});
 const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
 const shot=async name=>{await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(0,0);await page.screenshot({path:'/tmp/labrats-abc-'+name+'.png',fullPage:true});};
 async function chemistry(id){await page.goto(base+'chemistry.html');await page.waitForSelector('#app .setup-page, #app .question-screen');await page.evaluate(id=>start('preview',[S.bank.questions.find(q=>q.id===id)]),id);}
 async function answerChem(response){for(const [id,value]of Object.entries(response))await page.locator('#'+id).selectOption(value);await page.locator('#submit').click();}
 await t.test('hub, both topic lists and account pages share type and compact rows at mobile and desktop sizes',async()=>{
 for(const width of [320,390,1280]){
  await page.setViewportSize({width,height:900});await page.goto(base);await page.waitForSelector('.subject-card');assert.equal(await page.locator('.subject-card').count(),2);
  assert.match(await page.locator('.subject-card h2').first().evaluate(e=>getComputedStyle(e).fontFamily),/Georgia/);
  assert.equal(await page.locator('.subject-card').first().evaluate(e=>getComputedStyle(e).borderRadius),'0px');await overflow();if(width===390)await shot('hub-mobile');
  for(const subject of ['chemistry','applied-science']){
   await page.goto(base+subject+'.html');await page.waitForSelector('.setup-page');const selector=subject==='chemistry'?'.module-section label.topic':'.lesson-row';
   const rects=await page.locator(selector).evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().height).slice(0,3).map(e=>{const r=e.getBoundingClientRect(),i=e.querySelector('input').getBoundingClientRect();return {x:r.x,h:r.height,w:r.width,inputY:i.y};}));
   assert(rects.length>1);assert.equal(rects[0].x,rects[1].x);assert(rects.every(r=>r.h>=44&&r.h<110));
   await page.locator(subject==='chemistry'?'#all':'#select-all').click();assert(await page.locator(subject==='chemistry'?'#practice':'#start-practice').isEnabled());await overflow();if(width===390)await shot(subject+'-topics-mobile');
  }
  await page.goto(base+'student-login.html');await page.waitForSelector('#login-form:not([hidden])');await overflow();
 }
 });
 await t.test('Chemistry partial/full/retry/reveal states keep original scores, readonly responses and accessible explanations',async()=>{
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>localStorage.clear());await chemistry('RC01');
 await answerChem({reagent:'dichromate-acid',heating:'reflux'});assert.equal(await page.locator('#fb .feedback-heading h2').innerText(),'1 of 2 marks');assert.equal(await page.locator('#encouragement').count(),0);
 assert(await page.locator('#task').isHidden());await page.locator('.feedback-question > summary').click();assert.equal(await page.locator('#heating').inputValue(),'reflux');assert(await page.locator('#heating').isDisabled());await page.locator('.feedback-question > summary').click();await overflow();await shot('chemistry-partial-mobile');
 assert.equal(await page.evaluate(()=>S.progress.records.RC01.first.score),1);const rating=await page.evaluate(()=>{window.designRatingAt=Date.now()+60000;return RevisionAdaptive.ratings(S.bank,S.progress.adaptiveEvents,window.designRatingAt).RC01;});
 await page.locator('#retry').click();await answerChem({reagent:'dichromate-acid',heating:'distil'});assert.equal(await page.locator('#fb .feedback-heading h2').innerText(),'2 of 2 on retry');assert.match(await page.locator('.feedback-attempt-note').innerText(),/First attempt: 1 of 2/);assert.equal(await page.evaluate(()=>S.progress.records.RC01.first.score),1);assert.deepEqual(await page.evaluate(()=>RevisionAdaptive.ratings(S.bank,S.progress.adaptiveEvents,window.designRatingAt).RC01),rating);assert(await page.locator('#fb .feedback-points').isVisible());await shot('chemistry-retry-mobile');
 await chemistry('RC02');await page.evaluate(()=>reveal());assert.equal(await page.locator('#fb .feedback-heading h2').innerText(),'Answer revealed');assert.equal(await page.locator('#fb .feedback-heading p').innerText(),'Not scored');assert.equal(await page.evaluate(()=>S.progress.records.RC02.first),null);await shot('chemistry-reveal-mobile');
 // Multi-step and arrow tasks use the same wrapper without losing their detailed marking.
 for(const id of ['MS01','MC01']){await chemistry(id);await page.evaluate(()=>submit(true));assert(await page.locator('#fb .feedback-heading h2').isVisible());assert(await page.locator('#task').isHidden());await page.locator('.feedback-question > summary').click();assert(await page.locator('#task').isVisible());await overflow();}
 });
 await t.test('Applied Science preserves error-carried-forward marks, first attempts, reveals and self-assessment',async()=>{
 await page.goto(base+'applied-science.html');await page.waitForSelector('#select-all');await page.evaluate(()=>window.AppliedPrototype.openQuestion('W03','practice'));
 assert.equal(await page.locator('progress.session-progress').getAttribute('value'),'1');assert.equal(await page.locator('progress.session-progress').getAttribute('max'),'1');
 for(const [id,value]of Object.entries({frequency:'85','wavelength-m':'4','wavelength-mm':'4000'}))await page.locator('[data-number="'+id+'"]').fill(value);
 await page.locator('[data-part=rearrange][value=rearrange-a]').check();await page.locator('#check-answer').click();assert.equal(await page.locator('#feedback .feedback-heading h2').innerText(),'3 of 4 marks');assert.equal(await page.locator('#feedback .feedback-heading p').innerText(),'1 direct mark + 2 method marks');assert.equal(await page.locator('#feedback .method').count(),2);await overflow();await shot('applied-method-mobile');
 assert.equal(await page.evaluate(()=>window.AppliedPrototype.state.progress.records['W03@1'].first.result.score),3);
 await page.locator('#retry-question').click();for(const [id,value]of Object.entries({frequency:'85000','wavelength-m':'0.004','wavelength-mm':'4'}))await page.locator('[data-number="'+id+'"]').fill(value);await page.locator('[data-part=rearrange][value=rearrange-a]').check();await page.locator('#check-answer').click();assert.equal(await page.locator('#feedback .feedback-heading h2').innerText(),'4 of 4 on retry');assert.match(await page.locator('#feedback .feedback-attempt-note').innerText(),/First attempt: 3 of 4/);assert.equal(await page.evaluate(()=>window.AppliedPrototype.state.progress.records['W03@1'].first.result.score),3);
 await page.evaluate(()=>window.AppliedPrototype.openQuestion('W02','practice'));await page.locator('#reveal-answer').click();assert.equal(await page.locator('#feedback .feedback-heading h2').innerText(),'Answer revealed');assert.equal(await page.locator('#feedback .feedback-heading p').innerText(),'Not scored');
 const written=applied.questions.find(q=>q.interaction==='written-self-assessment');await page.evaluate(id=>window.AppliedPrototype.openQuestion(id,'practice'),written.id);await page.locator('#written-response').fill('Fictional design test answer.');await page.locator('#check-answer').click();await page.locator('#self-score').fill('1');await page.locator('#save-self-score').click();assert.match(await page.locator('#feedback .feedback-heading h2').innerText(),/1 of \d+ self-assessed marks/);await shot('applied-self-mobile');
 });
 await t.test('both standalone previews contain the complete shared renderer and styles with no external asset requests',async()=>{
 for(const [file,subject]of [['student-site-preview.html','chemistry'],['applied-science-preview.html','applied-science']]){
 await page.goto(base+file);await page.waitForSelector('#login-form:not([hidden])');await page.evaluate(()=>localStorage.clear());await page.locator('#preview-login header a').click();await page.waitForSelector('.setup-page');
 if(subject==='chemistry'){await page.evaluate(()=>start('preview',[S.bank.questions.find(q=>q.id==='RC01')]));await answerChem({reagent:'dichromate-acid',heating:'distil'});assert.equal(await page.locator('#retry').count(),0);await shot('chemistry-full-mobile');}else{await page.evaluate(()=>window.AppliedPrototype.openQuestion('W02','practice'));await page.locator('#reveal-answer').click();}
 assert(await page.locator('.feedback-heading h2').isVisible());await overflow();
 }
 });
 assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);assert.deepEqual(external,[]);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});
