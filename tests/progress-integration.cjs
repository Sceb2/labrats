'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {createClient} = require('@supabase/supabase-js');
const {generateUsername,generatePassword,provisionStudent,resetStudent} = require('../scripts/account-service.cjs');
const {studentEmail} = require('../src/student-identity.cjs');
const {makeEvent} = require('../src/learning-events.cjs');
const bank = require('../questions.json');
const url=process.env.SUPABASE_TEST_URL, key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw Error('Use a disposable local stack.');
const opts={auth:{persistSession:false,autoRefreshToken:false}}, admin=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,opts);
const ok=result=>{assert.equal(result.error,null,result.error?.message);return result.data;};
test('learning data permissions, validation, deduplication and activity windows',async t=>{
  const users=[], classes=[], clients=[];
  try {
    const credentials=[0,1].map(()=>({username:generateUsername(),password:generatePassword()}));
    for(const credential of credentials){
      users.push(await provisionStudent(admin,credential));
      const c=createClient(url,key,opts);ok(await c.auth.signInWithPassword({email:studentEmail(credential.username),password:credential.password}));clients.push(c);
    }
    const [a,b]=clients, events=()=>makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:2},randomUUID);
    const upload=(c,event,student=users[0])=>c.rpc('sync_learning_attempts',{events:[event],expected_student:student});
    const first=events();
    await t.test('first-login gate is enforced on the server',async()=>{
      assert.ok((await upload(a,first)).error);
      for(const c of clients)ok(await c.auth.updateUser({password:generatePassword()}));
    });
    await t.test('unknown fields, raw answers, invalid marks, clocks and mismatched owners are rejected',async()=>{
      for(const change of [{response:'do not retain'},{earned_marks:3},{earned_marks:null},{maximum_marks:3},{question_id:'absent'},
        {attempted_at:'2100-01-01T00:00:00Z'},{sequence:1.5}]) assert.ok((await upload(a,{...events(),...change})).error);
      assert.ok((await upload(a,events(),users[1])).error);
      assert.equal(ok(await a.from('learning_attempts').select('*')).length,0);
    });
    await t.test('lost acknowledgements can be retried without duplicate counts',async()=>{
      assert.deepEqual(ok(await upload(a,first)),[first.event_id]);
      assert.deepEqual(ok(await upload(a,first)),[first.event_id]);
      assert.equal(ok(await a.from('learning_attempts').select('*')).length,1);
      assert.ok((await upload(a,{...first,earned_marks:1})).error);
    });
    await t.test('students cannot read another student, write rows directly, or edit history',async()=>{
      assert.equal(ok(await b.from('learning_attempts').select('*')).length,0);
      assert.ok((await b.from('learning_attempts').insert({...first,student_id:users[0]})).error);
      assert.ok((await a.from('learning_attempts').update({earned_marks:0}).eq('event_id',first.event_id)).error);
      assert.ok((await a.from('learning_attempts').delete().eq('event_id',first.event_id)).error);
      assert.ok((await createClient(url,key,opts).from('learning_attempts').select('*')).error);
    });
    await t.test('recent correct counts exclude reveals, retries and partial marks',async()=>{
      const session={mode:'practice'};
      for(const event of [makeEvent(bank,bank.questions[0],session,'reveal',null,randomUUID),
        makeEvent(bank,bank.questions[0],session,'submit',{score:2},randomUUID),
        makeEvent(bank,bank.questions[0],session,'submit',{score:2},randomUUID),
        makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:1},randomUUID)])ok(await upload(a,event));
      const windows=ok(await a.rpc('student_activity_windows',{target:users[0]}));
      for(const row of windows){assert.equal(row.correct_attempts,1);assert.equal(row.distinct_questions,1);}
    });
    await t.test('only assigned teachers can read history and activity counts',async()=>{
      const password=generatePassword(),email=`${generateUsername()}@staff.invalid`;
      const teacher=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(teacher.id);
      ok(await admin.from('account_profiles').insert({user_id:teacher.id,role:'teacher',must_change_password:false}));
      const c=createClient(url,key,opts);clients.push(c);ok(await c.auth.signInWithPassword({email,password}));
      assert.equal(ok(await c.from('learning_attempts').select('*')).length,0);
      const cls=ok(await admin.from('school_classes').insert({label:'Fictional sync class'}).select('id').single());classes.push(cls.id);
      ok(await admin.from('class_students').insert({class_id:cls.id,student_id:users[0]}));
      ok(await admin.from('staff_subjects').insert({teacher_id:teacher.id,subject_id:'chemistry'}));
      ok(await admin.from('class_teachers').insert({class_id:cls.id,teacher_id:teacher.id}));
      assert.equal(ok(await c.from('learning_attempts').select('*')).length,5);
      assert.equal(ok(await c.rpc('student_activity_windows',{target:users[0]}))[0].correct_attempts,1);
    });
    await t.test('reset sessions and inactive accounts cannot read or upload learning data',async()=>{
      ok(await admin.from('account_profiles').update({active:false}).eq('user_id',users[0]));
      assert.ok((await upload(a,events())).error);assert.equal(ok(await a.from('learning_attempts').select('*')).length,0);
      ok(await admin.from('account_profiles').update({active:true}).eq('user_id',users[0]));
      await resetStudent(admin,credentials[0].username,generatePassword());
      assert.ok((await upload(a,events())).error);assert.equal(ok(await a.from('learning_attempts').select('*')).length,0);
    });
  }finally{
    for(const c of clients)await c.auth.signOut();
    for(const id of classes)await admin.from('school_classes').delete().eq('id',id);
    for(const id of users)await admin.auth.admin.deleteUser(id);
  }
});
