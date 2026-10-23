'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {generateUsername,generatePassword,provisionStudent,resetStudent}=require('../scripts/account-service.cjs');
const {studentEmail}=require('../src/student-identity.cjs'),{makeEvent}=require('../src/learning-events.cjs');
const bank=require('../questions.json'),url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Disposable local Auth required.');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,options);
const client=()=>createClient(url,key,options),ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
function expireLease(target){
 const container=process.env.SUPABASE_TEST_DB_CONTAINER;
 assert.match(container||'',/^ocr-db-[a-f0-9]{10}$/);assert.match(target,/^[a-f0-9-]{36}$/);
 const result=spawnSync('docker',['exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{
  input:`update app_private.pending_password_resets set started_at=now()-interval '3 minutes' where target='${target}'::uuid;`,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
}
test('operator and staff resets share leases, recover expired work and clear the own-password gate',async()=>{
 const ids=[],staff=client(),student=client();
 try{
  const email=randomUUID()+'@staff.invalid',password=generatePassword(),{user}=ok(await root.auth.admin.createUser({email,password,email_confirm:true}));ids.push(user.id);
  ok(await root.from('account_profiles').insert({user_id:user.id,role:'admin',must_change_password:false}));ok(await staff.auth.signInWithPassword({email,password}));
  const username=generateUsername(),id=await provisionStudent(root,{username,password:generatePassword()});ids.push(id);
  const ctx=ok(await staff.rpc('staff_context')),operation=randomUUID(),scope={actor:ctx.user_id,session:ctx.session_id,target:id,staff:false,operation};
  for(const c of [client(),staff]){
   assert.ok((await c.rpc('operator_prepare_student_reset',{target:id,operation:randomUUID()})).error);
   assert.ok((await c.rpc('operator_finish_student_reset',{target:id,operation:randomUUID()})).error);
  }
  ok(await root.rpc('staff_prepare_reset',scope));
  assert.equal((await root.rpc('operator_prepare_student_reset',{target:id,operation:randomUUID()})).error.code,'55006');
  await assert.rejects(resetStudent(root,username,generatePassword()),/Another reset is in progress/);
  assert.equal((await root.rpc('operator_finish_student_reset',{target:id,operation})).error.code,'42501');
  assert.equal((await root.rpc('prepare_student_password_reset',{target:id})).error.code,'0A000');
  expireLease(id);
  const replacement=generatePassword();await resetStudent(root,username,replacement);
  assert.deepEqual(ok(await root.from('account_profiles').select('active,must_change_password').eq('user_id',id).single()),{active:true,must_change_password:true});
  assert.equal((await root.rpc('staff_finish_reset',scope)).error.code,'42501');
  ok(await student.auth.signInWithPassword({email:studentEmail(username),password:replacement}));ok(await student.auth.updateUser({password:generatePassword()}));
  assert.equal(ok(await student.from('account_profiles').select('must_change_password').single()).must_change_password,false);
  ok(await student.rpc('sync_learning_attempts',{expected_student:id,events:[makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:1},randomUUID)]}));
  const operator={target:id,operation:randomUUID()};ok(await root.rpc('operator_prepare_student_reset',operator));
  assert.equal((await root.rpc('staff_prepare_reset',{...scope,operation:randomUUID()})).error.code,'55006');
  assert.equal((await root.rpc('operator_finish_student_reset',{...operator,operation:randomUUID()})).error.code,'42501');
  const during=client(),temporary=generatePassword();ok(await root.auth.admin.updateUserById(id,{password:temporary}));
  ok(await during.auth.signInWithPassword({email:studentEmail(username),password:temporary}));
  const duringToken=ok(await during.auth.getSession()).session.access_token;
  ok(await root.rpc('operator_finish_student_reset',operator));
  const stale=createClient(url,key,{...options,global:{headers:{Authorization:'Bearer '+duringToken}}});
  assert.deepEqual(ok(await stale.from('account_profiles').select('*')),[]);
  assert.equal(ok(await root.from('learning_attempts').select('*').eq('student_id',id)).length,1);
  await during.auth.signOut();
 }finally{await student.auth.signOut();await staff.auth.signOut();for(const id of ids.reverse())await root.auth.admin.deleteUser(id);}
});
test('online class removal clears reports and rejected clock events do not block valid saving',async()=>{
 const ids=[],classes=[],clients=[];let server,browser;
 try{
  const teacherEmail=randomUUID()+'@staff.invalid',teacherPassword=generatePassword();
  const {user:teacher}=ok(await root.auth.admin.createUser({email:teacherEmail,password:teacherPassword,email_confirm:true}));ids.push(teacher.id);
  ok(await root.from('account_profiles').insert({user_id:teacher.id,role:'teacher',must_change_password:false}));
  const username=generateUsername(),studentPassword=generatePassword(),studentId=await provisionStudent(root,{username,password:generatePassword()});ids.push(studentId);
  ok(await root.auth.admin.updateUserById(studentId,{password:studentPassword}));
  const cls=ok(await root.from('school_classes').insert({label:'Fictional regression class'}).select('id').single());classes.push(cls.id);
  ok(await root.from('class_students').insert({class_id:cls.id,student_id:studentId}));ok(await root.from('class_teachers').insert({class_id:cls.id,teacher_id:teacher.id}));
  const learner=client(),teacherClient=client();clients.push(learner,teacherClient);
  ok(await learner.auth.signInWithPassword({email:studentEmail(username),password:studentPassword}));ok(await teacherClient.auth.signInWithPassword({email:teacherEmail,password:teacherPassword}));
  const revealedQuestion=bank.questions[1],reveal=makeEvent(bank,revealedQuestion,{mode:'practice'},'reveal',null,randomUUID);
  const fresh=makeEvent(bank,revealedQuestion,{mode:'practice'},'submit',{score:revealedQuestion.maxMark},randomUUID);
  fresh.attempted_at=new Date(Date.parse(reveal.attempted_at)+1).toISOString();
  ok(await learner.rpc('sync_learning_attempts',{expected_student:studentId,events:[makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:1},randomUUID),reveal,fresh]}));
  const siteRoot=path.resolve(__dirname,'..');server=http.createServer(async(req,res)=>{
   try{
    const relative=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1)||'index.html',file=path.resolve(siteRoot,relative);
    if(!file.startsWith(siteRoot+path.sep)||relative.startsWith('.'))throw Error('path');
    let body=relative==='auth-config.json'?JSON.stringify({supabaseUrl:url,publishableKey:key}):await fs.readFile(file);
    if(relative==='student-login.html')body=body.toString().replace('https://ojhckvbekzudphkjeofw.supabase.co',url);
    res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'text/plain');res.end(body);
   }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const staffContext=await browser.newContext(),studentContext=await browser.newContext();
  for(const context of [staffContext,studentContext])await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const staffPage=await staffContext.newPage();staffPage.setDefaultTimeout(15000);
  await staffPage.goto(base+'/staff.html');await staffPage.locator('#staff-email').fill(teacherEmail);await staffPage.locator('#staff-password').fill(teacherPassword);await staffPage.locator('#staff-login-form button').click();
  await staffPage.waitForFunction(()=>document.querySelector('#staff-status').textContent.startsWith('Staff tools ready'));
  await staffPage.locator(`[data-report="${studentId}"]`).click();await staffPage.waitForFunction(()=>document.querySelector('#staff-status').textContent==='Student progress loaded.');
  await staffPage.locator('#student-report details > summary').click();
  const reportRow=staffPage.locator('#student-report details tr').filter({hasText:revealedQuestion.id+' ·'});
  assert.ok((await reportRow.innerText()).includes(`${revealedQuestion.maxMark} / ${revealedQuestion.maxMark}`));
  ok(await root.from('class_teachers').delete().eq('class_id',cls.id).eq('teacher_id',teacher.id));
  await staffPage.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await staffPage.waitForFunction(()=>document.querySelector('#staff-status').textContent.startsWith('Class access updated'));
  assert.equal(ok(await teacherClient.from('learning_attempts').select('*')).length,0);
  assert.equal(await staffPage.locator('#class-picker').count(),0);assert.equal(await staffPage.locator('#staff-tools').innerText().then(text=>text.includes(username)),false);
  assert.equal(await staffPage.locator('#student-report').innerText(),'');assert.equal(await staffPage.locator('#student-report').isVisible(),false);
  const page=await studentContext.newPage();page.setDefaultTimeout(15000);
  await page.goto(base+'/student-login.html');await page.locator('#username').fill(username);await page.locator('#password').fill(studentPassword);await page.locator('#login-form button').click();await page.waitForSelector('#continue-practice:not([hidden])');
  await page.goto(base+'/index.html?preview=RC01');await page.waitForSelector('#submit');
  const saved=()=>page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent==='All progress saved to your account.');await saved();
  const answer=async()=>{await page.locator('#reagent').selectOption('dichromate-acid');await page.locator('#heating').selectOption('distil');await page.locator('#submit').click();};
  await studentContext.setOffline(true);await page.evaluate(()=>{globalThis.originalClock=Date.now;Date.now=()=>originalClock()-600000;});await answer();
  await page.evaluate(()=>{Date.now=originalClock;start('preview',[S.bank.questions.find(q=>q.id==='RC01')]);});await answer();
  await page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.includes('2 attempts waiting'));
  await studentContext.setOffline(false);
  await page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.startsWith('1 attempt needs attention'));
  assert.equal(ok(await root.from('learning_attempts').select('*').eq('student_id',studentId)).length,4);
  assert.equal(await page.evaluate(()=>JSON.parse(Object.entries(sessionStorage).find(([key])=>key.startsWith('ocr-learning-')&&key.endsWith(':pending'))[1]).length),0);
  await page.locator('#sync-attention > summary').click();assert.match(await page.locator('#sync-attention').innerText(),/Check your device clock/);
  const rejectedBefore=await page.evaluate(()=>Object.entries(sessionStorage).find(([key])=>key.startsWith('ocr-learning-')&&key.endsWith(':rejected'))[1]);
  assert.equal(JSON.parse(rejectedBefore)[0].reason,'clock');assert.equal(Object.keys(JSON.parse(rejectedBefore)[0].event).length,13);assert.equal(rejectedBefore.includes('dichromate-acid'),false);
  page.once('dialog',dialog=>dialog.accept());await page.reload();page.removeAllListeners('dialog');await page.waitForSelector('#submit');
  await page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.startsWith('1 attempt needs attention'));
  page.once('dialog',dialog=>{assert.match(dialog.message(),/have not synced/);void dialog.dismiss();});await page.locator('#practice-sign-out').click();assert.equal(await page.locator('#account-sync-bar').isVisible(),true);
  await page.locator('#sync-attention > summary').click();await page.locator('#retry-rejected-attempts').click();
  await page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.startsWith('1 attempt needs attention'));
  const replacement=generatePassword();await resetStudent(root,username,replacement);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.includes('Sign in again'));
  assert.equal(await page.locator('main').isVisible(),false);assert.equal(await page.locator('#sync-attention').isVisible(),false);
  page.once('dialog',dialog=>dialog.accept());await page.goto(base+'/student-login.html');page.removeAllListeners('dialog');
  await page.waitForSelector('#login-form:not([hidden])');await page.locator('#username').fill(username);await page.locator('#password').fill(replacement);await page.locator('#login-form button').click();
  await page.waitForSelector('#password-form:not([hidden])');const ownPassword=generatePassword();
  await page.locator('#new-password').fill(ownPassword);await page.locator('#confirm-password').fill(ownPassword);await page.locator('#password-form button').click();await page.waitForSelector('#continue-practice:not([hidden])');
  await page.goto(base+'/index.html?preview=RC01');await page.waitForSelector('#submit');
  await page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.startsWith('1 attempt needs attention'));
  await page.locator('#sync-attention > summary').click();
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#discard-rejected-attempts').click();assert.equal(await page.locator('#sync-attention').isVisible(),true);
  page.once('dialog',dialog=>dialog.accept());await page.locator('#discard-rejected-attempts').click();await saved();
  assert.equal(ok(await root.from('learning_attempts').select('*').eq('student_id',studentId)).length,4);
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));for(const c of clients)await c.auth.signOut();for(const id of classes)await root.from('school_classes').delete().eq('id',id);for(const id of ids.reverse())await root.auth.admin.deleteUser(id);}
});
