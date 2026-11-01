'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),bank=require('../content-drafts/electricity/questions.json');
(async()=>{
 const {markQuestion}=await import('../applied-science/pilot-core.mjs');
 const qs=bank.topics.flatMap(t=>t.questions);assert.equal(qs.length,120);assert.equal(new Set(qs.map(q=>q.id)).size,qs.length);assert.equal(qs.reduce((n,q)=>n+q.maxMarks,0),bank.summary.totalMarks);
 const correct=q=>Object.fromEntries(q.parts.map(p=>[p.id,p.type==='choice'?p.correctOptionId:{value:p.answer.value,unit:p.answer.unit}]));
 for(const q of qs){assert(q.hint?.trim());assert(q.workedAnswer?.trim());assert(q.specRefs.length);assert(q.parts.every(p=>['AO1','AO2','AO3'].includes(p.ao)));assert.equal(markQuestion(q,correct(q)).score,q.maxMarks,q.id);assert.equal(markQuestion(q,{}).score,0,q.id+' blanks');assert.equal(q.parts.reduce((n,p)=>n+p.marks,0),q.maxMarks);}
 const ecf=qs.find(q=>q.id==='E043');assert.equal(markQuestion(ecf,{s0:0.05,s1:180}).ecfMarks,1);
 for(const q of qs)for(const p of q.parts){if(p.type==='choice'){for(const o of p.options.filter(o=>o.id!==p.correctOptionId))assert.equal(markQuestion(q,{[p.id]:o.id}).parts.find(x=>x.id===p.id).marks,0);}else assert.equal(markQuestion(q,{[p.id]:'not a number'}).parts.find(x=>x.id===p.id).marks,0);}
 const resistance=qs.find(q=>q.id==='E043');for(const value of [199,200,201])assert.equal(markQuestion(resistance,{s1:value}).parts[1].marks,1);for(const value of [198.9,201.1])assert.equal(markQuestion(resistance,{s1:value}).parts[1].marks,0);
 for(const [id,part,accepted,rejected] of [['E099',0,67000,70000],['E103',1,33000,30000],['E103',2,36000,40000],['E119',0,2300000,2500000]]){const q=qs.find(q=>q.id===id),p=q.parts[part];assert.equal(markQuestion(q,{[p.id]:accepted}).parts[part].marks,1,id+' rounded');assert.equal(markQuestion(q,{[p.id]:rejected}).parts[part].marks,0,id+' incorrect');}
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(path.join(root,'electricity-draft.html')));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().isNavigationRequest()?r.continue():r.abort());const url='http://127.0.0.1:'+server.address().port;
 async function open(i){const button=page.locator(`[data-open="${i}"]`).first();await button.evaluate(el=>{const d=el.closest("details");if(d)d.open=true;});await button.click();}
 async function answer(q){for(const p of q.parts){if(p.type==='choice')await page.locator(`input[name="${p.id}"][value="${p.correctOptionId}"]`).check();else await page.locator('#'+p.id).fill(String(p.answer.value));}}
 for(const width of [390,1280]){
 await page.setViewportSize({width,height:900});await page.goto(url);await page.waitForSelector('[data-open]',{state:'attached'});
 for(let i=0;i<qs.length;i++){await open(i);assert.equal(await page.locator('textarea,[data-score],#task select').count(),0);assert(await page.locator('#hint').count());await page.locator('#hint summary').click();assert(await page.locator('#hint p').isVisible());await answer(qs[i]);await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),new RegExp(`${qs[i].maxMarks} of ${qs[i].maxMarks} marks`));assert.equal(await page.locator('#task input:not([readonly]):not(:disabled)').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('#topics').click();}
 }
 await page.goto(url);await open(42);await page.locator('#s0').fill('0.05');await page.locator('#s1').fill('180');await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),/1 of 2 marks/);assert.match(await page.locator('#feedback').textContent(),/Method mark/);
 await page.goto(url);await open(42);await page.locator('#s0').fill('not a number');await page.locator('#s1').fill('200');await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),/1 of 2 marks/);
 await page.goto(url);await open(42);await page.locator('#check').click();await page.locator('#check').click();assert.match(await page.locator('#feedback').textContent(),/0 of 2 marks/);
 await page.goto(url);await open(21);await page.locator('#reveal').click();assert.match(await page.locator('#feedback').textContent(),/not scored/);assert.equal(await page.locator('input:enabled').count(),0);
 assert.equal(await page.evaluate(()=>localStorage.length),0);assert.deepEqual(errors,[]);
 console.log('Passed: all 120 questions fully and blank marked; mobile/desktop automatic scoring; partial marks; invalid input; follow-through; blank confirmation; unscored reveal; no storage writes or script errors; standalone loading.');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
