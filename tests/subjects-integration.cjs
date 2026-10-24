'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('playwright');
const {generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const {makeEvent}=require('../src/learning-events.cjs');
const chemistry=require('../questions.json'),applied=require('../applied-science/learning-bank.json'),source=require('../applied-science/Pilot_Question_Bank.json');
const {buildSitePreview}=require('../scripts/build-site-preview.cjs');
const os=require('node:os');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Disposable local Supabase only.');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,options);
const ok=result=>{assert.equal(result.error,null,result.error?.message);return result.data;};
test('shared identities, server subject boundaries, subject reports and both student UIs',async t=>{
 const users=[],classes=[],clients=[];let browser,server,previewFolder;
 const client=()=>{const c=createClient(url,key,options);clients.push(c);return c;};
 async function staff(role){const email=generateUsername()+'@staff.invalid',password=generatePassword(),{user}=ok(await root.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);ok(await root.from('account_profiles').insert({user_id:user.id,role,must_change_password:false}));const connection=client();ok(await connection.auth.signInWithPassword({email,password}));return {id:user.id,email,password,connection};}
 try{
  const admin=await staff('admin'),chemTeacher=await staff('teacher'),appliedTeacher=await staff('teacher');
  const username=generateUsername(),password=generatePassword(),studentId=await provisionStudent(root,{username,password:generatePassword()});users.push(studentId);
  ok(await root.auth.admin.updateUserById(studentId,{password}));const student=client();ok(await student.auth.signInWithPassword({email:username+'@students.invalid',password}));
  for(const subject_id of ['chemistry','applied-science']){
   const cls=ok(await admin.connection.rpc('staff_manage',{action:'create_class',payload:{label:'Subject fixture '+subject_id,subject_id}})).id;classes.push(cls);
   ok(await admin.connection.rpc('staff_manage',{action:'enrol_student',payload:{class_id:cls,user_id:studentId}}));
  }
  await t.test('subject grants are administrator-only and class assignment also requires the matching grant',async()=>{
   assert((await admin.connection.rpc('staff_manage',{action:'assign_teacher',payload:{class_id:classes[1],user_id:chemTeacher.id}})).error);
   assert((await chemTeacher.connection.rpc('staff_manage',{action:'grant_subject',payload:{user_id:chemTeacher.id,subject_id:'applied-science'}})).error);
   for(const [teacher,subject_id,cls]of [[chemTeacher,'chemistry',classes[0]],[appliedTeacher,'applied-science',classes[1]]]){
    ok(await admin.connection.rpc('staff_manage',{action:'grant_subject',payload:{user_id:teacher.id,subject_id}}));
    ok(await admin.connection.rpc('staff_manage',{action:'assign_teacher',payload:{class_id:cls,user_id:teacher.id}}));
   }
   assert((await chemTeacher.connection.rpc('staff_manage',{action:'create_class',payload:{label:'Not allowed',subject_id:'applied-science'}})).error);
   ok(await admin.connection.rpc('staff_manage',{action:'rename_class',payload:{class_id:classes[0],label:'Chemistry fixture'}}));
  });
  const ce=makeEvent(chemistry,chemistry.questions[0],{mode:'practice'},'submit',{score:chemistry.questions[0].maxMark},randomUUID);
  const ae=makeEvent(applied,applied.questions[0],{mode:'practice'},'submit',{score:applied.questions[0].maxMark},randomUUID);
  await t.test('one student saves both subjects, while subject identity is derived server-side and raw data is rejected',async()=>{
   ok(await student.rpc('sync_learning_attempts',{events:[ce,ae],expected_student:studentId}));
   assert.deepEqual(ok(await student.rpc('sync_learning_attempts',{events:[ce,ae],expected_student:studentId})),[ce.event_id,ae.event_id]);
   const events=ok(await student.from('learning_attempts').select('*'));assert.equal(events.length,2);assert.deepEqual(new Set(events.map(e=>e.subject_id)),new Set(['chemistry','applied-science']));
   for(const extra of [{subject_id:'chemistry'},{writtenText:'private'},{responses:{answer:'private'}}])assert((await student.rpc('sync_learning_attempts',{events:[{...ae,...extra}],expected_student:studentId})).error);
  });
  await t.test('teachers cannot read the other subject, even for the same student, including activity-window RPCs',async()=>{
   for(const [teacher,subject_id]of [[chemTeacher,'chemistry'],[appliedTeacher,'applied-science']]){
    const rows=ok(await teacher.connection.from('learning_attempts').select('*').eq('student_id',studentId));assert.equal(rows.length,1);assert.equal(rows[0].subject_id,subject_id);
    assert.equal(ok(await teacher.connection.rpc('student_subject_activity_windows',{target:studentId,subject:subject_id}))[0].correct_attempts,1);
    assert.equal(ok(await teacher.connection.rpc('student_subject_activity_windows',{target:studentId,subject:subject_id==='chemistry'?'applied-science':'chemistry'}))[0].correct_attempts,0);
   }
  });
  await t.test('subject hub, single student sign-in, separate progress, N tooltips and private metadata work in the browser',async()=>{
   const site=path.resolve(__dirname,'..');
   previewFolder=await fs.mkdtemp(path.join(os.tmpdir(),'ocr-applied-preview-'));const previewFile=path.join(previewFolder,'applied.html');
   buildSitePreview({supabaseUrl:url,publishableKey:key},previewFile,'applied-science');const preview=await fs.readFile(previewFile);
   server=http.createServer(async(req,res)=>{try{const relative=decodeURIComponent(new URL(req.url,'http://x').pathname).slice(1)||'index.html',file=path.resolve(site,relative);if(!file.startsWith(site+path.sep)||relative.startsWith('.'))throw Error('Invalid path');let bytes=relative==='applied-preview.html'?preview:relative==='auth-config.json'?JSON.stringify({supabaseUrl:url,publishableKey:key}):await fs.readFile(file);if(relative==='student-login.html')bytes=bytes.toString().replace('https://ojhckvbekzudphkjeofw.supabase.co',url);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.wav':'audio/wav','.mjs':'text/javascript'})[path.extname(file)]||'text/plain');res.end(bytes);}catch{res.writeHead(404);res.end();}});
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/`;
   browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
   const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],payloads=[],violations=[];
   page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(r.url().endsWith('/rpc/sync_learning_attempts'))payloads.push(r.postDataJSON());});
   page.on('console',message=>{if(/Content Security Policy|Refused to/.test(message.text()))violations.push(message.text());});
   await page.goto(base);assert.equal(await page.locator('.subject-card').count(),2);await page.screenshot({path:'/tmp/ocr-subject-hub.png',fullPage:true});
   await page.goto(base+'student-login.html?subject=chemistry');await page.locator('#username').fill(username);await page.locator('#password').fill(password);await page.locator('#login-form button').click();await page.waitForSelector('#account-panel:not([hidden])');
   await page.locator('#continue-practice').click();await page.waitForSelector('#practice');await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent==='All progress saved to your account.');
   assert.equal(await page.evaluate(()=>S.progress.records.RC01.first.score),2);
   await page.goto(base+'applied-science.html');await page.waitForSelector('#select-all');await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent==='All progress saved to your account.');
   assert.deepEqual(await page.evaluate(()=>Object.keys(window.AppliedPrototype.state.progress.records)),[applied.questions[0].id]);
   await page.evaluate(()=>window.AppliedPrototype.openQuestion('W02','practice'));const grade=page.locator('.question-topic .rating-badge');assert.equal(await grade.innerText(),'N');
   await grade.hover();await page.waitForSelector('#revision-rating-tooltip:not([hidden])');assert.match(await page.locator('#revision-rating-tooltip').innerText(),/No unaided scored attempt/);
   await page.keyboard.press('Escape');assert(await page.locator('#revision-rating-tooltip').isHidden());
   await grade.focus();assert(await page.locator('#revision-rating-tooltip').isVisible());await page.keyboard.press('Escape');
   await page.setViewportSize({width:390,height:844});await grade.click();assert(await page.locator('#revision-rating-tooltip').isVisible());await page.locator('#question-heading').click();assert(await page.locator('#revision-rating-tooltip').isHidden());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const q=source.questions.find(q=>q.id==='W02');for(const part of q.parts)await page.locator(`input[data-part="${part.id}"][value="${part.correctOptionId}"]`).check();await page.locator('#check-answer').click();
   await page.waitForFunction(()=>document.querySelector('#account-sync-status').textContent==='All progress saved to your account.');
   await page.evaluate(()=>window.AppliedPrototype.showProgress());assert.equal(await page.locator('[data-grade=C]').count(),2); // W01 and W02: first successful day only.
   await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'/tmp/ocr-applied-progress.png',fullPage:true});
   for(const payload of payloads)for(const event of payload.events){assert.equal(Object.keys(event).length,13);assert(!('responses'in event));assert(!('writtenText'in event));}
   await page.goto(base+'chemistry.html');await page.waitForSelector('#practice');await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent==='All progress saved to your account.');
   assert.deepEqual(await page.evaluate(()=>Object.keys(S.progress.records)),['RC01']);
   await page.goto(base+'applied-preview.html');await page.waitForSelector('#account-panel:not([hidden])');await page.locator('#continue-practice').click();await page.waitForSelector('#select-all');
   await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent==='All progress saved to your account.');
   assert.equal(await page.evaluate(()=>Object.keys(window.AppliedPrototype.state.progress.records).length),2);
   const written=source.questions.find(q=>q.interaction==='written-self-assessment'),marker='PRIVATE-STUDENT-WRITING-'+randomUUID();
   await page.evaluate(id=>window.AppliedPrototype.openQuestion(id,'practice'),written.id);await page.locator('#written-response').fill(marker);await page.locator('#check-answer').click();
   await page.locator('#self-score').fill(String(written.maxMarks));await page.locator('#save-self-score').click();
   await page.waitForFunction(()=>document.querySelector('#account-sync-status')?.textContent==='All progress saved to your account.');
   assert.equal(await page.evaluate(marker=>(Object.values(sessionStorage).join('')+Object.values(localStorage).join('')).includes(marker),marker),false);
   assert(!JSON.stringify(payloads).includes(marker));
   await page.evaluate(()=>window.AppliedPrototype.openQuestion('W03'));
   await page.screenshot({path:'/tmp/ocr-applied-preview.png',fullPage:true});
   await page.setViewportSize({width:390,height:844});await page.locator('.question-topic .rating-badge').click();
   await page.screenshot({path:'/tmp/ocr-rating-mobile.png',fullPage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);
  });
  await t.test('revoking subject authority removes class access and results immediately for the existing session',async()=>{
   ok(await admin.connection.rpc('staff_manage',{action:'revoke_subject',payload:{user_id:appliedTeacher.id,subject_id:'applied-science'}}));
   assert.equal(ok(await appliedTeacher.connection.from('learning_attempts').select('*')).length,0);
   assert.equal(ok(await appliedTeacher.connection.from('school_classes').select('*')).length,0);
  });
 }finally{
  if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
  if(previewFolder)await fs.rm(previewFolder,{recursive:true,force:true});
  for(const cls of classes)await root.from('school_classes').delete().eq('id',cls);
  for(const id of users.reverse())await root.auth.admin.deleteUser(id);
  for(const c of clients)c.auth.stopAutoRefresh();
 }
});
