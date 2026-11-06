'use strict';
const {openAccountClient} = require('./account-client.cjs');
const {validatePassword} = require('./student-identity.cjs');
const {recordsFor} = require('./learning-events.cjs');
const Adaptive = require('./adaptive.cjs');
const Badges=require('./rating-badges.cjs');
const {subjects}=require('./subjects.cjs');
const Flashcards=require('./flashcard-staff.cjs');
const Retention=require('./retention-admin.cjs');
const {dashboardHealth}=require('./retention-health.cjs');
const Views=require('./staff-views.cjs');
Badges.installRatingTips();
let selectedSubject='chemistry',subjectAssignments=[],currentPage=null,selectedStudent=null;
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date = value => value ? new Date(value).toLocaleString('en-GB') : 'Not yet';
let connection, profile, bank, classes=[], memberships=[], students=[], staff=[], selectedClass='', busy=false, credentials=[];
let scopeSignature='', scopeGeneration=0, verifying=false;
function status(text,error=false){$('#staff-status').textContent=text;$('#staff-status').dataset.error=String(error);$('#staff-status').dataset.quiet=String(!error&&(text.startsWith('Staff tools ready')||text==='Student progress loaded.'));}
function clearPrivate(){credentials=[];$('#private-output-content').replaceChildren();$('#private-output').hidden=true;$('#download-credentials').hidden=true;}
function clearTools(){const tools=$('#staff-tools'),panel=$('#staff-password-panel');if(panel&&tools.contains(panel))$('#staff-account').insertBefore(panel,tools);tools.replaceChildren();}
function unsavedPack(){return !!document.querySelector('.flashcard-pack-editor[data-unsaved="true"]');}
function confirmLeave(){return !unsavedPack()||window.confirm('Leave without saving these flashcard draft changes?');}
function loggedOut(){const passwordPanel=$('#staff-password-panel');if($('#staff-tools').contains(passwordPanel))$('#staff-account').insertBefore(passwordPanel,$('#staff-tools'));scopeGeneration++;currentPage=null;selectedStudent=null;$('#staff-password-panel').hidden=true;scopeSignature='';profile=null;classes=[];memberships=[];students=[];staff=[];clearPrivate();clearTools();$('#staff-account').hidden=true;$('#staff-login').hidden=false;$('#staff-password').value='';$('#staff-invite-code').value='';$('#staff-password-form').reset();}
function lockButtons(){document.querySelectorAll('button').forEach(button=>{if(!button.hasAttribute('data-busy-disabled'))button.dataset.busyDisabled=String(button.disabled);button.disabled=true;});}
async function work(action){if(busy)return;scopeGeneration++;busy=true;status('Working…');lockButtons();try{await action();}catch(error){status(error.message||'The operation could not finish.',true);}finally{busy=false;document.querySelectorAll('[data-busy-disabled]').forEach(button=>{button.disabled=button.dataset.busyDisabled==='true';delete button.dataset.busyDisabled;});}}
function checked(result){if(result.error)throw new Error(result.error.code==='42501'?'Your staff session cannot perform this action.':result.error.message);return result.data;}
async function account(generation=scopeGeneration){
 const next=await connection.profile();
 if(!next.active||!['teacher','admin'].includes(next.role))throw Error('An active invited staff account is required.');
 const {data:{user},error}=await connection.client.auth.getUser();if(error)throw error;
 if(!next.must_change_password)checked(await connection.client.rpc('staff_context'));
 if(generation!==scopeGeneration)return false;
 profile=next;$('#staff-identity').textContent=`${user.email} · ${profile.role==='admin'?'School administrator':'Teacher'}`;
 $('#staff-login').hidden=true;$('#staff-account').hidden=false;$('#staff-tools').hidden=profile.must_change_password;
 if(profile.must_change_password){const panel=$('#staff-password-panel');if($('#staff-tools').contains(panel))$('#staff-account').insertBefore(panel,$('#staff-tools'));panel.hidden=false;clearTools();status('Choose your own password to finish account setup.');return false;}
 if(currentPage!=='account')$('#staff-password-panel').hidden=true;
 return true;
}
async function rows(table,order,filter){const found=[];for(let offset=0;;offset+=500){let query=connection.client.from(table).select('*').order(order).range(offset,offset+499);if(table==='class_students')query=query.order('class_id');if(filter)query=filter(query);const data=checked(await query);found.push(...data);if(data.length<500)return found;}}
const readScope=()=>Promise.all([rows('school_classes','id'),rows('class_students','student_id'),rows('account_profiles','user_id',q=>q.eq('role','student')),rows('staff_subjects','teacher_id')]);
const signature=scope=>JSON.stringify([profile.user_id,profile.role,scope[0].map(c=>[c.id,c.label]),scope[1].map(m=>[m.class_id,m.student_id]),scope[2].map(s=>s.user_id),scope[3].map(s=>[s.teacher_id,s.subject_id])]);
function applyScope(scope){subjectAssignments=scope[3];if(profile.role!=='admin'&&!subjectAssignments.some(s=>s.teacher_id===profile.user_id&&s.subject_id===selectedSubject))selectedSubject=subjectAssignments.find(s=>s.teacher_id===profile.user_id)?.subject_id||'chemistry';classes=scope[0].filter(c=>c.subject_id===selectedSubject);memberships=scope[1];students=scope[2];scopeSignature=signature(scope);if(!classes.some(c=>c.id===selectedClass))selectedClass=classes[0]?.id||'';}
async function load(){
  const generation=++scopeGeneration;
  status('Loading your classes…');
  try{if(!await account(generation))return;}catch(error){if(generation===scopeGeneration)loggedOut();throw error;}
  const scope=await readScope();if(generation!==scopeGeneration)return;applyScope(scope);
  bank=await fetch(subjects.find(s=>s.id===selectedSubject).learningBankUrl).then(r=>{if(!r.ok)throw Error('Question catalogue unavailable.');return r.json();});
  if(generation!==scopeGeneration)return;
  staff=profile.role==='admin'?checked(await connection.client.rpc('staff_directory')):[];
  if(generation!==scopeGeneration)return;
  if(currentPage==='student'){currentPage='classes';selectedStudent=null;}
  if(!Views.pages(profile.role==='admin').some(([id])=>id===currentPage))currentPage=profile.role==='admin'?'overview':'classes';
  if(!classes.some(c=>c.id===selectedClass))selectedClass=classes[0]?.id||'';
  render();status('Staff tools ready. Student results are shown only for your permitted classes.');
}
async function manage(action,payload){checked(await connection.client.rpc('staff_manage',{action,payload}));await load();}
async function service(action,fields){
  const {data:{session},error}=await connection.client.auth.getSession();if(error||!session)throw Error('Sign in again before managing accounts.');
  if(connection.staffOperation)return connection.staffOperation(action,fields);
  const response=await fetch(connection.url+'/functions/v1/staff-management',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,apikey:connection.key,'Content-Type':'application/json'},body:JSON.stringify({action,request_id:crypto.randomUUID(),...fields}),signal:AbortSignal.timeout(180000)});
  let result;try{result=await response.json();}catch{throw Error('The staff service is unavailable. Its Edge Function must be deployed before account creation or resets.');}
  if(!response.ok)throw Error(result.error||'Check the class/account before retrying this operation.');
  return result;
}
function showPrivate(title,content,rows=[]){clearPrivate();$('#private-output-title').textContent=title;$('#private-output-content').innerHTML=content;credentials=rows;$('#download-credentials').hidden=!rows.length;$('#private-output').hidden=false;$('#private-output').scrollIntoView({behavior:'smooth',block:'start'});}
const options=(list,label)=>list.map(item=>`<option value="${esc(item.user_id)}">${esc(label(item))}</option>`).join('');
function canReport(id){return students.some(s=>s.user_id===id)&&(profile.role==='admin'||memberships.some(m=>m.class_id===selectedClass&&m.student_id===id));}
async function go(page,id){
 if(busy||!confirmLeave())return;
 if(page==='student'){if(!canReport(id))return;selectedStudent=id;}else{if(!Views.pages(profile.role==='admin').some(([p])=>p===page))return;selectedStudent=null;}
 currentPage=page;scopeGeneration++;clearPrivate();$('#staff-password-panel').hidden=true;render();
 $('#staff-page-title')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
 if(page==='student')await work(()=>report(id));
}
function render(){
 const admin=profile.role==='admin';
 const members=new Set(memberships.filter(m=>m.class_id===selectedClass).map(m=>m.student_id));
 const roster=students.filter(s=>members.has(s.user_id));
 const passwordPanel=$('#staff-password-panel');if($('#staff-tools').contains(passwordPanel))$('#staff-account').insertBefore(passwordPanel,$('#staff-tools'));
 $('#staff-tools').innerHTML=Views.view({admin,page:currentPage,classes,roster,students,staff,selectedClass,selectedSubject,selectedStudent,subjects,profile,subjectAssignments,memberships});
 if(currentPage==='account')$('#staff-account-settings').append(passwordPanel);
 document.querySelectorAll('[data-staff-page]').forEach(button=>button.onclick=()=>void go(button.dataset.staffPage));
 if(currentPage==='packs')void Flashcards.mount({connection,profile,subject:selectedSubject,container:$('#staff-packs-page')});
 if(currentPage==='retention')void Retention.mount({connection,profile,container:$('#staff-retention-page'),work,reload:load,section:'policy'});
 if(currentPage==='staff')void Retention.mount({connection,profile,container:$('#staff-leavers'),work,reload:load,section:'leavers'});
 if(currentPage==='overview')void overviewStatus();
 document.querySelectorAll('[data-class]').forEach(button=>button.onclick=()=>{if(busy)return;selectedClass=button.dataset.class;clearPrivate();render();});
 $('#show-batch-form')?.addEventListener('click',()=>{const form=$('#batch-students-form');form.hidden=!form.hidden;if(!form.hidden)$('#batch-count').focus();});
 $('#class-search')?.addEventListener('input',e=>{const text=e.target.value.toLowerCase(),matches=classes.filter(c=>c.label.toLowerCase().includes(text));$('#class-picker').innerHTML=matches.map(c=>`<option value="${esc(c.id)}" ${c.id===selectedClass?'selected':''}>${esc(c.label)}</option>`).join('');if(matches.length&&!matches.some(c=>c.id===selectedClass))$('#class-picker').selectedIndex=-1;});
 $('#student-search')?.addEventListener('input',e=>{const text=e.target.value.toLowerCase();let visible=0;document.querySelectorAll('.staff-roster [data-student-row]').forEach(row=>{row.hidden=!row.dataset.search.toLowerCase().includes(text);if(!row.hidden)visible++;});$('#student-search-status').textContent=visible?'':'No usernames match your search.';});
 $('#show-password-change')?.addEventListener('click',()=>{$('#staff-password-panel').hidden=false;$('#staff-new-password').focus();$('#staff-password-panel').scrollIntoView({block:'start'});});
 $('#account-sign-out')?.addEventListener('click',()=>$('#staff-sign-out').click());
  $('#staff-subject')?.addEventListener('change',e=>{if(busy||!confirmLeave()){e.target.value=selectedSubject;return;}selectedSubject=e.target.value;selectedClass='';selectedStudent=null;if(currentPage==='student')currentPage='classes';clearPrivate();void work(load);});
  $('#create-class-form')?.addEventListener('submit',e=>{e.preventDefault();void work(()=>manage('create_class',{label:$('#new-class-label').value,subject_id:selectedSubject}));});
  $('#subject-access-form')?.addEventListener('submit',e=>{e.preventDefault();void work(()=>manage($('#subject-action').value,{user_id:$('#subject-teacher').value,subject_id:$('#staff-access-subject').value}));});
  $('#class-picker')?.addEventListener('change',()=>{if(busy)return;selectedClass=$('#class-picker').value;clearPrivate();render();});
  $('#batch-students-form')?.addEventListener('submit',e=>{e.preventDefault();const count=Number($('#batch-count').value);void work(async()=>{const data=await service('create_students',{class_id:selectedClass,count});showPrivate('Private student login details',`<p>${data.credentials.length} accounts created. ${esc(data.warning||'Download and distribute privately.')}</p>`,data.credentials);$('#private-output-content').insertAdjacentHTML('beforeend',`<div class="table-wrap"><table><tr><th>Username</th><th>Temporary password</th></tr>${data.credentials.map(row=>`<tr><td>${row.username}</td><td><code>${esc(row.temporary_password)}</code></td></tr>`).join('')}</table></div>`);await load();});});
  $('#invite-teacher-form')?.addEventListener('submit',e=>{e.preventDefault();const email=$('#invite-email').value;void work(async()=>{const data=await service('invite_teacher',{email});showPrivate('Private teacher invitation',`<p>Email: ${esc(data.email)}</p><p>Give the teacher this one-time code privately. They should open Staff sign in → Accept a staff invitation, enter it, and choose their own password.</p><code id="invitation-code">${esc(data.invitation_code)}</code>`);await load();});});
  document.querySelectorAll('[data-report]').forEach(button=>button.onclick=()=>void go('student',button.dataset.report));
  document.querySelectorAll('[data-reset]').forEach(button=>button.onclick=()=>void work(()=>reset(button.dataset.reset,false)));
  document.querySelectorAll('[data-staff-reset]').forEach(button=>button.onclick=()=>void work(()=>reset(button.dataset.staffReset,true)));
  document.querySelectorAll('[data-active]').forEach(button=>button.onclick=()=>void work(()=>manage('set_active',{user_id:button.dataset.active,active:button.dataset.value==='true'})));
  $('#assign-member-form')?.addEventListener('submit',e=>{e.preventDefault();const user=$('#assign-user').value,member=staff.find(s=>s.user_id===user),remove=$('#assignment-action').value==='remove';void work(()=>manage(member?(remove?'remove_teacher':'assign_teacher'):(remove?'remove_student':'enrol_student'),{class_id:selectedClass,user_id:user}));});
  $('#student-control-form')?.addEventListener('submit',e=>{e.preventDefault();const user_id=$('#control-student').value,action=$('#student-control-action').value,confirmation=$('#delete-confirmation').value;void work(async()=>{if(action==='delete'){if(!window.confirm('Permanently delete this student account, all class memberships and all saved results? This cannot be undone.'))return;await service('delete_student',{user_id,confirm_username:confirmation});await load();}else await manage('set_active',{user_id,active:action==='enable'});});});
 if(busy)lockButtons();
}
async function overviewStatus(){
 const host=$('#staff-overview-status');
 try{const state=checked(await connection.client.rpc('retention_status'));if(!host.isConnected)return;const last=state.last_run,status=dashboardHealth(state);
  host.dataset.health=status.reason;host.setAttribute('role',status.attention?'alert':'status');
  const title=document.createElement('strong');title.textContent=status.title;
  const detail=document.createElement('p');detail.textContent=`${status.message} ${state.overdue} accounts due · ${state.unmanaged} historical accounts excluded. ${last?'Last cleanup: '+last.status+' on '+date(last.finished_at):'No cleanup has run.'} Alerts are dashboard-only; email is not enabled.`;
  const link=document.createElement('button');link.className='btn secondary';link.textContent='Review retention →';link.onclick=()=>void go('retention');host.replaceChildren(title,detail,link);
 }catch{if(host.isConnected){host.dataset.health='status_unavailable';host.setAttribute('role','alert');host.textContent='Retention status could not be checked. Open Retention & health to retry.';}}
}
async function reset(user_id,staffAccount){
  if(!window.confirm('Reset this account? Existing sessions will end and the person must choose a new password.'))return;
  const data=await service(staffAccount?'reset_staff':'reset_student',{user_id});
  showPrivate('Private temporary password',`<p>${esc(data.username||staff.find(s=>s.user_id===user_id)?.email)}</p><code>${esc(data.temporary_password)}</code>`,data.username?[{username:data.username,temporary_password:data.temporary_password}]:[]);await load();
}
async function report(user_id){
  status('Loading student progress…');
  const generation=scopeGeneration,subject=selectedSubject,host=$('#question-report-pane');
  if(!canReport(user_id)||!await account(generation))return;
  const student=students.find(s=>s.user_id===user_id);if(!student)throw Error('Student unavailable.');
  const events=[];for(let offset=0;;offset+=500){const page=checked(await connection.client.from('learning_attempts').select('*').eq('student_id',user_id).eq('subject_id',selectedSubject).order('received_at').order('event_id').range(offset,offset+499));events.push(...page);if(page.length<500)break;}
  const records=recordsFor(events,bank), ratings=Adaptive.ratings(bank,events), windows=checked(await connection.client.rpc('student_subject_activity_windows',{target:user_id,subject:selectedSubject}));
  const badge=q=>Badges.badgeHTML(ratings[q.id].grade);
  const totals=bank.topics.map(topic=>{const questions=bank.questions.filter(q=>q.enabled!==false&&q.prerequisites.includes(topic.id)),attempted=questions.filter(q=>records[q.id]?.first);return {topic,total:questions.length,count:attempted.length,earned:attempted.reduce((sum,q)=>sum+records[q.id].first.score,0),max:attempted.reduce((sum,q)=>sum+q.maxMark,0)};});
  const priority=Adaptive.priority(bank.questions.filter(q=>q.enabled!==false),ratings).slice(0,12);
  if(!host?.isConnected||generation!==scopeGeneration||subject!==selectedSubject||selectedStudent!==user_id)return;
  host.innerHTML=`<p class="small-note">Client-reported question practice, including written self-assessment. No selected answers or free text are retained.</p><div class="staff-grid">${windows.map(row=>`<div><h3>Last ${row.days} day${row.days===1?'':'s'}</h3><p class="stat">${row.correct_attempts} correct</p><p>${row.distinct_questions} distinct questions · first unaided submissions only</p></div>`).join('')}</div><h3>Revision priorities</h3><ul class="staff-priorities">${priority.map(q=>`<li>${badge(q)} <span>${esc(q.id)} · ${esc(q.title)}</span></li>`).join('')}</ul><p class="small-note">N means no unaided scored attempt yet. A–E is revision guidance, not an exam grade.</p><h3>Topic progress</h3><p>First unaided marks for attempted questions. Questions can contribute to several topics.</p><div class="table-wrap"><table><thead><tr><th>Topic</th><th>Questions attempted</th><th>Marks</th></tr></thead><tbody>${totals.map(row=>`<tr><td>${esc(row.topic.label)}</td><td>${row.count} / ${row.total}</td><td>${row.earned} / ${row.max}</td></tr>`).join('')}</tbody></table></div><details><summary>Every question</summary><div class="table-wrap"><table><tr><th>Question</th><th>Rating</th><th>First marks</th><th>Submissions</th><th>Latest unaided answer</th></tr>${bank.questions.filter(q=>q.enabled!==false).map(q=>`<tr><td>${esc(q.id)} · ${esc(q.title)}</td><td>${badge(q)}</td><td>${records[q.id]?.first?records[q.id].first.score+' / '+q.maxMark:'Not yet'}</td><td>${records[q.id]?.attempts||0}</td><td>${date(ratings[q.id].lastAt)}</td></tr>`).join('')}</table></div></details>`;
  bindReportTabs(user_id,subject);
  status('Student progress loaded.');
}
function bindReportTabs(user_id,subject){
 let loaded=false;
 const tabs=[$('#report-tab-questions'),$('#report-tab-flashcards')];
 function select(index){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});$('#question-report-pane').hidden=index!==0;$('#flashcard-report-pane').hidden=index!==1;
  if(index===1&&!loaded){loaded=true;void Flashcards.report({connection,subject,student:user_id,container:$('#flashcard-report-pane')});}
 }
 tabs.forEach((tab,i)=>{tab.onclick=()=>select(i);tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-i;select(next);tabs[next].focus();}};});
}

