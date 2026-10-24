'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const fs=require('node:fs/promises'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {chromium}=require('playwright'),{createClient}=require('@supabase/supabase-js');
const {generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const bank=require('../questions.json');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Use disposable local Auth.');
const admin=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
test('account practice queues metadata, converges across devices and isolates shared browsers',async t=>{
  const root=path.resolve(__dirname,'..'),ids=[],credentials=[0,1].map(()=>({username:generateUsername(),password:generatePassword()}));
  let browser;
  const server=http.createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(!pathname.startsWith('/revision/')){res.writeHead(404);res.end();return;}
      const relative=pathname.slice(10)||'index.html',file=path.resolve(root,relative);
      if(!file.startsWith(root+path.sep)||relative.startsWith('.')){res.writeHead(404);res.end();return;}
      let body=relative==='auth-config.json'?JSON.stringify({supabaseUrl:url,publishableKey:key}):await fs.readFile(file);
      if(relative==='student-login.html')body=body.toString().replace('https://ojhckvbekzudphkjeofw.supabase.co',url);
      res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.wav':'audio/wav'}[path.extname(file)]||'text/plain');res.end(body);
    }catch{res.writeHead(404);res.end();}
  });
  try{
    for(const credential of credentials){
      const id=await provisionStudent(admin,{username:credential.username,password:generatePassword()});ids.push(id);
      assert.equal((await admin.auth.admin.updateUserById(id,{password:credential.password})).error,null);
    }
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${server.address().port}/revision/`;
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
    const context=await browser.newContext(),secondContext=await browser.newContext();
    const page=await context.newPage(),second=await secondContext.newPage();page.setDefaultTimeout(20000);second.setDefaultTimeout(20000);
    const errors=[],payloads=[];
    for(const p of [page,second])p.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(r.url().includes('/rpc/sync_learning_attempts'))payloads.push(r.postDataJSON());});
    const status=(p,text)=>p.waitForFunction(text=>document.querySelector('#account-sync-status')?.textContent.includes(text),text);
    const signIn=async(p,credential)=>{
      await p.goto(base+'student-login.html');await p.locator('#username').fill(credential.username);await p.locator('#password').fill(credential.password);
      await p.locator('#login-form button').click();await p.waitForSelector('#account-panel:not([hidden])');
    };
    const question=async(p,id='RC01')=>{await p.goto(base+'chemistry.html?preview='+id);await p.waitForSelector('#submit');await status(p,'All progress saved');};
    const answer=async(p,heating)=>{await p.locator('#reagent').selectOption('dichromate-acid');await p.locator('#heating').selectOption(heating);await p.locator('#submit').click();};
    const rows=async id=>{const r=await admin.from('learning_attempts').select('*').eq('student_id',id);assert.equal(r.error,null);return r.data;};
    let failed;
    const check=async(name,fn)=>{await t.test(name,async()=>{try{await fn();}catch(error){failed=error;throw error;}});if(failed)throw Error('Progress flow stopped after a failed check.');};
    const guest=JSON.stringify({bankVersion:bank.meta.bankVersion,scoringVersion:bank.meta.scoringVersion,records:{RC05:{first:{score:1,max:1,outcome:'correct'}}},sessions:[],bests:{}});
    await check('signing in starts separate progress and preserves guest history',async()=>{
      await page.goto(base+'student-login.html');await page.evaluate(guest=>localStorage.setItem('ocrOrgProgressV2',guest),guest);
      await signIn(page,credentials[0]);await question(page);
      assert.deepEqual(await page.evaluate(()=>Object.keys(S.progress.records)),[]);
      assert.equal(await page.evaluate(()=>localStorage.getItem('ocrOrgProgressV2')),guest);
    });
    await check('offline answers queue only metadata and sync on reconnect',async()=>{
      await context.setOffline(true);await answer(page,'reflux');await status(page,'waiting');
      const queued=await page.evaluate(()=>Object.entries(sessionStorage).filter(([key])=>key.startsWith('ocr-learning-')).map(([,value])=>value).join(''));
      assert.equal(queued.includes('dichromate-acid'),false);assert.equal(queued.includes('selected'),false);assert.equal(queued.includes('response'),false);
      assert.equal((await rows(ids[0])).length,0);
      await context.setOffline(false);await status(page,'All progress saved');
      const saved=await rows(ids[0]);assert.equal(saved.length,1);assert.equal(saved[0].earned_marks,1);assert.equal(saved[0].is_retry,false);
    });
    await check('another device restores marks and outstanding mistakes',async()=>{
      await signIn(second,credentials[0]);await question(second);
      assert.equal(await second.evaluate(()=>S.progress.records.RC01.first.score),1);
      assert.equal(await second.evaluate(()=>S.progress.records.RC01.review.outstanding),true);
    });
    await check('a lost upload acknowledgement is retried without duplicate history',async()=>{
      let lose=true,block=true;
      await page.route('**/rest/v1/rpc/sync_learning_attempts',async route=>{
        if(!lose){if(block)await route.fulfill({status:503,contentType:'application/json',body:'{}'});else await route.continue();return;}
        lose=false;const response=await route.fetch();assert.equal(response.ok(),true);
        await route.fulfill({status:503,contentType:'application/json',body:'{"message":"Simulated lost acknowledgement"}'});
      });
      await page.locator('#retry').click();await answer(page,'distil');await status(page,'Unable to sync');
      assert.equal((await rows(ids[0])).length,2);
      const pendingId=await page.evaluate(()=>JSON.parse(Object.entries(sessionStorage).find(([key])=>key.startsWith('ocr-learning-')&&key.endsWith(':pending'))[1])[0].event_id);
      await page.reload();await page.waitForSelector('#submit');await status(page,'Unable to sync');
      assert.equal(await page.evaluate(()=>JSON.parse(Object.entries(sessionStorage).find(([key])=>key.startsWith('ocr-learning-')&&key.endsWith(':pending'))[1])[0].event_id),pendingId);
      block=false;
      await page.locator('#retry-progress-sync').click();await status(page,'All progress saved');
      assert.equal((await rows(ids[0])).length,2);await page.unroute('**/rest/v1/rpc/sync_learning_attempts');
      await question(second);assert.equal(await second.evaluate(()=>S.progress.records.RC01.first.score),1);
      assert.equal(await second.evaluate(()=>S.progress.records.RC01.review.outstanding),false);
    });
    await check('new encounters remain distinct and payloads contain no answer data',async()=>{
      await answer(second,'distil');await status(second,'All progress saved');
      assert.equal((await rows(ids[0])).length,3);
      for(const payload of payloads)for(const event of payload.events){assert.equal(Object.keys(event).length,13);assert.equal('response' in event,false);}
      const result=await admin.from('learning_attempts').select('event_id');assert.equal(result.error,null);
    });
    await check('opening the model answer during mistake review marks the later submission as assisted',async()=>{
      await question(page);await answer(page,'reflux');await status(page,'All progress saved');
      await page.locator('[data-nav="mistakes"]').click();await page.locator('[data-review-mistake="RC01"]').click();
      await page.locator('.review-study > summary').click();
      await page.waitForFunction(()=>S.session.learningEncounters?.RC01?.revealed===true);
      await status(page,'All progress saved');await answer(page,'distil');await status(page,'All progress saved');
      const studied=(await rows(ids[0])).filter(row=>row.session_mode==='mistakes');
      assert.equal(studied.length,2);assert.equal(studied.find(row=>row.kind==='submit').answer_revealed,true);
      assert.equal(await page.evaluate(()=>S.progress.records.RC01.first.score),1);
    });
    await check('revoking an account session hides cached account results until sign-in',async()=>{
      const reset=await admin.rpc('operator_prepare_student_reset',{target:ids[0],operation:randomUUID()});assert.equal(reset.error,null);
      await page.evaluate(()=>window.dispatchEvent(new Event('online')));await status(page,'Sign in again');
      assert.equal(await page.locator('main').isVisible(),false);
      await page.reload();await page.waitForSelector('#app h1');
      assert.equal(await page.locator('#account-sync-bar').count(),0);
      assert.equal(await page.evaluate(()=>S.progress),null);
      // The sign-in page retains waiting data for reauthentication with the same account.
      await page.goto(base+'student-login.html');await page.waitForSelector('#login-form:not([hidden])');
      // The login page intentionally retains waiting data on an expired session.
      // Re-entering a different account clears it through the verified profile transition.
    });
    await check('switching accounts clears the old cache, keeps guest history, and starts empty',async()=>{
      await signIn(page,credentials[1]);await question(page,'RC05');
      assert.deepEqual(await page.evaluate(()=>Object.keys(S.progress.records)),[]);
      assert.equal(await page.evaluate(oldId=>Object.keys(sessionStorage).some(key=>key.startsWith('ocr-learning-')&&key.includes(oldId)),ids[0]),false);
      assert.equal(await page.evaluate(()=>localStorage.getItem('ocrOrgProgressV2')),guest);
    });
    await check('sign-out warns about waiting attempts and cancel preserves the queue',async()=>{
      await page.route('**/rest/v1/rpc/sync_learning_attempts',route=>route.abort('internetdisconnected'));
      await page.locator('#reagent').selectOption('borohydride');await page.locator('#submit').click();await status(page,'Unable to sync');
      page.once('dialog',dialog=>{assert.match(dialog.message(),/have not synced/);void dialog.dismiss();});
      await page.locator('#practice-sign-out').click();assert.equal(await page.locator('#account-sync-bar').isVisible(),true);
      page.once('dialog',dialog=>dialog.accept());await page.locator('#practice-sign-out').click();await page.waitForSelector('.subject-card',{state:'attached'});
      assert.equal((await rows(ids[1])).length,0);
      assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(key=>key.startsWith('ocr-learning-'))),false);
      assert.deepEqual(errors,[]);
    });
  }finally{
    if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
    for(const id of ids)await admin.auth.admin.deleteUser(id);
  }
});
