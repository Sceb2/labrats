'use strict';
// Build-only fictional adapter. This entry is never included in staff.js.
const {start}=require('./staff-app.cjs'),{makeEvent}=require('./learning-events.cjs');
const chemistry=require('../questions.json'),applied=require('../applied-science/learning-bank.json'),F=require('./flashcards.cjs');
const role=new URLSearchParams(location.search).get('role')==='teacher'?'teacher':'admin';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=id(role==='admin'?1:2),now=Date.now();
const studentNames=['marvellous-goat','funky-chicken','brave-otter','bright-fox','calm-panda','clever-robin'];
const profiles=studentNames.map((username,i)=>({user_id:id(i+10),role:'student',username,active:true,must_change_password:i===3,last_login_at:i===3?null:new Date(now-i*3600000).toISOString()}));
const staff=[{user_id:id(1),role:'admin',email:'admin@school.invalid',active:true,must_change_password:false},{user_id:id(2),role:'teacher',email:'chemistry@school.invalid',active:true,must_change_password:false},{user_id:id(3),role:'teacher',email:'science@school.invalid',active:true,must_change_password:false}];
const classes=[{id:id(100),label:'12 Chemistry A',subject_id:'chemistry'},{id:id(101),label:'13 Chemistry A',subject_id:'chemistry'},{id:id(102),label:'12 Applied Science',subject_id:'applied-science'}];
if(new URLSearchParams(location.search).has('many'))for(let n=0;n<8;n++)classes.push({id:id(110+n),label:'Extra class '+(n+1),subject_id:'chemistry'});
const members=classes.flatMap(c=>profiles.map(p=>({class_id:c.id,student_id:p.user_id})));
const packs=[{id:id(200),subject_id:'chemistry',topic_id:'basic',owner_id:id(2),title:'Organic names & formulae',status:'published',revision:1}];
const cards=[{pack_id:id(200),card_id:'functional-group',content_version:1,is_current:true,question_id:id(200)+'/functional-group@1',front:'Name the –COOH functional group.',back:'Carboxylic acid'}];
const fb=F.learningBank('chemistry',cards.map(c=>({...c,topic_id:'basic'})));
const events=[];for(const p of profiles)for(const b of [chemistry,applied,fb])for(let i=0;i<Math.min(8,b.questions.length);i++){
 const q=b.questions[i],e=makeEvent(b,q,{mode:'practice'},'submit',{score:i%3===0?0:q.maxMark});events.push({...e,student_id:p.user_id,subject_id:b.meta.subjectId||'chemistry',attempted_at:new Date(now-(i+1)*86400000).toISOString(),received_at:new Date(now).toISOString()});
}
let enabled=false,signedIn=true;
const extensions=new Map();
const tables={school_classes:classes,class_students:members,account_profiles:profiles,staff_subjects:[{teacher_id:id(2),subject_id:'chemistry'},{teacher_id:id(2),subject_id:'applied-science'},{teacher_id:id(3),subject_id:'applied-science'}],learning_attempts:events.filter(e=>e.bank_version!=='flashcards-1'),flashcard_attempts:events.filter(e=>e.bank_version==='flashcards-1'),flashcard_packs:packs,flashcard_cards:cards,flashcard_pack_drafts:[],retention_runs:[{started_at:new Date(now).toISOString(),finished_at:new Date(now).toISOString(),status:'disabled',deleted_students:0,deleted_staff:0,failures:0}]};
function query(table){
 let filters=[],orders=[],offset=0,count=Infinity,single=false;
 const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},in(k,vs){filters.push(r=>vs.includes(r[k]));return q},order(k,{ascending=true}={}){orders.push([k,ascending]);return q},range(a,b){offset=a;count=b-a+1;return q},limit(n){count=n;return q},single(){single=true;return q},maybeSingle(){single=true;return q},then(resolve,reject){return Promise.resolve().then(()=>{let rows=(tables[table]||[]).filter(r=>filters.every(fn=>fn(r)));rows.sort((a,b)=>{for(const [k,asc]of orders){const d=String(a[k]??'').localeCompare(String(b[k]??''));if(d)return asc?d:-d}return 0});rows=rows.slice(offset,offset+count);return {data:single?rows[0]||null:rows,error:null}}).then(resolve,reject)}};return q;
}
const profile=()=>({...staff.find(s=>s.user_id===owner),active:signedIn,username:null});
const client={from:query,auth:{getUser:async()=>({data:{user:{id:owner,email:profile().email}},error:null}),getSession:async()=>({data:{session:signedIn?{access_token:'fictional-preview'}:null},error:null}),signInWithPassword:async()=>{signedIn=true;return {error:null}},verifyOtp:async()=>({error:{message:'Use the fictional role controls above.'}}),updateUser:async()=>({error:null})},async rpc(name,args={}){
 let data;
 if(name==='staff_context')data={user_id:owner,role,session_id:id(500)};
 else if(name==='staff_directory')data=staff;
 else if(name==='retention_status')data={enabled,overdue:0,unmanaged:2,last_run:tables.retention_runs[0]};
 else if(name==='retention_accounts')data=[...profiles.map(p=>({user_id:p.user_id,label:p.username,role:'student',managed:true,first_login_at:p.last_login_at,due_at:new Date(now+600*86400000).toISOString(),...extensions.get(p.user_id)})),...staff.map(p=>({user_id:p.user_id,label:p.email,role:p.role,managed:true}))];
 else if(name==='retention_manage'){if(role!=='admin')return {error:{code:'42501'}};if(args.action==='enable')enabled=true;if(args.action==='extend')extensions.set(args.payload.user_id,{extension_until:args.payload.until_at,extension_reason:args.payload.reason});if(args.action==='retire_staff')return {error:{message:'Fictional preview: staff offboarding is not performed.'}};data=null;}
 else if(name==='staff_flashcard_packs')data=packs.filter(p=>p.subject_id===args.subject);
 else if(name==='student_subject_activity_windows')data=[1,7,30].map(days=>({days,correct_attempts:days===1?0:4,distinct_questions:days===1?0:4}));
 else if(name==='staff_manage'){const p=args.payload;if(args.action==='create_class'){const c={id:crypto.randomUUID(),label:p.label,subject_id:p.subject_id};classes.push(c);data={id:c.id}}else return {error:{message:'Fictional preview: access and account changes are not performed.'}};}
 else return {error:{message:'Fictional preview: publication and server changes are not performed.'}};
 return {data,error:null};
}};
const factory=async()=>({client,url:'https://preview.invalid',key:'sb_publishable_fictional_preview',prefix:'preview-',profile:async()=>profile(),signOut:async()=>{signedIn=false},async staffOperation(action,fields){
 if(action==='create_students'){const credentials=[];for(let n=0;n<fields.count;n++){const user_id=crypto.randomUUID(),username='preview-'+['otter','robin','panda','fox','goat','chicken'][n%6]+'-'+(n+1);profiles.push({user_id,username,role:'student',active:true,must_change_password:true,last_login_at:null});members.push({class_id:fields.class_id,student_id:user_id});credentials.push({username,temporary_password:'DEMO-not-a-real-password'})}return {credentials,complete:true};}
 if(action==='invite_teacher')return {email:fields.email,invitation_code:'DEMONSTRATION-CODE-NOT-VALID'};
 if(action==='reset_student'||action==='reset_staff')return {username:profiles.find(p=>p.user_id===fields.user_id)?.username||null,temporary_password:'DEMO-not-a-real-password'};
 throw Error('Fictional preview: account deletion is not performed.');
}});
const toolbar=document.createElement('aside');toolbar.className='staff-demo-toolbar';toolbar.innerHTML=`<strong>Fictional preview · No live connection</strong><nav aria-label="Preview role"><a href="?role=teacher" ${role==='teacher'?'aria-current="page"':''}>Teacher</a><a href="?role=admin" ${role==='admin'?'aria-current="page"':''}>Administrator</a></nav>`;document.body.prepend(toolbar);
start(factory);
