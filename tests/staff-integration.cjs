'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const {makeEvent}=require('../src/learning-events.cjs'),bank=require('../questions.json');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Disposable local Auth required.');
const staffService=process.env.SUPABASE_TEST_STAFF_SERVICE_URL||url;
if(!['127.0.0.1','localhost'].includes(new URL(staffService).hostname))throw Error('Disposable local staff service required.');
const options={auth:{persistSession:false,autoRefreshToken:false}},root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,options);
const ok=result=>{assert.equal(result.error,null,result.error?.message);return result.data;};
test('staff prototype enforces invitations, class scope, private provisioning and resets',async t=>{
 const users=[],classes=[],clients=[];
 const client=()=>{const c=createClient(url,key,options);clients.push(c);return c;};
 const api=async(c,action,fields={},request_id=randomUUID(),origin)=>{
  const {data:{session}}=await c.auth.getSession();
  const response=await fetch(staffService+'/functions/v1/staff-management',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{}),...(origin?{Origin:origin}:{})},body:JSON.stringify({action,request_id,...fields})});
  return {status:response.status,body:await response.json()};
 };
 let admin,teacher,teacherId,firstClass,otherClass,credentials,student,studentId,oldSession;
 try{
  await t.test('staff password setup gates all staff permissions',async()=>{
   const email=generateUsername()+'@staff.invalid',password=generatePassword();
   const {user}=ok(await root.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);
   ok(await root.from('account_profiles').insert({user_id:user.id,role:'admin'}));admin=client();
   ok(await admin.auth.signInWithPassword({email,password}));assert.ok((await admin.rpc('staff_context')).error);
   assert.ok((await admin.rpc('staff_manage',{action:'create_class',payload:{label:'Not permitted yet'}})).error);
   ok(await admin.auth.updateUser({password:generatePassword()}));assert.equal(ok(await admin.rpc('staff_context')).role,'admin');
  });
  await t.test('administrator creates a private one-time staff invitation without SMTP',async()=>{
   firstClass=ok(await admin.rpc('staff_manage',{action:'create_class',payload:{label:'Fictional class A'}})).id;classes.push(firstClass);
   otherClass=ok(await admin.rpc('staff_manage',{action:'create_class',payload:{label:'Fictional class B'}})).id;classes.push(otherClass);
   const email=generateUsername()+'@staff.invalid',result=await api(admin,'invite_teacher',{email});
   assert.equal(result.status,200,JSON.stringify(result.body));assert.ok(result.body.invitation_code);teacher=client();
   const verified=ok(await teacher.auth.verifyOtp({token_hash:result.body.invitation_code,type:'recovery'}));teacherId=verified.user.id;users.push(teacherId);
   assert.ok((await teacher.rpc('staff_context')).error);assert.ok((await teacher.rpc('staff_directory')).error);
   assert.ok((await client().auth.verifyOtp({token_hash:result.body.invitation_code,type:'recovery'})).error);
   ok(await teacher.auth.updateUser({password:generatePassword()}));assert.equal(ok(await teacher.rpc('staff_context')).role,'teacher');
   ok(await admin.rpc('staff_manage',{action:'assign_teacher',payload:{class_id:firstClass,user_id:teacherId}}));
   const existing=await api(admin,'invite_teacher',{email});assert.notEqual(existing.status,200);
   assert.equal(ok(await root.from('account_profiles').select('role').eq('user_id',teacherId).single()).role,'teacher');
  });
  await t.test('unassigned classes, staff invitations and administrator writes are denied to teachers',async()=>{
   assert.deepEqual(ok(await teacher.from('school_classes').select('id')).map(c=>c.id),[firstClass]);
   assert.equal((await api(teacher,'create_students',{class_id:otherClass,count:1})).status,403);
   assert.equal((await api(teacher,'invite_teacher',{email:generateUsername()+'@staff.invalid'})).status,403);
   assert.ok((await teacher.rpc('staff_manage',{action:'assign_teacher',payload:{class_id:otherClass,user_id:teacherId}})).error);
   assert.ok((await teacher.from('account_profiles').update({role:'admin'}).eq('user_id',teacherId)).error);
   assert.ok((await teacher.rpc('staff_authorize',{actor:teacherId,session:randomUUID(),action:'invite_teacher'})).error);
  });
  await t.test('batch credentials are private, bounded and idempotent',async()=>{
   const request=randomUUID(),result=await api(teacher,'create_students',{class_id:firstClass,count:2},request);
   assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.complete,true);credentials=result.body.credentials;assert.equal(credentials.length,2);
   const rows=ok(await root.from('account_profiles').select('*').in('username',credentials.map(c=>c.username)));users.push(...rows.map(row=>row.user_id));studentId=rows.find(row=>row.username===credentials[0].username).user_id;
   for(const row of rows){assert.equal(row.role,'student');assert.equal(row.must_change_password,true);}
   assert.equal((await api(teacher,'create_students',{class_id:firstClass,count:2},request)).status,409);
   assert.equal(ok(await teacher.from('class_students').select('*')).length,2);
   assert.equal((await api(teacher,'create_students',{class_id:firstClass,count:101})).status,400);
   assert.equal((await api(teacher,'create_students',{class_id:firstClass,count:1,student_email:'forbidden@example.invalid'})).status,400);
   const receipts=ok(await root.from('staff_actions').select('*').eq('actor',teacherId));
   for(const credential of credentials)assert.equal(JSON.stringify(receipts).includes(credential.temporary_password),false);
  });
  await t.test('students and invalid origins cannot call the privileged service',async()=>{
   student=client();ok(await student.auth.signInWithPassword({email:credentials[0].username+'@students.invalid',password:credentials[0].temporary_password}));
   assert.equal((await api(student,'create_students',{class_id:firstClass,count:1})).status,403);
   assert.equal((await api(client(),'create_students',{class_id:firstClass,count:1})).status,401);
   assert.equal((await api(teacher,'create_students',{class_id:firstClass,count:1},randomUUID(),'https://untrusted.invalid')).status,403);
   ok(await student.auth.updateUser({password:generatePassword()}));oldSession=(await student.auth.getSession()).data.session;
   const event=makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:2},randomUUID);
   ok(await student.rpc('sync_learning_attempts',{events:[event],expected_student:studentId}));
  });
  await t.test('shared account progress is visible only after administrator class assignment',async()=>{
   const email=generateUsername()+'@staff.invalid',password=generatePassword(),{user}=ok(await root.auth.admin.createUser({email,password,email_confirm:true}));users.push(user.id);
   ok(await root.from('account_profiles').insert({user_id:user.id,role:'teacher',must_change_password:false}));const other=client();ok(await other.auth.signInWithPassword({email,password}));
   ok(await admin.rpc('staff_manage',{action:'assign_teacher',payload:{class_id:otherClass,user_id:user.id}}));
   assert.equal(ok(await other.from('learning_attempts').select('*')).length,0);
   assert.equal((await api(other,'reset_student',{user_id:studentId})).status,403);
   ok(await admin.rpc('staff_manage',{action:'enrol_student',payload:{class_id:otherClass,user_id:studentId}}));
   assert.equal(ok(await other.from('learning_attempts').select('*')).length,1);
   assert.equal(ok(await teacher.from('learning_attempts').select('*')).length,1);
   const directory=ok(await admin.rpc('staff_directory'));assert.ok(directory.every(row=>row.role!=='student'&&row.email));
   assert.ok((await other.rpc('staff_directory')).error);
  });
  await t.test('teacher reset revokes sessions and forces a new password without deleting progress',async()=>{
   const reset=await api(teacher,'reset_student',{user_id:studentId});assert.equal(reset.status,200,JSON.stringify(reset.body));
   assert.equal(reset.body.username,credentials[0].username);
   const stale=createClient(url,key,{...options,global:{headers:{Authorization:'Bearer '+oldSession.access_token}}});
   assert.equal(ok(await stale.from('learning_attempts').select('*')).length,0);
   const next=client();ok(await next.auth.signInWithPassword({email:credentials[0].username+'@students.invalid',password:reset.body.temporary_password}));
   assert.equal(ok(await next.from('learning_attempts').select('*')).length,0);
   ok(await next.auth.updateUser({password:generatePassword()}));assert.equal(ok(await next.from('learning_attempts').select('*')).length,1);
   assert.equal((await api(teacher,'delete_student',{user_id:studentId,confirm_username:credentials[0].username})).status,403);
  });
  await t.test('overlapping resets cannot reopen the password gate or overwrite each other',async()=>{
   const ctx=ok(await teacher.rpc('staff_context')),operation=randomUUID(),scope={actor:ctx.user_id,session:ctx.session_id,target:studentId,staff:false};
   ok(await root.rpc('staff_prepare_reset',{...scope,operation}));
   const duplicate=await root.rpc('staff_prepare_reset',{...scope,operation:randomUUID()});assert.equal(duplicate.error.code,'55006');
   ok(await root.auth.admin.updateUserById(studentId,{password:generatePassword()}));
   const pending=ok(await root.from('account_profiles').select('active,must_change_password').eq('user_id',studentId).single());assert.equal(pending.active,false);assert.equal(pending.must_change_password,true);
   assert.ok((await root.rpc('staff_finish_reset',{...scope,operation:randomUUID()})).error);
   ok(await root.rpc('staff_finish_reset',{...scope,operation}));
   const complete=ok(await root.from('account_profiles').select('active,must_change_password').eq('user_id',studentId).single());assert.equal(complete.active,true);assert.equal(complete.must_change_password,true);
  });
  await t.test('draft retention is administrator-only and disabled staff sessions fail immediately',async()=>{
   assert.equal(ok(await admin.from('school_policy').select('*').single()).retention_days,null);
   assert.ok((await teacher.rpc('staff_manage',{action:'set_retention',payload:{days:180}})).error);
   ok(await admin.rpc('staff_manage',{action:'set_retention',payload:{days:180}}));assert.equal(ok(await admin.from('school_policy').select('*').single()).retention_days,180);
   assert.ok((await admin.rpc('staff_manage',{action:'set_retention',payload:{days:0}})).error);
   ok(await admin.rpc('staff_manage',{action:'set_active',payload:{user_id:teacherId,active:false}}));
   assert.equal((await api(teacher,'create_students',{class_id:firstClass,count:1})).status,403);
   assert.equal(ok(await teacher.from('learning_attempts').select('*')).length,0);
   assert.ok((await admin.rpc('staff_manage',{action:'set_active',payload:{user_id:(await admin.auth.getUser()).data.user.id,active:false}})).error);
  });
  await t.test('administrator deletion requires exact confirmation and removes results and every membership',async()=>{
   assert.equal((await api(admin,'delete_student',{user_id:studentId,confirm_username:'wrong'})).status,400);
   const result=await api(admin,'delete_student',{user_id:studentId,confirm_username:credentials[0].username});assert.equal(result.status,200,JSON.stringify(result.body));
   assert.equal(ok(await root.from('learning_attempts').select('*').eq('student_id',studentId)).length,0);
   assert.equal(ok(await root.from('class_students').select('*').eq('student_id',studentId)).length,0);
  });
 }finally{for(const c of clients)await c.auth.signOut();for(const id of classes)await root.from('school_classes').delete().eq('id',id);for(const id of users)await root.auth.admin.deleteUser(id);}
});
