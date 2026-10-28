'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js'),{generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const F=require('../src/flashcards.cjs'),E=require('../src/learning-events.cjs'),A=require('../src/adaptive.cjs'),sample=require('../flashcards/sample-pack.json');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Disposable local Supabase only.');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,options),anon=createClient(url,key,options);
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
test('flashcard publishing, private drafts, versioned recall and class/subject permissions',async t=>{
 const users=[],clients=[],packs=[],classes=[];let admin,teacher,other,student,studentId,pack,bank,first;
 async function staff(role){const email=generateUsername()+'@staff.invalid',password=generatePassword(),u=ok(await root.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(u.id);ok(await root.from('account_profiles').insert({user_id:u.id,role,must_change_password:false}));const c=createClient(url,key,options);clients.push(c);ok(await c.auth.signInWithPassword({email,password}));return {id:u.id,c};}
 const cards=sample.cards.slice(0,4).map(c=>({id:c.card_id,topic:c.topic_id,front:c.front,back:c.back}));
 const importPack=(actor,extra={})=>actor.rpc('manage_flashcard_pack',{action:'import',payload:{title:'Fictional flashcards',subject_id:'chemistry',topic_id:'basic',change_kind:'new_version',cards,...extra}});
 const op=(actor,action,p)=>actor.rpc('manage_flashcard_pack',{action,payload:{pack_id:p.id,expected_revision:p.revision}});
 try{
  admin=await staff('admin');teacher=await staff('teacher');other=await staff('teacher');
  await t.test('subject grants, ownership and private drafts are enforced in the database',async()=>{
   assert((await importPack(teacher.c)).error);
   for(const who of [teacher,other])ok(await admin.c.rpc('staff_manage',{action:'grant_subject',payload:{user_id:who.id,subject_id:'chemistry'}}));
   pack=ok(await importPack(teacher.c));packs.push(pack.id);
   assert.equal(ok(await anon.from('flashcard_packs').select('id,title,status')).length,0);
   assert.equal(ok(await other.c.from('flashcard_packs').select('id,title,status')).length,0);
   assert((await anon.from('flashcard_pack_drafts').select('*')).error);
   assert((await anon.from('flashcard_packs').select('owner_id')).error);
   assert((await teacher.c.from('flashcard_packs').select('owner_id')).error);
   assert.equal(ok(await teacher.c.rpc('staff_flashcard_packs',{subject:'chemistry'}))[0].owner_id,teacher.id);
   assert.equal(ok(await other.c.from('flashcard_pack_drafts').select('*')).length,0);
   assert((await op(other.c,'publish',pack)).error);
   assert((await teacher.c.from('flashcard_packs').update({owner_id:other.id}).eq('id',pack.id)).error);
   pack=ok(await op(teacher.c,'publish',pack));
   assert.equal(ok(await anon.from('flashcard_cards').select('*').eq('pack_id',pack.id)).length,4);
  });
  await t.test('editing keeps published text available, checks stale revisions and retains minor-correction identities',async()=>{
   const changed=cards.map((c,i)=>i?c:{...c,back:'Corrected draft text'});
   let draft=ok(await importPack(teacher.c,{pack_id:pack.id,expected_revision:pack.revision,change_kind:'minor',cards:changed}));
   assert((await op(teacher.c,'publish',pack)).error,'stale revision must fail');
   assert.equal(ok(await anon.from('flashcard_cards').select('*').eq('pack_id',pack.id).eq('card_id',cards[0].id).single()).back,cards[0].back);
   pack=ok(await op(teacher.c,'publish',draft));
   const published=ok(await anon.from('flashcard_cards').select('*').eq('pack_id',pack.id).eq('card_id',cards[0].id).single());assert.equal(published.back,'Corrected draft text');assert.equal(published.content_version,1);
  });
  await t.test('only one pack per topic can publish and a different subject cannot be managed',async()=>{
   const competitor=ok(await importPack(other.c));packs.push(competitor.id);assert((await op(other.c,'publish',competitor)).error);
   assert((await importPack(teacher.c,{subject_id:'applied-science',topic_id:'WA01',cards:[{id:'x',topic:'WA01',front:'x',back:'x'}]})).error);
  });
  const username=generateUsername(),password=generatePassword();studentId=await provisionStudent(root,{username,password:generatePassword()});users.push(studentId);ok(await root.auth.admin.updateUserById(studentId,{password}));student=createClient(url,key,options);clients.push(student);ok(await student.auth.signInWithPassword({email:username+'@students.invalid',password}));
  await t.test('self-assessments sync separately, duplicate safely and exclude retry credit',async()=>{
   const current=ok(await anon.from('flashcard_cards').select('*').eq('pack_id',pack.id));bank=F.learningBank('chemistry',current.map(c=>({...c,topic_id:'basic'})));
   const session={mode:'practice'};first=E.makeEvent(bank,bank.questions[0],session,'submit',{score:0},randomUUID);const retry=E.makeEvent(bank,bank.questions[0],session,'submit',{score:1},randomUUID);
   ok(await student.rpc('sync_flashcard_attempts',{events:[first,retry],expected_student:studentId}));ok(await student.rpc('sync_flashcard_attempts',{events:[first,retry],expected_student:studentId}));
   assert.equal(ok(await student.from('flashcard_attempts').select('*')).length,2);assert.equal(ok(await student.from('learning_attempts').select('*')).length,0);
   assert.equal(A.ratings(bank,[first,retry])[first.question_id].grade,'E');
   for(const extra of [{responses:{answer:'private'}},{front:'private'},{subject_id:'applied-science'}])assert((await student.rpc('sync_flashcard_attempts',{events:[{...first,...extra}],expected_student:studentId})).error);
   assert((await student.rpc('sync_flashcard_attempts',{events:[first],expected_student:teacher.id})).error);
   assert((await student.rpc('sync_flashcard_attempts',{events:[{...retry,event_id:randomUUID(),sequence:3}],expected_student:studentId})).error);
   assert((await student.from('flashcard_attempts').delete().eq('student_id',studentId)).error);
  });
  await t.test('teachers need the student class as well as the subject; removing access applies to existing sessions',async()=>{
   assert.equal(ok(await teacher.c.from('flashcard_attempts').select('*')).length,0);
   const cls=ok(await teacher.c.rpc('staff_manage',{action:'create_class',payload:{label:'Fictional flashcard class',subject_id:'chemistry'}})).id;classes.push(cls);
   ok(await admin.c.rpc('staff_manage',{action:'enrol_student',payload:{class_id:cls,user_id:studentId}}));
   assert.equal(ok(await teacher.c.from('flashcard_attempts').select('*')).length,2);assert.equal(ok(await other.c.from('flashcard_attempts').select('*')).length,0);
   assert((await anon.from('flashcard_attempts').select('*')).error);
   ok(await admin.c.rpc('staff_manage',{action:'revoke_subject',payload:{user_id:teacher.id,subject_id:'chemistry'}}));
   assert.equal(ok(await teacher.c.from('flashcard_attempts').select('*')).length,0);assert((await op(teacher.c,'archive',pack)).error);
   ok(await admin.c.rpc('staff_manage',{action:'grant_subject',payload:{user_id:teacher.id,subject_id:'chemistry'}}));
  });
  await t.test('new versions reset current-card evidence, while archived cards/history and offline uploads are retained',async()=>{
   const changed=cards.map((c,i)=>i?c:{...c,front:'A new learning requirement'});pack=ok(await importPack(teacher.c,{pack_id:pack.id,expected_revision:pack.revision,cards:changed}));pack=ok(await op(teacher.c,'publish',pack));
   const current=ok(await anon.from('flashcard_cards').select('*').eq('pack_id',pack.id));assert.equal(current.find(c=>c.card_id===cards[0].id).content_version,2);
   const newbank=F.learningBank('chemistry',current.map(c=>({...c,topic_id:'basic'})));assert.equal(A.ratings(newbank,[first])[F.identity(current.find(c=>c.card_id===cards[0].id))].grade,'N');
   pack=ok(await op(teacher.c,'archive',pack));assert.equal(ok(await anon.from('flashcard_cards').select('*').eq('pack_id',pack.id)).length,0);
   const delayed=E.makeEvent(bank,bank.questions[1],{mode:'practice'},'submit',{score:1},randomUUID);ok(await student.rpc('sync_flashcard_attempts',{events:[delayed],expected_student:studentId}));assert.equal(ok(await student.from('flashcard_attempts').select('*')).length,3);
  });
 }finally{
  for(const id of classes)await root.from('school_classes').delete().eq('id',id);
  if(studentId)await root.from('flashcard_attempts').delete().eq('student_id',studentId);
  for(const id of packs){await root.from('flashcard_pack_drafts').delete().eq('pack_id',id);await root.from('flashcard_cards').delete().eq('pack_id',id);await root.from('flashcard_packs').delete().eq('id',id);}
  for(const id of users.reverse())await root.auth.admin.deleteUser(id);for(const c of clients)c.auth.stopAutoRefresh();
 }
});
