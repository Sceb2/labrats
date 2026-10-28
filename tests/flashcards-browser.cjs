'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),{createClient}=require('@supabase/supabase-js');
const {generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const root=path.resolve(__dirname,'..'),url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(url&&!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Disposable local backend only.');
function server(){return http.createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).slice(1)||'index.html',file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||rel.startsWith('.'))throw Error('Invalid path');let body=rel==='auth-config.json'&&url?JSON.stringify({supabaseUrl:url,publishableKey:key}):await fs.readFile(file);if(rel==='student-login.html'&&url)body=body.toString().replace('https://ojhckvbekzudphkjeofw.supabase.co',url);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav'})[path.extname(file)]||'text/plain');res.end(body);}catch{res.writeHead(404);res.end();}});}
test('guest flashcard sample, both topic routes, mobile layout and bounded sessions',async()=>{
 const site=server();await new Promise(r=>site.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+site.address().port+'/';let browser;
 try{
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>{if(r.request().url().startsWith(base))return r.continue();external.push(r.request().url());return r.abort();});
  await page.goto(base+'student-site-preview.html');await page.locator('#preview-login header a').click();await page.waitForSelector('#practice');await page.locator('[data-topic=basic]').check();
  assert.equal(await page.locator('.study-modes [aria-current=page]').innerText(),'Active Learning');await page.screenshot({path:'/tmp/labrats-flashcards-topics-mobile.png',fullPage:true});
  await page.locator('.study-modes a').click();await page.waitForSelector('#start-flashcards');assert.match(await page.locator('#flashcard-available').innerText(),/33/);assert.match(await page.locator('.notice').innerText(),/Log in to remember/);
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/labrats-flashcards-setup-mobile.png',fullPage:true});
  await page.locator('#start-flashcards').click();assert(await page.locator('#flashcard-got-it').isDisabled());assert.equal(await page.locator('.flashcard-answer').getAttribute('aria-hidden'),'true');
  await page.screenshot({path:'/tmp/labrats-flashcards-front-mobile.png',fullPage:true});await page.locator('#reveal-flashcard').click();assert.equal(await page.locator('.flashcard-answer').getAttribute('aria-hidden'),'false');await page.locator('.flashcard-turner').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));await page.screenshot({path:'/tmp/labrats-flashcards-back-mobile.png',fullPage:true});
  // Keyboard flip-back keeps assessment available; card faces never both enter the accessibility tree.
  await page.locator('#reveal-flashcard').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.flashcard-question').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('.flashcard-answer').evaluate(el=>el.inert),true);
  assert(await page.locator('#flashcard-got-it').isEnabled());
  await page.keyboard.press('Space');assert.equal(await page.locator('.flashcard-answer').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('.flashcard-turner').evaluate(el=>getComputedStyle(el).transitionDuration),'0.3s');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.flashcard-turner').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const width of [320,390,1280]){
   await page.setViewportSize({width,height:844});
   const before=await page.locator('#flashcard-got-it').boundingBox();
   await page.locator('#reveal-flashcard').click();
   const after=await page.locator('#flashcard-got-it').boundingBox();
   assert.equal(before.y,after.y);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#flashcard-not-yet').click();
  assert(await page.locator('#flashcard-got-it').isDisabled());
  assert.equal(await page.locator('#reveal-flashcard').getAttribute('class'),'flashcard-flip');
  let presented=1;
  while(await page.locator('#reveal-flashcard').count()){await page.locator('#reveal-flashcard').click();await page.locator('#flashcard-got-it').click();presented++;assert(presented<=21);}
  assert.equal(presented,21);assert.match(await page.locator('.summary-score').innerText(),/19 \/ 20/);
  assert.equal(await page.evaluate(()=>Object.values(localStorage).join('').includes('organic-basics-')||Object.values(sessionStorage).join('').includes('organic-basics-')),false);
  await page.reload();await page.waitForSelector('#start-flashcards');await page.locator('#see-flashcard-progress').click();assert.match(await page.locator('#app').innerText(),/0 cards attempted/);
  await page.locator('#back-to-flashcards').click();await page.locator('[name=flash-length][value=open]').check();await page.locator('#start-flashcards').click();let total=0;
  while(await page.locator('#reveal-flashcard').count()){await page.locator('#reveal-flashcard').click();await page.locator('#flashcard-not-yet').click();total++;assert(total<=66);}
  assert.equal(total,66);assert.match(await page.locator('.summary-page').innerText(),/33 retries assessed/);
  // Both faces share a height, including a long multiline answer; scientific text is not interpreted as HTML.
  await page.evaluate(()=>{const s=window.LabRatsFlashcards.state;s.session=null;s.cards=s.cards.slice(0,1);s.cards[0]={...s.cards[0],front:'What does a structural formula show?',back:'The minimum detail showing the arrangement of atoms in a molecule.\nExample: CH₃CH₂CH₂CH₃ or CH₃(CH₂)₂CH₃.\nLiteral text: <strong>not markup</strong>.'};});
  await page.locator('#flashcard-practice-nav').click();await page.locator('#start-flashcards').click();
  await page.setViewportSize({width:320,height:844});const frontY=await page.locator('#flashcard-got-it').evaluate(el=>el.getBoundingClientRect().top+scrollY);
  await page.locator('#reveal-flashcard').click();
  await page.locator('.flashcard-turner').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));
  assert.equal(await page.locator('#flashcard-back').getAttribute('class'),'flashcard-copy');
  assert.equal(await page.locator('#flashcard-back').evaluate(el=>getComputedStyle(el).textAlign),'center');
  assert.equal(await page.locator('#flashcard-back').evaluate(el=>getComputedStyle(el).fontSize),await page.locator('#flashcard-front').evaluate(el=>getComputedStyle(el).fontSize));
  assert.equal(await page.locator('.flashcard-side-footer').count(),0);
  assert.match(await page.locator('#flashcard-back').innerText(),/CH₃\(CH₂\)₂CH₃/);
  assert.equal(await page.locator('#flashcard-back strong').count(),0);
  assert.equal(await page.locator('#flashcard-got-it').evaluate(el=>el.getBoundingClientRect().top+scrollY),frontY);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(base+'applied-science-preview.html');await page.locator('#preview-login header a').click();await page.waitForSelector('#select-all');await page.locator('#select-all').click();assert.match(await page.locator('.study-modes a').getAttribute('href'),/subject=applied-science/);
  await page.locator('.study-modes a').click();await page.waitForSelector('#start-flashcards');assert(await page.locator('#start-flashcards').isDisabled());assert.match(await page.locator('#flashcard-available').innerText(),/0 cards/);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 }finally{if(browser)await browser.close();await new Promise(r=>site.close(r));}
});
if(url)test('real staff sample import/publication, student offline sync, guest isolation and sign-out',async()=>{
 const opts={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,opts),users=[];let browser,packId,studentId;
 const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
 const site=server();await new Promise(r=>site.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+site.address().port+'/';
 try{
  const email=generateUsername()+'@staff.invalid',password=generatePassword(),u=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(u.id);ok(await admin.from('account_profiles').insert({user_id:u.id,role:'admin',must_change_password:false}));
  const username=generateUsername(),studentPassword=generatePassword();studentId=await provisionStudent(admin,{username,password:generatePassword()});users.push(studentId);ok(await admin.auth.admin.updateUserById(studentId,{password:studentPassword}));
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const staff=await browser.newPage(),context=await browser.newContext({viewport:{width:390,height:844}}),student=await context.newPage(),guest=await browser.newPage();staff.on('dialog',d=>d.accept());
  const errors=[],payloads=[];for(const page of [staff,student,guest])page.on('pageerror',e=>errors.push(e.message));student.on('request',r=>{if(r.url().includes('/rpc/sync_flashcard_attempts'))payloads.push(r.postDataJSON());});
  await staff.goto(base+'staff.html');await staff.locator('#staff-email').fill(email);await staff.locator('#staff-password').fill(password);await staff.locator('#staff-login-form button').click();await staff.waitForSelector('#sample-pack');
  await staff.locator('#sample-pack').click();await staff.waitForSelector('#save-pack:not([hidden])');assert.equal(await staff.locator('#pack-preview tbody tr').count(),33);assert(await staff.locator('#pack-preview').innerText().then(s=>s.includes('CH₃CH₂CH₃')));
  await staff.screenshot({path:'/tmp/labrats-flashcards-import-desktop.png',fullPage:true});
  await staff.locator('#save-pack').click();await staff.waitForFunction(()=>document.querySelector('#pack-status').textContent.startsWith('Private draft saved'));
  packId=await staff.locator('#pack-picker').inputValue();await staff.locator('#publish-pack').click();await staff.waitForFunction(()=>document.querySelector('#pack-status').textContent==='Pack published.');
  await guest.goto(base+'flashcards.html?subject=chemistry&topics=basic');await guest.waitForSelector('#start-flashcards');assert.match(await guest.locator('#flashcard-available').innerText(),/33 cards/);assert.equal(await guest.locator('#account-sync-bar').count(),0);
  await student.goto(base+'student-login.html?subject=chemistry');await student.locator('#username').fill(username);await student.locator('#password').fill(studentPassword);await student.locator('#login-form button').click();await student.waitForSelector('#account-panel:not([hidden])');
  await student.goto(base+'flashcards.html?subject=chemistry&topics=basic');await student.waitForSelector('#start-flashcards');await student.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent==='All progress saved to your account.');
  await student.locator('#start-flashcards').click();await context.setOffline(true);await student.locator('#reveal-flashcard').click();await student.locator('#flashcard-not-yet').click();await student.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.includes('waiting'));
  const storage=await student.evaluate(()=>Object.values(sessionStorage).join(''));assert(!storage.includes('front"'));assert(!storage.includes('back"'));assert(!storage.includes('RCOOR'));
  await student.screenshot({path:'/tmp/labrats-flashcards-account-mobile.png',fullPage:true});
  await context.setOffline(false);await student.waitForFunction(()=>document.querySelector('#account-sync-status').textContent==='All progress saved to your account.');
  assert.equal(ok(await admin.from('flashcard_attempts').select('*').eq('student_id',studentId)).length,1);assert.equal(ok(await admin.from('learning_attempts').select('*').eq('student_id',studentId)).length,0);
  for(const payload of payloads)for(const event of payload.events){assert.equal(Object.keys(event).length,13);assert(!('front'in event));assert(!('back'in event));assert.equal(event.answer_revealed,false);}
  // A question queued in another mode must save when the flashcard channel reconnects.
  await student.route('**/rest/v1/rpc/sync_learning_attempts',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await student.goto(base+'chemistry.html?preview=RC01');await student.waitForSelector('#submit');
  await student.locator('#reagent').selectOption('dichromate-acid');await student.locator('#heating').selectOption('distil');await student.locator('#submit').click();
  await student.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.includes('Unable to sync'));
  student.once('dialog',d=>d.accept());await student.goto(base+'flashcards.html?subject=chemistry&topics=basic');await student.waitForSelector('#start-flashcards');
  await student.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.includes('Unable to sync'));
  await student.unroute('**/rest/v1/rpc/sync_learning_attempts');await student.locator('#retry-progress-sync').click();
  await student.waitForFunction(()=>document.querySelector('#account-sync-status').textContent==='All progress saved to your account.');
  assert.equal(ok(await admin.from('learning_attempts').select('*').eq('student_id',studentId)).length,1);
  assert.equal(ok(await admin.from('flashcard_attempts').select('*').eq('student_id',studentId)).length,1);
  await student.reload();await student.waitForSelector('#start-flashcards');await student.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent==='All progress saved to your account.');await student.locator('#see-flashcard-progress').click();assert.match(await student.locator('#app').innerText(),/1 card attempted/);assert.equal(await student.locator('[data-grade=E]').count(),1);
  await student.locator('#practice-sign-out').click();await student.waitForSelector('.subject-card');assert.equal(await student.evaluate(()=>Object.keys(sessionStorage).some(k=>k.includes(':flashcards:'))),false);assert.deepEqual(errors,[]);
 }finally{
  if(browser)await browser.close();await new Promise(r=>site.close(r));
  if(studentId)await admin.from('flashcard_attempts').delete().eq('student_id',studentId);
  if(packId){await admin.from('flashcard_pack_drafts').delete().eq('pack_id',packId);await admin.from('flashcard_cards').delete().eq('pack_id',packId);await admin.from('flashcard_packs').delete().eq('id',packId);}
  for(const id of users.reverse())await admin.auth.admin.deleteUser(id);admin.auth.stopAutoRefresh();
 }
});
