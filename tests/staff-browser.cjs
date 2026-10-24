'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright'),{createClient}=require('@supabase/supabase-js');
const {generateUsername,generatePassword}=require('../scripts/account-service.cjs');
const {buildStaffPreview}=require('../scripts/build-staff.cjs'),{buildSitePreview}=require('../scripts/build-site-preview.cjs');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Use disposable local Auth only.');
const root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=result=>{assert.equal(result.error,null,result.error?.message);return result.data;};
test('staff and learner previews complete the invitation, class, reporting and reset workflow',async t=>{
 let folder,server,browser;const users=[],classes=[];
 const email=generateUsername()+'@staff.invalid',password=generatePassword(),teacherEmail=generateUsername()+'@staff.invalid';
 const {user}=ok(await root.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);
 ok(await root.from('account_profiles').insert({user_id:user.id,role:'admin'}));
 try{
  folder=await fs.mkdtemp(path.join(os.tmpdir(),'ocr-staff-browser-'));
  const staffFile=path.join(folder,'staff.html'),studentFile=path.join(folder,'student.html');
  buildStaffPreview({supabaseUrl:url,publishableKey:key},staffFile);buildSitePreview({supabaseUrl:url,publishableKey:key},studentFile);
  const documents={'/staff.html':await fs.readFile(staffFile),'/student.html':await fs.readFile(studentFile)};
  server=http.createServer((req,res)=>{const body=documents[new URL(req.url,'http://localhost').pathname];if(!body){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html');res.end(body);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const admin=await browser.newPage(),teacher=await browser.newPage({viewport:{width:390,height:844}}),student=await browser.newPage();
  const errors=[],violations=[];for(const p of [admin,teacher,student]){p.setDefaultTimeout(20000);p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/Content Security Policy|Refused to/.test(m.text()))violations.push(m.text());});}
  teacher.on('dialog',d=>d.accept());
  let teacherId,credential,studentId,question,invitation;
  let failed;const check=async(name,fn)=>{await t.test(name,async()=>{try{await fn();}catch(error){failed=error;throw error;}});if(failed)throw Error('Staff flow stopped after failed check.');};
  const ready=p=>p.waitForFunction(()=>document.querySelector('#staff-status').textContent.startsWith('Staff tools ready'));
  const savePassword=async p=>{const next=generatePassword().slice(0,10);await p.locator('#staff-new-password').fill(next);await p.locator('#staff-confirm-password').fill(next);await p.locator('#staff-password-form button').click();await p.waitForFunction(()=>document.querySelector('#staff-status').textContent.includes('Password saved'));};
  await check('administrator finishes password setup and creates a class and student accounts',async()=>{
   await admin.goto(base+'/staff.html');await admin.locator('#staff-email').fill(email);await admin.locator('#staff-password').fill(password);await admin.locator('#staff-login-form button').click();await admin.waitForSelector('#staff-password-panel:not([hidden])');await savePassword(admin);
   await admin.locator('#new-class-label').fill('Fictional prototype class');await admin.locator('#create-class-form button').click();await admin.waitForSelector('#class-picker');await ready(admin);
   classes.push(await admin.locator('#class-picker').inputValue());await admin.locator('#batch-count').fill('1');
   const response=admin.waitForResponse(r=>r.url().endsWith('/functions/v1/staff-management')&&r.request().postDataJSON()?.action==='create_students');
   await admin.locator('#batch-students-form button').click();const data=await(await response).json();assert.equal(data.complete,true);credential=data.credentials[0];await ready(admin);
   studentId=ok(await root.from('account_profiles').select('user_id').eq('username',credential.username).single()).user_id;users.push(studentId);
   assert.ok((await admin.locator('#private-output-content').innerText()).includes(credential.temporary_password));
   const stored=await admin.evaluate(()=>Object.values(sessionStorage).join('')+Object.values(localStorage).join(''));assert.equal(stored.includes(credential.temporary_password),false);
  });
  await check('invited teacher chooses a password and sees only assigned classes',async()=>{
   await admin.locator('#invite-email').fill(teacherEmail);await admin.locator('#invite-teacher-form button').click();await admin.waitForSelector('#invitation-code');invitation=await admin.locator('#invitation-code').innerText();await ready(admin);
   await teacher.goto(base+'/staff.html');await teacher.locator('#staff-login details > summary').click();await teacher.locator('#staff-invite-code').fill(invitation);await teacher.locator('#staff-invite-form button').click();await teacher.waitForSelector('#staff-password-panel:not([hidden])');await savePassword(teacher);
   assert.equal(await teacher.locator('#class-picker').count(),0);assert.equal(await teacher.locator('#invite-teacher-form').count(),0);
   const directory=ok(await root.auth.admin.listUsers());teacherId=directory.users.find(u=>u.email===teacherEmail).id;users.push(teacherId);
   await admin.locator('#subject-teacher').selectOption(teacherId);await admin.locator('#subject-access-form button').click();await ready(admin);
   await admin.locator('#assign-user').selectOption(teacherId);await admin.locator('#assign-member-form button').click();await ready(admin);
   await teacher.locator('#staff-refresh').click();await ready(teacher);assert.equal(await teacher.locator('#class-picker option').count(),1);
   assert.ok((await teacher.locator('#staff-tools').innerText()).includes(credential.username));
   const stored=await teacher.evaluate(()=>Object.values(sessionStorage).join('')+Object.values(localStorage).join(''));assert.equal(stored.includes(invitation),false);assert.equal(stored.includes(credential.username),false);
  });
  await check('learner defaults to adaptive practice and the teacher sees matching marks and A–E guidance',async()=>{
   await student.goto(base+'/student.html');await student.locator('#username').fill(credential.username);await student.locator('#password').fill(credential.temporary_password);await student.locator('#login-form button').click();await student.waitForSelector('#password-form:not([hidden])');
   const next=generatePassword().slice(0,10);await student.locator('#new-password').fill(next);await student.locator('#confirm-password').fill(next);await student.locator('#password-form button').click();await student.locator('#continue-practice').click();await student.waitForSelector('#practice');
   await student.locator('[data-topic="alcohols"]').check();await student.locator('.practice-settings > summary').click();assert.equal(await student.locator('#practice-style').inputValue(),'adaptive');
   for(const type of ['multistep','mechanism-id','mechanism-completion','sites','nomenclature','product'])await student.locator(`[data-type="${type}"]`).uncheck();
   await student.locator('#celebration-effects').uncheck();await student.locator('#practice').click();await student.waitForSelector('#submit');assert.equal(await student.evaluate(()=>S.session.selection),'adaptive');
   question=await student.evaluate(()=>current());
   for(const [index,component] of question.components.entries()){const answer=index===0?component.options.find(id=>!question.validMethods.some(m=>m.answers[component.id]?.includes(id))):question.validMethods[0].answers[component.id][0];await student.locator('#'+component.id).selectOption(answer);}
   await student.locator('#submit').click();await student.waitForFunction(()=>document.querySelector('#account-sync-status').textContent==='All progress saved to your account.');
   const grade=await student.locator('.question-topic .rating-badge').getAttribute('data-grade');assert.ok('ABCDE'.includes(grade));
   await teacher.locator(`[data-report="${studentId}"]`).click();await teacher.waitForFunction(()=>document.querySelector('#staff-status').textContent==='Student progress loaded.');
   await teacher.locator('#student-report details > summary').click();
   const row=teacher.locator('#student-report details tr').filter({hasText:question.id+' ·'});assert.equal(await row.locator('.rating-badge').getAttribute('data-grade'),grade);
   assert.ok((await teacher.locator('#student-report').innerText()).includes('0 correct'));
   assert.equal(await teacher.evaluate(()=>Object.values(sessionStorage).join('').includes('earned_marks')),false);
  });
  await check('teacher resets the student account and the old learner session loses access',async()=>{
   await teacher.locator(`[data-reset="${studentId}"]`).click();await teacher.waitForFunction(()=>document.querySelector('#private-output-title').textContent==='Private temporary password');await ready(teacher);
   await student.evaluate(()=>window.dispatchEvent(new Event('online')));await student.waitForFunction(()=>document.querySelector('#account-sync-status').textContent.includes('Sign in again'));assert.equal(await student.locator('main').isVisible(),false);
   assert.equal(ok(await root.from('account_profiles').select('must_change_password').eq('user_id',studentId).single()).must_change_password,true);
  });
  await check('disabling a teacher removes their displayed student data and sign-out clears private details',async()=>{
   await admin.locator(`[data-active="${teacherId}"]`).click();await ready(admin);
   await teacher.locator('#staff-refresh').click();await teacher.waitForSelector('#staff-login:not([hidden])');
   assert.equal(await teacher.locator('#staff-tools').innerText(),'');assert.equal(await teacher.locator('#private-output').isVisible(),false);
   await admin.locator('#staff-sign-out').click();await admin.waitForSelector('#staff-login:not([hidden])');
   assert.equal(await admin.locator('#private-output-content').innerText(),'');assert.equal(await admin.locator('#staff-tools').innerText(),'');
   assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);
  });
 }finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));if(folder)await fs.rm(folder,{recursive:true,force:true});for(const id of classes)await root.from('school_classes').delete().eq('id',id);for(const id of users)await root.auth.admin.deleteUser(id);}
});
