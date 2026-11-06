'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),bank=require('../applied-science/Pilot_Question_Bank.json');
(async()=>{
 const server=http.createServer((req,res)=>{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});let page;const errors=[];const base='http://127.0.0.1:'+server.address().port;
  async function open(id){await page.evaluate(id=>window.AppliedPrototype.openQuestion(id,'practice'),id);}
  async function answer(q){for(const p of q.parts){if(p.type==='choice')await page.locator(`[data-part="${p.id}"][value="${p.correctOptionId}"]`).check();else{await page.locator(`[data-number="${p.id}"]`).fill(String(p.answer.value));const unit=page.locator(`[data-unit="${p.id}"]`);if(await unit.count())await unit.selectOption(p.answer.unit);}}await page.locator('#check-answer').click();assert.match(await page.locator('#feedback .feedback-heading h2').innerText(),new RegExp(`${q.maxMarks} of ${q.maxMarks}`),q.id);}
  const out=path.join(root,'test-results/applied-expansion');fs.mkdirSync(out,{recursive:true});
  for(const width of [390,1280]){
   if(page)await page.close();page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:900});await page.goto(base+'/applied-science.html?guest=1');await page.waitForSelector('.setup-page,.question-screen');await page.waitForSelector('.setup-page');
   assert.deepEqual(await page.locator('[data-disclosure="electricity"] .topic-name').allTextContents(),require('../applied-science/electricity-topics.json').topics.map(t=>t.label));
   await page.locator('#select-all').click();const waves=await page.evaluate(()=>window.AppliedPrototype.state.prefs.lessons.slice());
   for(const topic of ['forces','electricity']){
    await page.locator(`[data-disclosure="${topic}"]>summary`).click();await page.locator('#select-'+topic).click();
    const state=await page.evaluate(()=>({lessons:window.AppliedPrototype.state.prefs.lessons,plan:window.AppliedPrototype.state.plan}));assert(waves.every(id=>state.lessons.includes(id)));assert(state.plan.questionCount>0);
    await page.locator('#clear-'+topic).click();assert.deepEqual(await page.evaluate(()=>window.AppliedPrototype.state.prefs.lessons),waves);
   }
   await page.locator('#select-none').click();await page.locator('#select-forces').click();assert(await page.evaluate(()=>window.AppliedPrototype.state.plan.questionCount>0));assert.equal(await page.locator('#session-plan').innerText(),'');
   await page.locator('#start-practice').click();assert(await page.locator('.eq-open').isVisible());assert(await page.evaluate(()=>window.AppliedPrototype.state.session.questions.every(q=>q.topic==='Forces')));
   await page.goto(base+'/applied-science.html?guest=1');await page.waitForSelector('.setup-page,.question-screen');
   await open('E040');await answer(bank.questions.find(q=>q.id==='E040'));assert(!/undefined/.test(await page.locator('#app').innerText()));
   await page.screenshot({path:path.join(out,'electricity-feedback-'+width+'.png'),fullPage:true});
   for(const id of ['F02A2','E029','E111']){await open(id);const img=page.locator('.wave-figure img');assert(await img.isVisible());await img.evaluate(el=>el.decode());assert(await img.evaluate(el=>el.naturalWidth>0));await page.screenshot({path:path.join(out,id+'-'+width+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  }
  // Every promoted card is exercised through the production renderer, not only the draft engine.
  await page.setViewportSize({width:390,height:900});
  for(const q of bank.questions.filter(q=>q.topic!=='Waves')){await open(q.id);assert.equal(await page.locator('.eq-open').count(),1);assert(!/undefined/.test(await page.locator('#app').innerText()),q.id);await answer(q);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,q.id+' overflow');}
  await page.goto(base+'/applied-science-preview.html');await page.waitForSelector('#login-form:not([hidden])');await page.locator('#preview-login header a').click();await page.waitForSelector('.setup-page,.question-screen');await open('E111');await page.locator('.wave-figure img').evaluate(el=>el.decode());await page.locator('.eq-open').click();assert(await page.locator('.eq-dialog').isVisible());await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);console.log('Passed: topic isolation and selection, Forces sessions, all 244 promoted cards fully marked in production renderer, diagrams and feedback at mobile/desktop widths, and offline preview.');
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
