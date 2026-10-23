'use strict';
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
// Used only by the disposable Docker runner before migration 006. No hosted URL
// or credentials are accepted; the fixture cannot sign in and is removed before
// the real Auth/browser checks start.
module.exports=function resetUpgradeFixture(run,container){
 assert.match(container,/^ocr-db-[a-f0-9]{10}$/);
 const student=randomUUID(),cls=randomUUID(),actor=randomUUID(),operation=randomUUID();
 const sql=input=>run(['exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{input});
 sql(`begin;
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
   values('${student}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','student-abc234def567@students.invalid','',now()-interval '1 day',now());
  insert into public.account_profiles(user_id,role,username,active,must_change_password)
   values('${student}','student','student-abc234def567',false,true);
  insert into public.school_classes(id,label) values('${cls}','Fictional upgrade fixture');
  insert into public.class_students(class_id,student_id) values('${cls}','${student}');
  insert into public.learning_attempts(student_id,event_id,encounter_id,sequence,question_id,bank_version,scoring_version,kind,earned_marks,maximum_marks,is_retry,answer_revealed,attempted_at,session_mode)
   select '${student}',gen_random_uuid(),gen_random_uuid(),1,question_id,bank_version,scoring_version,'submit',0,maximum_marks,false,false,now(),'practice'
   from public.learning_question_versions order by question_id limit 1;
  insert into app_private.pending_password_resets(target,actor,operation,started_at)
   values('${student}','${actor}','${operation}',now()-interval '3 minutes');
  commit;`);
 const snapshot=()=>sql(`select jsonb_build_object(
  'profile',(select to_jsonb(p) from public.account_profiles p where user_id='${student}'),
  'class',(select to_jsonb(c) from public.school_classes c where id='${cls}'),
  'membership',(select to_jsonb(m) from public.class_students m where student_id='${student}'),
  'history',(select jsonb_agg(to_jsonb(a)) from public.learning_attempts a where student_id='${student}'),
  'reset',(select to_jsonb(r) from app_private.pending_password_resets r where target='${student}'));`);
 const before=snapshot();
 return {
  check(){assert.equal(snapshot(),before,'Migration 006 must preserve the populated account and pending reset');},
  cleanup(){sql(`delete from auth.users where id='${student}'; delete from public.school_classes where id='${cls}';`);}
 };
};
