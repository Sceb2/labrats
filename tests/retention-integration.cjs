'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {execFileSync}=require('node:child_process');
const {generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const {makeEvent}=require('../src/learning-events.cjs'),bank=require('../questions.json');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Disposable local stack only.');
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,opts);
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data};
const sql=input=>{const c=process.env.SUPABASE_TEST_DB_CONTAINER;assert.match(c,/^ocr-db-[a-f0-9]{10}$/);return execFileSync('docker',['exec','-i',c,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8'}).trim()};
test('retention lifecycle is privileged, bounded, recoverable and deletes complete accounts',async t=>{
 const users=[],clients=[],classes=[];let pack;
 async function staff(role){const email=generateUsername()+'@staff.invalid',password=generatePassword();const user=ok(await root.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(user.id);ok(await root.from('account_profiles').insert({user_id:user.id,role,must_change_password:false}));const c=createClient(url,key,opts);clients.push(c);ok(await c.auth.signInWithPassword({email,password}));return {id:user.id,c}};
 async function student(){const username=generateUsername(),password=generatePassword(),id=await provisionStudent(root,{username,password});users.push(id);return {id,username,password}};
 const update=async(id,fields)=>ok(await root.from('account_profiles').update(fields).eq('user_id',id));
 const manage=(c,action,payload)=>c.rpc('retention_manage',{action,payload});
 try{
  const admin=await staff('admin'),teacher=await staff('teacher'),s=await student();
  await t.test('disabled by default; teachers/students cannot run cleanup or change policy',async()=>{
   assert.equal(ok(await root.rpc('run_retention_cleanup')).status,'disabled');
   assert((await teacher.c.rpc('run_retention_cleanup')).error);assert((await teacher.c.rpc('retention_status')).error);
   assert((await manage(teacher.c,'enable',{confirmed:true})).error);assert((await manage(admin.c,'enable',{})).error);
   ok(await manage(admin.c,'enable',{confirmed:true}));
  });
  const c=createClient(url,key,opts);clients.push(c);
  await t.test('first successful login is set once and survives password changes and reset cycles',async()=>{
   assert.equal(ok(await root.from('account_profiles').select('first_login_at').eq('user_id',s.id).single()).first_login_at,null);
   ok(await c.auth.signInWithPassword({email:s.username+'@students.invalid',password:s.password}));
   const first=ok(await root.from('account_profiles').select('*').eq('user_id',s.id).single()).first_login_at;assert(first);
   s.password=generatePassword();ok(await c.auth.updateUser({password:s.password}));
   ok(await c.auth.signInWithPassword({email:s.username+'@students.invalid',password:s.password}));
   assert.equal(ok(await root.from('account_profiles').select('first_login_at').eq('user_id',s.id).single()).first_login_at,first);
   assert((await manage(c,'extend',{user_id:s.id,until_at:'2030-01-01',reason:'x'})).error);
  });
  await t.test('calendar-year expiry, unused accounts, extensions and historical exclusions are independent',async()=>{
   await update(s.id,{first_login_at:'2024-02-29T12:00:00Z'});
   let row=ok(await admin.c.rpc('retention_accounts')).find(a=>a.user_id===s.id);assert.equal(Date.parse(row.due_at),Date.parse('2026-02-28T12:00:00Z'));
   ok(await manage(admin.c,'extend',{user_id:s.id,until_at:'2030-01-01T00:00:00Z',reason:'Repeat year'}));
   row=ok(await admin.c.rpc('retention_accounts')).find(a=>a.user_id===s.id);assert.equal(row.extension_reason,'Repeat year');
   assert((await manage(admin.c,'extend',{user_id:s.id,until_at:'2029-01-01',reason:'Shorter'})).error);
   assert((await manage(admin.c,'extend',{user_id:s.id,until_at:'2031-01-01',reason:''})).error);
  });
  const unused=await student(),legacy=await student(),expired=await student();
  await update(unused.id,{created_at:new Date(Date.now()-91*86400000).toISOString()});
  await update(legacy.id,{retention_managed:false,created_at:'2020-01-01T00:00:00Z'});
  await update(expired.id,{first_login_at:'2020-01-01T00:00:00Z'});
  const cls=ok(await root.from('school_classes').insert({label:'Retention fixture'}).select('id').single()).id;classes.push(cls);
  ok(await root.from('class_students').insert({class_id:cls,student_id:expired.id}));
  const event=makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:0},randomUUID);
  ok(await root.from('learning_attempts').insert({...event,student_id:expired.id,subject_id:'chemistry'}));
  pack=ok(await root.from('flashcard_packs').insert({subject_id:'chemistry',topic_id:'basic',title:'Retention fixture',owner_id:teacher.id}).select('id').single()).id;
  const card=ok(await root.from('flashcard_cards').insert({pack_id:pack,card_id:'example',content_version:1,front:'q',back:'a'}).select('*').single());
  ok(await root.from('flashcard_attempts').insert({...event,event_id:randomUUID(),student_id:expired.id,question_id:card.question_id,bank_version:'flashcards-1',scoring_version:'flashcards-1',maximum_marks:1,subject_id:'chemistry'}));
  await t.test('weekly worker deletes Auth, sessions, classes and both attempt histories but preserves excluded/extended accounts',async()=>{
   const result=ok(await root.rpc('run_retention_cleanup'));assert.equal(result.status,'success');assert.equal(result.deleted_students,2);
   for(const id of [expired.id,unused.id])assert.equal(ok(await root.from('account_profiles').select('*').eq('user_id',id)).length,0);
   assert.equal(ok(await root.from('learning_attempts').select('*').eq('student_id',expired.id)).length,0);
   assert.equal(ok(await root.from('flashcard_attempts').select('*').eq('student_id',expired.id)).length,0);
   assert.equal(ok(await root.from('class_students').select('*').eq('student_id',expired.id)).length,0);
   assert((await root.auth.admin.getUserById(expired.id)).error);
   assert.equal(ok(await root.rpc('run_retention_cleanup')).deleted_students,0);
   assert.equal(ok(await root.from('account_profiles').select('*').in('user_id',[s.id,legacy.id])).length,2);
  });
  await t.test('staff offboarding requires handover, transfers content, blocks reactivation and deletes within 30 days',async()=>{
   assert((await manage(admin.c,'retire_staff',{user_id:teacher.id,successor:admin.id,reason:'Left'})).error);
   ok(await manage(admin.c,'retire_staff',{user_id:teacher.id,successor:admin.id,reason:'Left school',handover_confirmed:true}));
   assert((await teacher.c.rpc('staff_context')).error);
   assert.equal(ok(await root.from('flashcard_packs').select('owner_id').eq('id',pack).single()).owner_id,admin.id);
   assert((await admin.c.rpc('staff_manage',{action:'set_active',payload:{user_id:teacher.id,active:true}})).error);
   sql(`update app_private.staff_departures set departed_at=now()-interval '24 days' where user_id='${teacher.id}';`);
   assert.equal(ok(await root.rpc('run_retention_cleanup')).deleted_staff,1);
   assert.equal(ok(await root.from('flashcard_packs').select('id').eq('id',pack)).length,1);
  });
  await t.test('expired staff invitations cannot be accepted and abandoned accounts are deleted',async()=>{
   const email=generateUsername()+'@staff.invalid',password=generatePassword(),u=ok(await root.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(u.id);
   ok(await root.from('account_profiles').insert({user_id:u.id,role:'teacher'}));
   await update(u.id,{staff_invited_at:new Date(Date.now()-8*86400000).toISOString()});
   const pending=createClient(url,key,opts);clients.push(pending);assert((await pending.auth.signInWithPassword({email,password})).error);
   await update(u.id,{staff_invited_at:new Date(Date.now()-24*86400000).toISOString()});
   assert.equal(ok(await root.rpc('run_retention_cleanup')).deleted_staff,1);
  });
  await t.test('failed deletion is recorded and retryable without losing other history',async()=>{
   const blocked=await student();await update(blocked.id,{created_at:'2020-01-01T00:00:00Z'});
   sql(`create function app_private.retention_failure_fixture() returns trigger language plpgsql as $$ begin if old.id='${blocked.id}' then raise exception 'Fictional test failure';end if;return old;end;$$;
    create trigger retention_failure_fixture before delete on auth.users for each row execute function app_private.retention_failure_fixture();`);
   try{const failed=ok(await root.rpc('run_retention_cleanup'));assert.equal(failed.status,'failed');assert.equal(failed.failures,1);assert.equal(ok(await root.from('account_profiles').select('user_id').eq('user_id',blocked.id)).length,1)}
   finally{sql('drop trigger retention_failure_fixture on auth.users;drop function app_private.retention_failure_fixture();')}
   const retry=ok(await root.rpc('run_retention_cleanup'));assert.equal(retry.status,'success');assert.equal(retry.deleted_students,1);
   assert((await manage(admin.c,'extend',{user_id:s.id,until_at:'infinity',reason:'Invalid unbounded extension'})).error);
  });
  await t.test('audit cleanup removes old entries without retaining student references',async()=>{
   ok(await root.from('staff_actions').insert({actor:admin.id,request_id:randomUUID(),action:'old_fixture',created_at:'2020-01-01'}));
   ok(await root.rpc('run_retention_cleanup'));
   assert.equal(ok(await root.from('staff_actions').select('*').eq('action','old_fixture')).length,0);
   assert.equal(ok(await root.from('retention_runs').select('*')).some(r=>Object.hasOwn(r,'student_id')),false);
  });
 }finally{
  ok(await root.from('school_policy').update({retention_enabled:false}).eq('singleton',true));
  for(const c of clients)await c.auth.signOut();
  if(pack){await root.from('flashcard_attempts').delete().eq('question_id',pack+'/example@1');await root.from('flashcard_cards').delete().eq('pack_id',pack);await root.from('flashcard_packs').delete().eq('id',pack)}
  for(const id of users)await root.auth.admin.deleteUser(id);
  for(const id of classes)await root.from('school_classes').delete().eq('id',id);
 }
});
