'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const {provisionStudent,generatePassword,generateUsername}=require('../scripts/account-service.cjs');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY,container=process.env.SUPABASE_TEST_DB_CONTAINER;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Disposable local stack only');
assert.match(container||'',/^ocr-db-[a-f0-9]{10}$/);
const opts={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,opts);
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const quote=value=>"'"+value.replaceAll("'","''")+"'";
test('reviewed launch cleanup keeps two working logins, preserves staff/content/history and refuses stale inventories',async()=>{
 const users=[],classes=[],clients=[],password=generatePassword();let pack;
 const template=fs.readFileSync('supabase/operator/launch-test-accounts.sql','utf8');
 const manifest=()=>sql(`select format('insert into reviewed_students values (%L,%L,%L);',user_id,username,
  case user_id when '${users[0]}'::uuid then 'keep_chemistry' when '${users[1]}'::uuid then 'keep_applied' else 'delete' end)
  from public.account_profiles where role='student' order by user_id;`)+ '\n'+
  sql("select format('insert into reviewed_classes values (%L,%L,%L);',id,label,subject_id) from public.school_classes order by id;");
 const script=statements=>template.replace('-- END OF REVIEWED INSERT STATEMENTS.',statements+'\n-- END OF REVIEWED INSERT STATEMENTS.');
 try{
  for(let n=0;n<4;n++)users.push(await provisionStudent(root,{username:generateUsername(),password}));
  const staff=ok(await root.auth.admin.createUser({email:generateUsername()+'@staff.invalid',password,email_confirm:true})).user.id;users.push(staff);
  ok(await root.from('account_profiles').insert({user_id:staff,role:'admin',must_change_password:false}));
  for(const subject of ['chemistry','applied-science'])classes.push(ok(await root.from('school_classes').insert({label:'Old fictional '+subject,subject_id:subject}).select('id').single()).id);
  for(const id of users.slice(0,4))ok(await root.from('class_students').insert({class_id:classes[0],student_id:id}));
  pack=ok(await root.from('flashcard_packs').insert({owner_id:staff,subject_id:'chemistry',topic_id:'basic',title:'Keep teacher content'}).select('id').single()).id;
  ok(await root.from('flashcard_cards').insert({pack_id:pack,card_id:'sample',content_version:1,front:'Question',back:'Answer'}));
  const bank=require('../questions.json'),q=bank.questions[0],event=require('../src/learning-events.cjs').makeEvent(bank,q,{mode:'practice'},'submit',{score:q.maxMark},require('node:crypto').randomUUID);
  for(const id of [users[0],users[2]])ok(await root.from('learning_attempts').insert({...event,student_id:id,subject_id:'chemistry'}));
  const guard=sql("select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure);");
  const before=sql('select id,md5(encrypted_password) from auth.users order by id;');
  assert.throws(()=>sql(template),/Choose exactly one/);assert.equal(sql('select id,md5(encrypted_password) from auth.users order by id;'),before);
  const reviewed=manifest();
  const newStudent=await provisionStudent(root,{username:generateUsername(),password});users.push(newStudent);
  assert.throws(()=>sql(script(reviewed)),/Student inventory changed/);
  assert.equal(ok(await root.from('account_profiles').select('user_id').eq('role','student')).length,5);
  ok(await root.auth.admin.deleteUser(newStudent));
  assert.throws(()=>sql(script(reviewed.replace(/insert into reviewed_classes[^\n]+\n?/,''))),/Class inventory changed/);
  assert.throws(()=>sql(script(reviewed+`\ninsert into reviewed_students values (${quote(staff)},'not-a-student','delete');`)),/Student inventory changed/);
  // A failure after the delete statement must still roll all deletion back.
  const conflict=ok(await root.auth.admin.createUser({email:'fictional-chemistry@students.invalid',password,email_confirm:true})).user.id;users.push(conflict);
  assert.throws(()=>sql(script(reviewed)),/duplicate key/);
  assert.equal(ok(await root.from('account_profiles').select('user_id').eq('role','student')).length,4);
  assert.equal(sql("select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure);"),guard);
  ok(await root.auth.admin.deleteUser(conflict));
  const hashes=sql(`select id,md5(encrypted_password) from auth.users where id in ('${users[0]}','${users[1]}') order by id;`);
  const dates=sql(`select user_id,created_at,first_login_at,retention_managed from public.account_profiles where user_id in ('${users[0]}','${users[1]}') order by user_id;`);
  sql(script(reviewed));
  assert.equal(sql(`select id,md5(encrypted_password) from auth.users where id in ('${users[0]}','${users[1]}') order by id;`),hashes);
  assert.equal(sql(`select user_id,created_at,first_login_at,retention_managed from public.account_profiles where user_id in ('${users[0]}','${users[1]}') order by user_id;`),dates);
  assert.equal(sql("select pg_get_functiondef('app_private.protect_student_identity()'::regprocedure);"),guard);
  const rows=ok(await root.from('school_classes').select('*,class_students(student_id)')).sort((a,b)=>a.subject_id.localeCompare(b.subject_id));
  assert.equal(rows.length,2);assert(rows.every(c=>c.label.startsWith('TEST CLASS — ')&&c.class_students.length===1));
  assert.equal(rows.find(c=>c.subject_id==='chemistry').class_students[0].student_id,users[0]);
  assert.equal(rows.find(c=>c.subject_id==='applied-science').class_students[0].student_id,users[1]);
  assert.equal(ok(await root.from('account_profiles').select('user_id').eq('role','student')).length,2);
  assert.equal(ok(await root.from('learning_attempts').select('student_id')).length,1);
  assert.equal(ok(await root.from('account_profiles').select('role').eq('user_id',staff).single()).role,'admin');
  assert.equal(ok(await root.from('flashcard_packs').select('owner_id').eq('id',pack).single()).owner_id,staff);
  assert.equal(ok(await root.from('flashcard_cards').select('card_id').eq('pack_id',pack)).length,1);
  sql(script(manifest()));assert.equal(ok(await root.from('school_classes').select('id')).length,2);
  for(const username of ['fictional-chemistry','fictional-applied']){
   const client=createClient(url,key,opts);clients.push(client);ok(await client.auth.signInWithPassword({email:username+'@students.invalid',password}));
  }
  assert((await root.auth.admin.updateUserById(users[0],{email:'wrong@students.invalid'})).error);
 }finally{
  for(const client of clients)await client.auth.signOut();
  if(pack){await root.from('flashcard_cards').delete().eq('pack_id',pack);await root.from('flashcard_packs').delete().eq('id',pack);}
  for(const id of users)await root.auth.admin.deleteUser(id);
  for(const id of classes)await root.from('school_classes').delete().eq('id',id);
  sql("delete from public.school_classes where id in (md5('labrats-launch-test-chemistry')::uuid,md5('labrats-launch-test-applied')::uuid);");
 }
});
