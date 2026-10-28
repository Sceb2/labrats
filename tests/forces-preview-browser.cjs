'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),bank=require('../content-drafts/forces/questions.json');
(async()=>{
 const {markQuestion}=await import('../applied-science/pilot-core.mjs');
 const qs=bank.topics.flatMap(t=>t.questions);assert.equal(qs.length,110);assert.equal(qs.filter(q=>q.maxMarks===1).length,55);
 const correct=q=>Object.fromEntries(q.parts.map(p=>[p.id,p.type==='choice'?p.correctOptionId:{value:p.answer.value,unit:p.answer.unit}]));
 for(const q of qs){assert(q.hint?.trim());assert(q.workedAnswer?.trim());assert(q.specRefs.length);assert(q.parts.every(p=>['AO1','AO2','AO3'].includes(p.ao)));assert.equal(markQuestion(q,correct(q)).score,q.maxMarks,q.id);assert.equal(markQuestion(q,{}).score,0,q.id+' blanks');assert.equal(q.parts.reduce((n,p)=>n+p.marks,0),q.maxMarks);}
 const ecf=qs.find(q=>q.id==='F01A');assert.equal(markQuestion(ecf,{s0:{value:.5,unit:'h'},s1:{value:36,unit:'km h⁻¹'}}).ecfMarks,1);
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'forces-draft.html')));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().isNavigationRequest()?r.continue():r.abort());const url='http://127.0.0.1:'+server.address().port;
 async function open(i){const button=page.locator(`[data-open="${i}"]`).first();await button.evaluate(el=>{const d=el.closest("details");if(d)d.open=true;});await button.click();}
 async function answer(q){for(const p of q.parts){if(p.type==='choice')await page.locator(`input[name="${p.id}"][value="${p.correctOptionId}"]`).check();else await page.locator('#'+p.id).fill(String(p.answer.value));}}
 for(const width of [390,1280]){
 await page.setViewportSize({width,height:900});await page.goto(url);await page.waitForSelector('[data-open]',{state:'attached'});
 for(let i=0;i<qs.length;i++){await open(i);assert.equal(await page.locator('textarea,[data-score],#task select').count(),0);assert(await page.locator('#hint').count());await page.locator('#hint summary').click();assert(await page.locator('#hint p').isVisible());await answer(qs[i]);await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),new RegExp(`${qs[i].maxMarks} of ${qs[i].maxMarks} marks`));assert.equal(await page.locator('#task input:not([readonly]):not(:disabled)').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#topics').click();}
 }
 await page.goto(url);await open(1);await page.locator('#s0').fill('0.5');await page.locator('#s1').fill('36');await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),/1 of 2 marks/);assert.match(await page.locator('#feedback').textContent(),/Method mark/);
 await page.goto(url);await open(1);await page.locator('#s0').fill('not a number');await page.locator('#s1').fill('45');await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),/1 of 2 marks/);assert.match(await page.locator('#feedback').textContent(),/valid number/);
 await page.goto(url);await open(1);await page.locator('#check').click();assert.match(await page.locator('#warning').textContent(),/blank/);await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),/0 of 2 marks/);
 await page.goto(url);await open(21);await page.locator('#reveal').click();assert.match(await page.locator('#feedback').textContent(),/not scored/);assert.equal(await page.locator('input:enabled').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.length),0);assert.deepEqual(errors,[]);
 console.log('Passed: all 110 questions fully and blank marked; mobile/desktop automatic scoring; partial marks; invalid input; follow-through; blank confirmation; unscored reveal; no storage writes or script errors; standalone loading.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
