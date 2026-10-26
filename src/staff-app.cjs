'use strict';
const {openAccountClient} = require('./account-client.cjs');
const {validatePassword} = require('./student-identity.cjs');
const {recordsFor} = require('./learning-events.cjs');
const Adaptive = require('./adaptive.cjs');
const Badges=require('./rating-badges.cjs');
const {subjects}=require('./subjects.cjs');
Badges.installRatingTips();
let selectedSubject='chemistry',subjectAssignments=[];
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => value ? new Date(value).toLocaleString('en-GB') : 'Not yet';
let connection, profile, bank, classes=[], memberships=[], students=[], staff=[], selectedClass='', busy=false, credentials=[];
let scopeSignature='', scopeGeneration=0, verifying=false;
function status(text,error=false){$('#staff-status').textContent=text;$('#staff-status').dataset.error=String(error);}
function clearPrivate(){credentials=[];$('#private-output-content').replaceChildren();$('#private-output').hidden=true;$('#download-credentials').hidden=true;}
function loggedOut(){scopeGeneration++;scopeSignature='';profile=null;classes=[];memberships=[];students=[];staff=[];clearPrivate();$('#staff-tools').replaceChildren();$('#staff-account').hidden=true;$('#staff-login').hidden=false;$('#staff-password').value='';$('#staff-invite-code').value='';$('#staff-password-form').reset();}
async function work(action){if(busy)return;scopeGeneration++;busy=true;status('Working…');document.querySelectorAll('button').forEach(button=>button.disabled=true);try{await action();}catch(error){status(error.message||'The operation could not finish.',true);}finally{busy=false;document.querySelectorAll('button').forEach(button=>button.disabled=false);}}
function checked(result){if(result.error)throw new Error(result.error.code==='42501'?'Your staff session cannot perform this action.':result.error.message);return result.data;}
async function account(){
  profile=await connection.profile();
  if(!profile.active||!['teacher','admin'].includes(profile.role))throw Error('An active invited staff account is required.');
  const {data:{user},error}=await connection.client.auth.getUser();if(error)throw error;
  $('#staff-identity').textContent=`${user.email} · ${profile.role==='admin'?'School administrator':'Teacher'}`;
  $('#staff-login').hidden=true;$('#staff-account').hidden=false;$('#staff-password-panel').hidden=!profile.must_change_password;$('#staff-tools').hidden=profile.must_change_password;
  if(profile.must_change_password){$('#staff-tools').replaceChildren();status('Choose your own password to finish account setup.');return false;}
  checked(await connection.client.rpc('staff_context'));return true;
}
async function rows(table,order,filter){const found=[];for(let offset=0;;offset+=500){let query=connection.client.from(table).select('*').order(order).range(offset,offset+499);if(table==='class_students')query=query.order('class_id');if(filter)query=filter(query);const data=checked(await query);found.push(...data);if(data.length<500)return found;}}
const readScope=()=>Promise.all([rows('school_classes','id'),rows('class_students','student_id'),rows('account_profiles','user_id',q=>q.eq('role','student')),rows('staff_subjects','teacher_id')]);
const signature=scope=>JSON.stringify([profile.user_id,profile.role,scope[0].map(c=>[c.id,c.label]),scope[1].map(m=>[m.class_id,m.student_id]),scope[2].map(s=>s.user_id),scope[3].map(s=>[s.teacher_id,s.subject_id])]);
function applyScope(scope){subjectAssignments=scope[3];if(profile.role!=='admin'&&!subjectAssignments.some(s=>s.teacher_id===profile.user_id&&s.subject_id===selectedSubject))selectedSubject=subjectAssignments.find(s=>s.teacher_id===profile.user_id)?.subject_id||'chemistry';classes=scope[0].filter(c=>c.subject_id===selectedSubject);memberships=scope[1];students=scope[2];scopeSignature=signature(scope);if(!classes.some(c=>c.id===selectedClass))selectedClass=classes[0]?.id||'';}
async function load(){
  scopeGeneration++;
  status('Loading your classes…');
  try{if(!await account())return;}catch(error){loggedOut();throw error;}
  applyScope(await readScope());
  bank=await fetch(subjects.find(s=>s.id===selectedSubject).learningBankUrl).then(r=>{if(!r.ok)throw Error('Question catalogue unavailable.');return r.json();});
  staff=profile.role==='admin'?checked(await connection.client.rpc('staff_directory')):[];
  if(!classes.some(c=>c.id===selectedClass))selectedClass=classes[0]?.id||'';
  render();status('Staff tools ready. Student results are shown only for your permitted classes.');
}
async function manage(action,payload){checked(await connection.client.rpc('staff_manage',{action,payload}));await load();}
async function service(action,fields){
  const {data:{session},error}=await connection.client.auth.getSession();if(error||!session)throw Error('Sign in again before managing accounts.');
  const response=await fetch(connection.url+'/functions/v1/staff-management',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,apikey:connection.key,'Content-Type':'application/json'},body:JSON.stringify({action,request_id:crypto.randomUUID(),...fields}),signal:AbortSignal.timeout(180000)});
  let result;try{result=await response.json();}catch{throw Error('The staff service is unavailable. Its Edge Function must be deployed before account creation or resets.');}
  if(!response.ok)throw Error(result.error||'Check the class/account before retrying this operation.');
  return result;
}
function showPrivate(title,content,rows=[]){clearPrivate();$('#private-output-title').textContent=title;$('#private-output-content').innerHTML=content;credentials=rows;$('#download-credentials').hidden=!rows.length;$('#private-output').hidden=false;$('#private-output').scrollIntoView({behavior:'smooth',block:'start'});}
const options=(list,label)=>list.map(item=>`<option value="${esc(item.user_id)}">${esc(label(item))}</option>`).join('');
function render(){
  const admin=profile.role==='admin';
  const members=new Set(memberships.filter(m=>m.class_id===selectedClass).map(m=>m.student_id));
  const roster=students.filter(s=>members.has(s.user_id));
  $('#staff-tools').innerHTML=`<h1>${admin?'School administration':'Your classes'}</h1><label class="control">Subject<select id="staff-subject">${subjects.filter(subject=>admin||subjectAssignments.some(s=>s.teacher_id===profile.user_id&&s.subject_id===subject.id)).map(subject=>`<option value="${subject.id}" ${selectedSubject===subject.id?'selected':''}>${esc(subject.label)}</option>`).join('')}</select></label><div class="staff-grid"><section class="staff-card"><h2>Create a class</h2><p>Use a course/group label, without student names.</p><form id="create-class-form"><label class="control">Class label<input id="new-class-label" required maxlength="100"></label><button class="btn" type="submit">Create class</button></form></section>${admin?`<section class="staff-card"><h2>Invite a teacher</h2><p>Create an invitation for a school email address. No name or other staff details are required.</p><form id="invite-teacher-form"><label class="control">Teacher email<input id="invite-email" type="email" required maxlength="254"></label><button class="btn" type="submit">Create private invitation</button></form></section>`:''}</div>
  <section class="staff-card"><h2>Class accounts</h2>${classes.length?`<label class="control">Class<select id="class-picker">${classes.map(c=>`<option value="${c.id}" ${c.id===selectedClass?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label><form id="batch-students-form" class="staff-controls"><label class="control">New student accounts<input id="batch-count" type="number" min="1" max="100" value="5" required></label><button class="btn" type="submit">Generate student accounts</button></form><p>Students use random usernames, with no email addresses or names. One account can belong to several classes.</p><div class="table-wrap"><table><thead><tr><th>Student username</th><th>Account</th><th>Latest sign-in</th><th>Actions</th></tr></thead><tbody>${roster.map(s=>`<tr><td>${esc(s.username)}</td><td>${s.active?(s.must_change_password?'Choose password on next sign-in':'Ready'):'Disabled'}</td><td>${date(s.last_login_at)}</td><td><button class="btn secondary" type="button" data-report="${s.user_id}">View progress</button><button class="btn secondary" type="button" data-reset="${s.user_id}">Reset password</button></td></tr>`).join('')||'<tr><td colspan="4">No students in this class yet.</td></tr>'}</tbody></table></div>`:'<p>Create your first class to generate student accounts.</p>'}</section>
  <section id="student-report" class="staff-card" hidden></section>
  ${admin?`<section class="staff-card"><h2>Class assignments</h2><p>Administrators can assign existing accounts to additional classes. Progress stays with the same account.</p>${classes.length?`<form id="assign-member-form"><label class="control">Account<select id="assign-user">${options(staff,s=>s.email+' · '+s.role)}${options(students,s=>s.username+' · student')}</select></label><label class="control">Assignment<select id="assignment-action"><option value="add">Add to selected class</option><option value="remove">Remove from selected class</option></select></label><button class="btn secondary" type="submit">Update selected class</button></form>`:'<p>Create a class first.</p>'}</section><section class="staff-card"><h2>Teacher subject access</h2><p>Grant this subject before assigning a teacher to its classes. Revoking it also removes their class assignments in this subject.</p><form id="subject-access-form"><label class="control">Teacher<select id="subject-teacher">${options(staff.filter(s=>s.role==='teacher'),s=>s.email)}</select></label><label class="control">Action<select id="subject-action"><option value="grant_subject">Grant selected subject</option><option value="revoke_subject">Revoke selected subject</option></select></label><button class="btn secondary" ${staff.some(s=>s.role==='teacher')?'':'disabled'}>Update subject access</button></form></section><section class="staff-card"><h2>Staff accounts</h2><div class="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>State</th><th>Actions</th></tr></thead><tbody>${staff.map(s=>`<tr><td>${esc(s.email)}</td><td>${s.role}</td><td>${s.active?(s.must_change_password?'Password setup required':'Ready'):'Disabled'}</td><td>${s.user_id===profile.user_id?'Current account':`<button class="btn secondary" data-active="${s.user_id}" data-value="${!s.active}">${s.active?'Disable':'Enable'}</button>${s.role==='teacher'?`<button class="btn secondary" data-staff-reset="${s.user_id}">Reset password</button>`:''}`}</td></tr>`).join('')}</tbody></table></div></section><section class="staff-card"><h2>Student account controls</h2><form id="student-control-form"><label class="control">Student<select id="control-student">${options(students,s=>s.username)}</select></label><label class="control">Action<select id="student-control-action"><option value="disable">Disable account</option><option value="enable">Enable account</option><option value="delete">Permanently delete account and results</option></select></label><label class="control">For deletion only: type the exact username<input id="delete-confirmation" autocomplete="off"></label><button class="btn secondary danger" type="submit" ${students.length?'':'disabled'}>Apply account action</button></form></section><section class="staff-card"><h2>Draft retention policy</h2><p>Leave blank until agreed with your DPO. This prototype records a proposed period; it does not run automatic deletion.</p><form id="retention-form"><label class="control">Proposed retention period in days (30–3650)<input id="retention-days" type="number" min="30" max="3650"></label><button class="btn secondary" type="submit">Save draft period</button></form></section>`:''}`;
  $('#staff-subject').onchange=e=>{selectedSubject=e.target.value;selectedClass='';void work(load);};
  $('#create-class-form').onsubmit=e=>{e.preventDefault();void work(()=>manage('create_class',{label:$('#new-class-label').value,subject_id:selectedSubject}));};
  $('#subject-access-form')?.addEventListener('submit',e=>{e.preventDefault();void work(()=>manage($('#subject-action').value,{user_id:$('#subject-teacher').value,subject_id:selectedSubject}));});
  $('#class-picker')?.addEventListener('change',()=>{selectedClass=$('#class-picker').value;render();});
  $('#batch-students-form')?.addEventListener('submit',e=>{e.preventDefault();const count=Number($('#batch-count').value);void work(async()=>{const data=await service('create_students',{class_id:selectedClass,count});showPrivate('Private student login details',`<p>${data.credentials.length} accounts created. ${esc(data.warning||'Download and distribute privately.')}</p>`,data.credentials);$('#private-output-content').insertAdjacentHTML('beforeend',`<div class="table-wrap"><table><tr><th>Username</th><th>Temporary password</th></tr>${data.credentials.map(row=>`<tr><td>${row.username}</td><td><code>${esc(row.temporary_password)}</code></td></tr>`).join('')}</table></div>`);await load();});});
  $('#invite-teacher-form')?.addEventListener('submit',e=>{e.preventDefault();const email=$('#invite-email').value;void work(async()=>{const data=await service('invite_teacher',{email});showPrivate('Private teacher invitation',`<p>Email: ${esc(data.email)}</p><p>Give the teacher this one-time code privately. They should open Staff sign in → Accept a staff invitation, enter it, and choose their own password.</p><code id="invitation-code">${esc(data.invitation_code)}</code>`);await load();});});
  document.querySelectorAll('[data-report]').forEach(button=>button.onclick=()=>void work(()=>report(button.dataset.report)));
  document.querySelectorAll('[data-reset]').forEach(button=>button.onclick=()=>void work(()=>reset(button.dataset.reset,false)));
  document.querySelectorAll('[data-staff-reset]').forEach(button=>button.onclick=()=>void work(()=>reset(button.dataset.staffReset,true)));
  document.querySelectorAll('[data-active]').forEach(button=>button.onclick=()=>void work(()=>manage('set_active',{user_id:button.dataset.active,active:button.dataset.value==='true'})));
  $('#assign-member-form')?.addEventListener('submit',e=>{e.preventDefault();const user=$('#assign-user').value,member=staff.find(s=>s.user_id===user),remove=$('#assignment-action').value==='remove';void work(()=>manage(member?(remove?'remove_teacher':'assign_teacher'):(remove?'remove_student':'enrol_student'),{class_id:selectedClass,user_id:user}));});
  $('#student-control-form')?.addEventListener('submit',e=>{e.preventDefault();const user_id=$('#control-student').value,action=$('#student-control-action').value,confirmation=$('#delete-confirmation').value;void work(async()=>{if(action==='delete'){if(!window.confirm('Permanently delete this student account, all class memberships and all saved results? This cannot be undone.'))return;await service('delete_student',{user_id,confirm_username:confirmation});await load();}else await manage('set_active',{user_id,active:action==='enable'});});});
  $('#retention-form')?.addEventListener('submit',e=>{e.preventDefault();const value=$('#retention-days').value;void work(()=>manage('set_retention',{days:value?Number(value):null}));});
  if(admin)void connection.client.from('school_policy').select('retention_days').single().then(result=>{if(!result.error&&$('#retention-days'))$('#retention-days').value=result.data.retention_days??'';});
}
async function reset(user_id,staffAccount){
  if(!window.confirm('Reset this account? Existing sessions will end and the person must choose a new password.'))return;
  const data=await service(staffAccount?'reset_staff':'reset_student',{user_id});
  showPrivate('Private temporary password',`<p>${esc(data.username||staff.find(s=>s.user_id===user_id)?.email)}</p><code>${esc(data.temporary_password)}</code>`,data.username?[{username:data.username,temporary_password:data.temporary_password}]:[]);await load();
}
async function report(user_id){
  status('Loading student progress…');
  if(!await account())return;
  const student=students.find(s=>s.user_id===user_id);if(!student)throw Error('Student unavailable.');
  const events=[];for(let offset=0;;offset+=500){const page=checked(await connection.client.from('learning_attempts').select('*').eq('student_id',user_id).eq('subject_id',selectedSubject).order('received_at').order('event_id').range(offset,offset+499));events.push(...page);if(page.length<500)break;}
  const records=recordsFor(events,bank), ratings=Adaptive.ratings(bank,events), windows=checked(await connection.client.rpc('student_subject_activity_windows',{target:user_id,subject:selectedSubject}));
  const badge=q=>Badges.badgeHTML(ratings[q.id].grade);
  const totals=bank.topics.map(topic=>{const questions=bank.questions.filter(q=>q.enabled!==false&&q.prerequisites.includes(topic.id)),attempted=questions.filter(q=>records[q.id]?.first);return {topic,total:questions.length,count:attempted.length,earned:attempted.reduce((sum,q)=>sum+records[q.id].first.score,0),max:attempted.reduce((sum,q)=>sum+q.maxMark,0)};});
  const priority=Adaptive.priority(bank.questions.filter(q=>q.enabled!==false),ratings).slice(0,12);
  $('#student-report').hidden=false;$('#student-report').innerHTML=`<h2>${esc(student.username)} · Progress</h2><p>Latest sign-in: ${date(student.last_login_at)}. Client-reported revision results; no selected answers or free text are retained.</p><div class="staff-grid">${windows.map(row=>`<div><h3>Last ${row.days} day${row.days===1?'':'s'}</h3><p class="stat">${row.correct_attempts} correct</p><p>${row.distinct_questions} distinct questions · first unaided submissions only</p></div>`).join('')}</div><h3>Topic progress</h3><p>First unaided marks for attempted questions. Questions can contribute to several topics.</p><div class="table-wrap"><table><thead><tr><th>Topic</th><th>Questions attempted</th><th>Marks</th></tr></thead><tbody>${totals.map(row=>`<tr><td>${esc(row.topic.label)}</td><td>${row.count} / ${row.total}</td><td>${row.earned} / ${row.max}</td></tr>`).join('')}</tbody></table></div><h3>Revision priorities</h3><p>N means no unaided scored attempt yet. A–E is revision guidance based on unaided marks and time since practice. New questions are labelled explicitly.</p><ul>${priority.map(q=>`<li>${badge(q)} ${esc(q.id)} · ${esc(q.title)}</li>`).join('')}</ul><details><summary>Every question</summary><div class="table-wrap"><table><tr><th>Question</th><th>Rating</th><th>First marks</th><th>Submissions</th><th>Latest unaided answer</th></tr>${bank.questions.filter(q=>q.enabled!==false).map(q=>`<tr><td>${esc(q.id)} · ${esc(q.title)}</td><td>${badge(q)}</td><td>${records[q.id]?.first?records[q.id].first.score+' / '+q.maxMark:'Not yet'}</td><td>${records[q.id]?.attempts||0}</td><td>${date(ratings[q.id].lastAt)}</td></tr>`).join('')}</table></div></details>`;
  $('#student-report').scrollIntoView({behavior:'smooth'});status('Student progress loaded.');
}
async function boot(){
  connection=await openAccountClient({audience:'staff'});
  bank=await fetch('questions.json').then(response=>{if(!response.ok)throw Error('Question catalogue unavailable.');return response.json();});
  $('#staff-login-form').onsubmit=e=>{e.preventDefault();const email=$('#staff-email').value.trim(),password=$('#staff-password').value;$('#staff-password').value='';void work(async()=>{const result=await connection.client.auth.signInWithPassword({email,password});if(result.error)throw Error('Sign-in was unsuccessful. Check your email and password, or ask the administrator.');try{await load();}catch(error){await connection.signOut();loggedOut();throw error;}});};
  $('#staff-invite-form').onsubmit=e=>{e.preventDefault();const token_hash=$('#staff-invite-code').value.trim();$('#staff-invite-code').value='';void work(async()=>{const result=await connection.client.auth.verifyOtp({token_hash,type:'recovery'});if(result.error)throw Error('This invitation is invalid or expired. Ask the administrator for a reset.');try{await load();}catch(error){await connection.signOut();loggedOut();throw error;}});};
  $('#staff-password-form').onsubmit=e=>{e.preventDefault();void work(async()=>{const password=$('#staff-new-password').value;validatePassword(password);if(password!==$('#staff-confirm-password').value)throw Error('The two passwords do not match.');checked(await connection.client.auth.updateUser({password}));$('#staff-password-form').reset();await load();status('Password saved. Staff tools are ready.');});};
  $('#staff-sign-out').onclick=()=>void work(async()=>{try{await connection.signOut();}finally{loggedOut();status('Signed out. This tab’s staff data has been cleared.');}});
  $('#staff-refresh').onclick=()=>void work(load);
  $('#dismiss-credentials').onclick=clearPrivate;
  $('#download-credentials').onclick=()=>{if(!credentials.length)return;const text='username,temporary_password\n'+credentials.map(row=>row.username+','+row.temporary_password).join('\n')+'\n';const address=URL.createObjectURL(new Blob([text],{type:'text/csv'})),link=document.createElement('a');link.href=address;link.download='private-student-logins.csv';link.click();setTimeout(()=>URL.revokeObjectURL(address),1000);};
  window.addEventListener('pagehide',clearPrivate);
  const verify=async()=>{
    if(!profile||busy||verifying)return;
    verifying=true;const generation=scopeGeneration;
    try{
      if(!await account()){clearPrivate();return;}
      const scope=await readScope();
      if(busy||generation!==scopeGeneration)return;
      if(signature(scope)!==scopeSignature){
        // Use the same subject/catalogue load as an explicit refresh. Clear the
        // old controls before awaiting it so they cannot report with a stale bank.
        clearPrivate();$('#staff-tools').replaceChildren();
        await work(async()=>{
          await load();
          status('Class access updated. Previous reports and private details have been cleared.');
        });
      }
    }catch{if(generation===scopeGeneration){loggedOut();status('Your staff session could not be checked. Sign in again.',true);}}
    finally{verifying=false;}
  };
  setInterval(verify,30000);window.addEventListener('focus',verify);window.addEventListener('online',verify);
  const {data:{session}}=await connection.client.auth.getSession();
  if(session){try{await load();}catch{await connection.signOut();loggedOut();status('Sign in again to use staff tools.');}}else status('Ready for invited staff sign-in.');
}
boot().catch(()=>{loggedOut();status('Staff tools could not start. Check the public configuration and question catalogue.',true);});
