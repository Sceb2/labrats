'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const {provisionStudent,generatePassword,generateUsername}=require('../scripts/account-service.cjs');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY,container=process.env.SUPABASE_TEST_DB_CONTAINER;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local stack only');assert.match(container,/^ocr-db-[a-f0-9]{10}$/);
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,opts),ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data};
const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8'}).trim();
test('operator fixture renames logins without changing passwords or results and seeds a repeatable week',async()=>{
 const ids=[],password=generatePassword();let client,pack;
 try{
  for(let n=0;n<12;n++)ids.push(await provisionStudent(root,{username:generateUsername(),password}));
  const bank=require('../questions.json'),q=bank.questions[0],original=require('../src/learning-events.cjs').makeEvent(bank,q,{mode:'practice'},'submit',{score:q.maxMark},require('node:crypto').randomUUID);
  ok(await root.from('learning_attempts').insert({...original,student_id:ids[0],subject_id:'chemistry'}));
  const passwordHashes=sql("select id,md5(encrypted_password) from auth.users order by id;");

  const guard=sql("select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure);");
  sql(fs.readFileSync('supabase/operator/rename-fictional-students.sql','utf8'));
  assert.equal(sql("select id,md5(encrypted_password) from auth.users order by id;"),passwordHashes);
  assert.equal(sql("select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure);"),guard);
  assert.equal(ok(await root.from('learning_attempts').select('event_id').eq('event_id',original.event_id)).length,1);
  const profiles=ok(await root.from('account_profiles').select('*').eq('role','student'));assert.equal(profiles.length,12);assert(profiles.every(p=>/^fictional-[a-z]{2,20}$/.test(p.username)));
  client=createClient(url,key,opts);ok(await client.auth.signInWithPassword({email:profiles[0].username+'@students.invalid',password}));
  assert((await root.auth.admin.updateUserById(profiles[0].user_id,{email:'different@students.invalid'})).error,'identity protection must still apply after rename');
  const users=profiles.map(p=>p.user_id).sort();assert.deepEqual(users,[...ids].sort());
  pack=ok(await root.from('flashcard_packs').insert({subject_id:'chemistry',topic_id:'basic',title:'Fictional local fixture pack',status:'published'}).select('id').single()).id;
  ok(await root.from('flashcard_cards').insert({pack_id:pack,card_id:'sample',content_version:1,front:'Fictional question',back:'Fictional answer'}));
  const run=()=>sql(fs.readFileSync('supabase/operator/seed-fictional-week.sql','utf8'));
  run();const counts=sql('select count(*),count(distinct student_id) from public.learning_attempts;');run();assert.equal(sql('select count(*),count(distinct student_id) from public.learning_attempts;'),counts);
  assert(Number(sql('select count(*) from public.flashcard_attempts;'))>0);
  const sorted=[...profiles].sort((a,b)=>a.username.localeCompare(b.username));
  const ratings=require('../src/adaptive.cjs').ratings,b= require('../questions.json');
  const strong=ok(await root.from('learning_attempts').select('*').eq('student_id',sorted[0].user_id).eq('subject_id','chemistry'));assert(Object.values(ratings(b,strong)).some(r=>r.grade==='A'));
  const burst=ok(await root.from('learning_attempts').select('*').eq('student_id',sorted[4].user_id).eq('subject_id','chemistry'));assert(!Object.values(ratings(b,burst)).some(r=>['A','B'].includes(r.grade)));
  assert(Number(counts.split('|')[0])>100);assert.equal(Number(counts.split('|')[1]),10);
  const temporal=sql('select bool_and(attempted_at<=now()) from public.learning_attempts;');assert.equal(temporal,'t');
  assert.equal(sql("select count(*) from public.school_classes where label like 'Fictional%example week';"),'2');
  sql(fs.readFileSync('supabase/operator/rename-fictional-students.sql','utf8'));assert.deepEqual(ok(await root.from('account_profiles').select('username').eq('role','student')).map(p=>p.username).sort(),profiles.map(p=>p.username).sort());
  assert.equal(sql("select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure);"),guard);
  console.log('Twelve renamed student logins; two fictional classes; '+counts+' question events/students; reruns preserve names and event counts.');
 }finally{await client?.auth.signOut();for(const id of ids)await root.auth.admin.deleteUser(id);if(pack){await root.from('flashcard_cards').delete().eq('pack_id',pack);await root.from('flashcard_packs').delete().eq('id',pack)}sql("delete from public.school_classes where label like 'Fictional%example week';")}
});
