'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const {generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const {makeEvent}=require('../src/learning-events.cjs'),Adaptive=require('../src/adaptive.cjs');
const chemistry=require('../questions.json'),applied=require('../applied-science/learning-bank.json');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Disposable local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,options);
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const args=(id,channel='questions',bank=chemistry)=>({target_class:id,channel,compatible_versions:channel==='flashcards'?['flashcards-1']:[bank.meta.bankVersion,...bank.meta.compatibleBankVersions||[]],scoring:channel==='flashcards'?'flashcards-1':bank.meta.scoringVersion});
test('class summaries preserve adaptive ratings, latest unaided marks and strict live class/subject permissions',async t=>{
 const users=[],classes=[],clients=[],packs=[],events=[];let browser,site;
 const client=()=>{const c=createClient(url,key,options);clients.push(c);return c;};
 async function staff(role){const email=generateUsername()+'@staff.invalid',password=generatePassword(),id=ok(await root.auth.admin.createUser({email,password,email_confirm:true})).user.id;users.push(id);ok(await root.from('account_profiles').insert({user_id:id,role,must_change_password:false}));const c=client();ok(await c.auth.signInWithPassword({email,password}));return {id,email,password,c};}
 const add=(student,bank,q,days,score,extra={})=>{
  const e={...makeEvent(bank,q,{mode:'practice'},'submit',{score},randomUUID),student_id:student,subject_id:bank.meta.subjectId||'chemistry',attempted_at:new Date(Date.now()-days*Adaptive.DAY).toISOString(),...extra};events.push(e);return e;
 };
 try{
  const admin=await staff('admin'),teacher=await staff('teacher'),otherTeacher=await staff('teacher');
  for(const [label,subject_id]of [['Cohort A','chemistry'],['Other class','chemistry'],['Applied cohort','applied-science'],['Empty class','chemistry']])classes.push(ok(await root.from('school_classes').insert({label,subject_id}).select('id').single()).id);
  ok(await root.from('staff_subjects').insert([{teacher_id:teacher.id,subject_id:'chemistry'},{teacher_id:otherTeacher.id,subject_id:'applied-science'}]));
  ok(await root.from('class_teachers').insert([{teacher_id:teacher.id,class_id:classes[0]},{teacher_id:otherTeacher.id,class_id:classes[2]}]));
  const students=[];
  for(let i=0;i<4;i++){const id=await provisionStudent(root,{username:generateUsername(),password:generatePassword()});users.push(id);students.push(id);}
  ok(await root.from('class_students').insert([...students.slice(0,3).map(student_id=>({class_id:classes[0],student_id})),{class_id:classes[1],student_id:students[3]},{class_id:classes[2],student_id:students[0]}]));
  const q=chemistry.questions.find(q=>q.enabled!==false&&q.maxMark>=2),q2=chemistry.questions.find(other=>other.enabled!==false&&other.id!==q.id);
  add(students[0],chemistry,q,6,0);add(students[0],chemistry,q,2,1);add(students[0],chemistry,q,1,q.maxMark);
  for(let n=0;n<4;n++)add(students[0],chemistry,q,.1+n*.001,q.maxMark);
  for(const days of [2,1,.1])add(students[0],chemistry,q2,days,q2.maxMark);
  const failed=add(students[1],chemistry,q,.1,0);
  add(students[1],chemistry,q,.09,q.maxMark,{encounter_id:failed.encounter_id,sequence:2});
  add(students[1],chemistry,q,.05,q.maxMark,{is_retry:true});
  add(students[2],chemistry,q,0,q.maxMark,{answer_revealed:true});
  add(students[2],chemistry,q,-.02,q.maxMark); // Beyond the five-minute clock allowance.
  add(students[3],chemistry,q,.1,q.maxMark);
  add(students[0],applied,applied.questions[0],.1,0);
  ok(await root.from('learning_attempts').insert(events));

  await t.test('server evidence matches student grades while repeated same-day work and retries cannot dominate',async()=>{
   const data=ok(await teacher.c.rpc('class_progress_summary',args(classes[0])));
   assert.equal(data.student_count,3);assert.equal(data.evidence.length,3);assert.equal(data.subject_id,'chemistry');
   for(const id of students.slice(0,3)){
    const local=Adaptive.ratings(chemistry,events.filter(e=>e.student_id===id&&e.subject_id==='chemistry'),Date.parse(data.as_of));
    for(const row of data.evidence.filter(e=>e.student_id===id)){
     assert(Math.abs(row.accuracy-local[row.question_id].accuracy)<1e-12);
     assert.equal(row.evidence_days,local[row.question_id].evidenceDays);
     const projected=Adaptive.ratingFromEvidence({accuracy:row.accuracy,evidenceDays:row.evidence_days,lastAt:Date.parse(row.last_at)},Date.parse(data.as_of));
     for(const field of ['grade','lastAt','dueAt','weight','evidenceDays'])assert.equal(projected[field],local[row.question_id][field]);
    }
   }
   assert.equal(data.evidence.find(e=>e.student_id===students[1]).latest_fraction,0);
   assert(!data.evidence.some(e=>e.student_id===students[2]||e.student_id===students[3]));
   assert(!JSON.stringify(data).includes('encounter_id'));assert(!JSON.stringify(data).includes('event_id'));
   assert.equal(ok(await admin.c.rpc('class_progress_summary',args(classes[3]))).student_count,0);
  });
  await t.test('a class grant cannot expose another class or subject, and student/guest calls are denied',async()=>{
   assert((await teacher.c.rpc('class_progress_summary',args(classes[1]))).error);
   assert((await teacher.c.rpc('class_progress_summary',args(classes[2],'questions',applied))).error);
   assert((await otherTeacher.c.rpc('class_progress_summary',args(classes[0]))).error);
   assert.equal(ok(await otherTeacher.c.rpc('class_progress_summary',args(classes[2],'questions',applied))).evidence.length,1);
   assert((await admin.c.rpc('class_progress_summary',args(randomUUID()))).error);
   assert((await admin.c.rpc('class_progress_summary',{...args(classes[0]),channel:'untrusted'})).error);
   assert((await client().rpc('class_progress_summary',args(classes[0]))).error);
   ok(await root.auth.admin.updateUserById(students[0],{password:'Fictional-login-password-739'}));
   const student=client(),username=ok(await root.from('account_profiles').select('username').eq('user_id',students[0]).single()).username;
   ok(await student.auth.signInWithPassword({email:username+'@students.invalid',password:'Fictional-login-password-739'}));
   assert((await student.rpc('class_progress_summary',args(classes[0]))).error);
  });
  await t.test('flashcard summaries include current published versions only, with separate subject scope',async()=>{
   const pack=ok(await root.from('flashcard_packs').insert({subject_id:'chemistry',topic_id:'basic',title:'Cohort cards',owner_id:admin.id,status:'published'}).select('id').single()).id;packs.push(pack);
   const cards=ok(await root.from('flashcard_cards').insert([{pack_id:pack,card_id:'recall',content_version:1,is_current:false,front:'Old front',back:'Old answer'},{pack_id:pack,card_id:'recall',content_version:2,is_current:true,front:'Current front',back:'PRIVATE CARD BACK'}]).select('*'));
   const fb=require('../src/flashcards.cjs').learningBank('chemistry',cards.map(c=>({...c,topic_id:'basic'})));
   for(const question of fb.questions)ok(await root.from('flashcard_attempts').insert({...makeEvent(fb,question,{mode:'practice'},'submit',{score:0},randomUUID),student_id:students[0],subject_id:'chemistry'}));
   const data=ok(await teacher.c.rpc('class_progress_summary',args(classes[0],'flashcards')));
   assert.equal(data.cards.length,1);assert.equal(data.cards[0].title,'Current front');assert.equal(data.evidence.length,1);
   assert(!JSON.stringify(data).includes('PRIVATE CARD BACK'));assert(!data.evidence.some(e=>e.question_id.endsWith('@1')));
   const science=ok(await otherTeacher.c.rpc('class_progress_summary',args(classes[2],'flashcards',applied)));
   assert.equal(science.cards.length,0);assert.equal(science.evidence.length,0);
   ok(await root.from('flashcard_packs').update({status:'archived'}).eq('id',pack));
   assert.equal(ok(await teacher.c.rpc('class_progress_summary',args(classes[0],'flashcards'))).evidence.length,0);
   ok(await root.from('flashcard_packs').update({status:'published'}).eq('id',pack));
  });
  await t.test('connected class UI uses compact RPCs and discards delayed reports after switching class/subject',async()=>{
   const siteRoot=path.resolve(__dirname,'..');
   site=http.createServer(async(req,res)=>{try{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html',file=path.resolve(siteRoot,rel);if(!file.startsWith(siteRoot+path.sep)||rel.startsWith('.'))throw Error('Invalid path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(rel==='auth-config.json'?JSON.stringify({supabaseUrl:url,publishableKey:key}):await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
   await new Promise(resolve=>site.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:900}}),historyReads=[],errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/rest\/v1\/(learning|flashcard)_attempts/.test(r.url()))historyReads.push(r.url());});
   await page.goto('http://127.0.0.1:'+site.address().port+'/staff.html');await page.locator('#staff-email').fill(admin.email);await page.locator('#staff-password').fill(admin.password);await page.locator('#staff-login-form button').click();
   await page.waitForSelector('.staff-page-nav');await page.locator('.staff-page-nav [data-staff-page=cohort]:visible').click();await page.locator('[data-class="'+classes[0]+'"]').click();await page.waitForSelector('.cohort-topics');
   assert.match(await page.locator('.cohort-stats').innerText(),/Students contributing\s+2\s*\/\s*3/);
   await page.locator('#cohort-tab-flashcards').click();await page.waitForFunction(()=>document.querySelector('#cohort-results')?.textContent.includes('Self-reported flashcard recall'));
   assert.match(await page.locator('#cohort-results').innerText(),/Current front/);
   await page.locator('#cohort-tab-questions').click();await page.waitForSelector('.cohort-topics');
   await page.route('**/rest/v1/rpc/class_progress_summary',async route=>{if(route.request().postDataJSON().target_class===classes[0])await new Promise(r=>setTimeout(r,250));await route.continue();});
   await page.locator('[data-class="'+classes[1]+'"]').click();await page.waitForSelector('.cohort-topics');
   const delayed=page.waitForRequest(r=>r.url().includes('/rpc/class_progress_summary')&&r.postDataJSON().target_class===classes[0]);
   await page.locator('[data-class="'+classes[0]+'"]').click();await delayed;await page.locator('[data-class="'+classes[1]+'"]').click();
   await page.waitForFunction(()=>document.querySelector('.cohort-stats')?.textContent.includes('Students contributing'));
   assert.match(await page.locator('.cohort-stats').innerText(),/Students contributing\s+1\s*\/\s*1/);
   await page.locator('#staff-subject').selectOption('applied-science');await page.waitForSelector('.cohort-topics');
   assert.equal(await page.locator('#staff-subject').inputValue(),'applied-science');assert.match(await page.locator('.cohort-stats').innerText(),/Students contributing\s+1\s*\/\s*1/);
   assert.deepEqual(historyReads,[]);assert.deepEqual(errors,[]);
  });
  await t.test('grant removal, password gates and session revocation apply to existing tokens',async()=>{
   ok(await root.from('staff_subjects').delete().eq('teacher_id',teacher.id));assert((await teacher.c.rpc('class_progress_summary',args(classes[0]))).error);
   ok(await root.from('staff_subjects').insert({teacher_id:teacher.id,subject_id:'chemistry'}));
   ok(await root.from('account_profiles').update({must_change_password:true}).eq('user_id',teacher.id));assert((await teacher.c.rpc('class_progress_summary',args(classes[0]))).error);
   ok(await root.from('account_profiles').update({must_change_password:false}).eq('user_id',teacher.id));
   const token=ok(await teacher.c.auth.getSession()).session.access_token;ok(await teacher.c.auth.signOut());
   const replay=createClient(url,key,{...options,global:{headers:{Authorization:'Bearer '+token}}});assert((await replay.rpc('class_progress_summary',args(classes[0]))).error);
  });
 }finally{
  await browser?.close();if(site)await new Promise(resolve=>site.close(resolve));
  for(const c of clients)await c.auth.signOut();for(const id of users)await root.auth.admin.deleteUser(id);
  for(const id of packs){await root.from('flashcard_cards').delete().eq('pack_id',id);await root.from('flashcard_packs').delete().eq('id',id);}
  for(const id of classes)await root.from('school_classes').delete().eq('id',id);
 }
});
