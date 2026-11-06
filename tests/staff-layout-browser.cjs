'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {chromium}=require('playwright');
const {buildStaffDemo}=require('../scripts/build-staff-demo.cjs');
test('implemented task-led staff pages work offline at desktop and mobile sizes',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'labrats-staff-layout-')),file=path.join(dir,'preview.html');buildStaffDemo(file);
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(fs.readFileSync(file))});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const base='http://127.0.0.1:'+server.address().port;
  for(const width of [1440,390,320])for(const role of ['teacher','admin']){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',r=>{if(r.request().url().startsWith(base))return r.continue();external.push(r.request().url());return r.abort()});
   await page.goto(base+'/?role='+role);await page.waitForFunction(()=>document.querySelector('#staff-status')?.textContent.startsWith('Staff tools ready'));
   const nav=async name=>{const target=page.locator('.staff-page-nav [data-staff-page="'+name+'"]:visible');if(width<761&&['staff','retention','account',...(role==='admin'?['packs']:[])].includes(name))await page.locator('.staff-more summary').click();await target.click();};
   if(role==='admin'){assert.equal(await page.locator('#staff-page-title').innerText(),'School overview');await page.waitForSelector('#staff-overview-status button');await nav('classes');}
   else assert.equal(await page.locator('[data-staff-page="retention"]').count(),0);
   assert.equal(await page.locator('[data-class]').count(),2);
   await page.locator('#student-search').fill('brave');assert.equal(await page.locator('.staff-roster [data-student-row]:visible').count(),1);
   await page.locator('.staff-roster [data-report]:visible').click();await page.waitForFunction(()=>document.querySelector('#staff-status')?.textContent==='Student progress loaded.');
   assert.equal(await page.locator('#student-report details').count(),1);assert.equal(await page.locator('#student-report details').getAttribute('open'),null);
   await page.locator('#report-tab-flashcards').click();await page.waitForFunction(()=>document.querySelector('.flashcard-staff-report')?.textContent.includes('Topic progress'));
   assert.equal(await page.locator('#question-report-pane').isVisible(),false);assert.match(await page.locator('#flashcard-report-pane').innerText(),/Student self-assessments/);
   await page.locator('#report-tab-flashcards').press('ArrowLeft');assert.equal(await page.locator('#question-report-pane').isVisible(),true);
   page.once('dialog',d=>d.accept());await page.locator('[data-reset]').first().click();await page.waitForSelector('#private-output:not([hidden])');
   await nav('classes');assert.equal(await page.locator('#private-output').isVisible(),false);
   await nav('cohort');await page.waitForSelector('.cohort-topics');
   assert.match(await page.locator('.cohort-stats').innerText(),/Students contributing\s+4\s*\/\s*6/);
   assert.equal(await page.locator('.cohort-topics [data-grade=N]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const participation=await page.locator('.cohort-topics tbody tr td:nth-child(3)').first().boundingBox();assert(participation.x>=0&&participation.x+participation.width<=width,'topic participation must be visible without horizontal scrolling');
   if(role==='admin'&&width!==320)await page.screenshot({path:'/tmp/labrats-class-progress-chemistry-'+width+'.png',fullPage:true});
   await page.locator('[data-cohort-topic]').first().click();assert.equal(await page.locator('#cohort-question-detail').getAttribute('open'),'');
   await page.locator('#cohort-question-search').fill('this will not match any question');assert.match(await page.locator('#cohort-question-list').innerText(),/No matching questions/);
   await page.locator('#cohort-tab-flashcards').click();await page.waitForFunction(()=>document.querySelector('#cohort-results')?.textContent.includes('Self-reported flashcard recall'));
   assert.match(await page.locator('#cohort-results').innerText(),/Cards often marked Not yet/);
   await page.locator('#staff-subject').selectOption('applied-science');await page.waitForSelector('.cohort-topics');
   assert.match(await page.locator('.cohort-stats').innerText(),/Students contributing\s+4\s*\/\s*6/);
   if(role==='admin'&&width!==320)await page.screenshot({path:'/tmp/labrats-class-progress-applied-'+width+'.png',fullPage:true});
   await page.locator('#cohort-tab-flashcards').click();await page.waitForFunction(()=>document.querySelector('#cohort-results')?.textContent.includes('No published cards in this subject yet.'));
   await page.locator('#staff-subject').selectOption('chemistry');await page.waitForSelector('.cohort-topics');
   if(role==='admin'){await nav('retention');await page.waitForSelector('#retention-health');assert.equal(await page.locator('#retire-staff').count(),0);await nav('staff');await page.waitForSelector('#retire-staff');assert.equal(await page.locator('#extend-retention').count(),0);}
   await nav('packs');await page.waitForSelector('#new-pack');await page.locator('#new-pack').click();await page.locator('#sample-pack').click();await page.waitForSelector('#pack-preview tbody tr');
   page.once('dialog',d=>d.accept());await nav('account');await page.locator('#show-password-change').click();assert.equal(await page.locator('#staff-password-panel').isVisible(),true);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width!==320)await page.screenshot({path:'/tmp/staff-'+role+'-'+width+'.png',fullPage:true});
   await page.close();
   assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  }
  for(const width of [390,1440])for(const [scenario,reason] of [['failed','failed_run'],['missing','missing_run'],['overdue','overdue_run'],['healthy','healthy'],['unavailable','status_unavailable']]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   await page.goto(base+'/?role=admin&cleanup='+scenario);
   await page.waitForSelector('#staff-overview-status[data-health="'+reason+'"]');
   assert.equal(await page.locator('#staff-overview-status').getAttribute('role'),scenario==='healthy'?'status':'alert');
   if(scenario==='unavailable'){
    if(width<761)await page.locator('.staff-more summary').click();
    await page.locator('.staff-page-nav [data-staff-page="retention"]:visible').click();
    await page.waitForSelector('#retention-controls[role=alert]');
   }else{
    await page.locator('#staff-overview-status button').click();await page.waitForSelector('#retention-alert[data-health="'+reason+'"]');
    assert.equal(await page.locator('#retention-alert').getAttribute('role'),scenario==='healthy'?'status':'alert');
    assert.match(await page.locator('#retention-controls').innerText(),/Email alerts are not enabled/);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(base+'/?role=teacher&many=1');await page.waitForSelector('#class-search');await page.locator('#class-search').fill('Extra class 8');assert.equal(await page.locator('#class-picker option').count(),1);await page.locator('#class-picker').selectOption({label:'Extra class 8'});await page.waitForFunction(()=>document.querySelector('.staff-section-header h2')?.textContent==='Extra class 8');await page.close();
 }finally{await browser?.close();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})}
});