async function boot(openConnection=openAccountClient){
  connection=await openConnection({audience:'staff'});
  bank=await fetch('questions.json').then(response=>{if(!response.ok)throw Error('Question catalogue unavailable.');return response.json();});
  $('#staff-login-form').onsubmit=e=>{e.preventDefault();const email=$('#staff-email').value.trim(),password=$('#staff-password').value;$('#staff-password').value='';void work(async()=>{const result=await connection.client.auth.signInWithPassword({email,password});if(result.error)throw Error('Sign-in was unsuccessful. Check your email and password, or ask the administrator.');try{await load();}catch(error){await connection.signOut();loggedOut();throw error;}});};
  $('#staff-invite-form').onsubmit=e=>{e.preventDefault();const token_hash=$('#staff-invite-code').value.trim();$('#staff-invite-code').value='';void work(async()=>{const result=await connection.client.auth.verifyOtp({token_hash,type:'recovery'});if(result.error)throw Error('This invitation is invalid or expired. Ask the administrator for a reset.');try{await load();}catch(error){await connection.signOut();loggedOut();throw error;}});};
  $('#staff-password-form').onsubmit=e=>{e.preventDefault();void work(async()=>{const password=$('#staff-new-password').value;validatePassword(password);if(password!==$('#staff-confirm-password').value)throw Error('The two passwords do not match.');checked(await connection.client.auth.updateUser({password}));$('#staff-password-form').reset();$('#staff-password-panel').hidden=true;await load();status('Password saved. Staff tools are ready.');});};
  $('#staff-sign-out').onclick=()=>void work(async()=>{try{await connection.signOut();}finally{loggedOut();status('Signed out. This tab’s staff data has been cleared.');}});
  $('#staff-refresh').onclick=()=>void work(load);
  $('#dismiss-credentials').onclick=clearPrivate;
  $('#download-credentials').onclick=()=>{if(!credentials.length)return;const text='username,temporary_password\n'+credentials.map(row=>row.username+','+row.temporary_password).join('\n')+'\n';const address=URL.createObjectURL(new Blob([text],{type:'text/csv'})),link=document.createElement('a');link.href=address;link.download='private-student-logins.csv';link.click();setTimeout(()=>URL.revokeObjectURL(address),1000);};
  window.addEventListener('pagehide',clearPrivate);
  window.addEventListener('beforeunload',event=>{if(unsavedPack()){event.preventDefault();event.returnValue='';}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.staff-more[open],.student-actions[open]').forEach(menu=>menu.open=false);});
  const verify=async()=>{
    if(!profile||busy||verifying)return;
    verifying=true;const generation=scopeGeneration;
    try{
      if(!await account(generation)){if(generation===scopeGeneration)clearPrivate();return;}
      const scope=await readScope();
      if(busy||generation!==scopeGeneration)return;
      if(signature(scope)!==scopeSignature){
        // Use the same subject/catalogue load as an explicit refresh. Clear the
        // old controls before awaiting it so they cannot report with a stale bank.
        clearPrivate();clearTools();
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
function start(openConnection){return boot(openConnection).catch(()=>{loggedOut();status('Staff tools could not start. Check the public configuration and question catalogue.',true);});}
module.exports={start};
