'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Date(v).toLocaleDateString('en-GB',{timeZone:'UTC'}):'Not set';
function check(r){if(r.error)throw Error(r.error.message);return r.data}
async function mount({connection,profile,container,work,reload,section:pageSection='all'}){
 if(profile.role!=='admin')return;
 const section=document.createElement('section');section.className='staff-card';section.id='retention-controls';
 section.textContent='Loading retention status…';container.append(section);
 try{
  const [state,accounts]=await Promise.all(['retention_status','retention_accounts'].map(async name=>check(await connection.client.rpc(name))));
  if(!section.isConnected)return;
  const last=state.last_run,stale=!last||Date.now()-Date.parse(last.finished_at||last.started_at)>8*86400000;
  section.innerHTML=`<div data-retention-section="policy"><h2>Account retention</h2><p>Students: two years from first login; unused accounts: 90 days from creation. Weekly deletion completes within seven days. No advance warnings are shown.</p>
  <p role="status" id="retention-health">${state.enabled?'Policy enabled':'Policy not enabled'} · ${!last?'No cleanup has run':`Last run: ${esc(last.status)} on ${date(last.finished_at)} · ${last.deleted_students} students / ${last.deleted_staff} staff deleted · ${last.failures} failures`}${stale?' · Check the weekly scheduler':''}. ${state.overdue} accounts due; ${state.unmanaged} historical accounts excluded pending review.</p>
  ${!state.enabled?'<form id="enable-retention"><label><input type="checkbox" id="retention-ready" required> I have reviewed the policy, existing accounts and installed the weekly schedule.</label><button class="btn secondary">Enable retention policy</button></form>':''}
  <h3>Extend student retention</h3><form id="extend-retention"><label class="control">Student<select id="retention-student">${accounts.filter(a=>a.role==='student'&&a.managed).map(a=>`<option value="${a.user_id}">${esc(a.label)} · due ${date(a.due_at)}</option>`).join('')}</select></label><label class="control">New expiry date (UTC)<input id="retention-until" type="date" required></label><label class="control">Reason (do not include sensitive information)<input id="retention-reason" maxlength="500" required></label><button class="btn secondary" ${accounts.some(a=>a.role==='student'&&a.managed)?'':'disabled'}>Save extension</button></form>
  <details><summary>Existing student extensions</summary><ul>${accounts.filter(a=>a.extension_until).map(a=>`<li>${esc(a.label)} · ${date(a.extension_until)} · ${esc(a.extension_reason)}</li>`).join('')||'<li>No extensions</li>'}</ul></details>
  </div><div data-retention-section="leavers"><h2>Staff leaving</h2><p>Revoke access now; delete on the first weekly run after 23 days, within 30 days. An active administrator takes responsibility for teaching packs and external handover.</p>
  <form id="retire-staff"><label class="control">Leaving account<select id="retention-staff">${accounts.filter(a=>a.role!=='student'&&a.user_id!==profile.user_id&&!a.departed_at).map(a=>`<option value="${a.user_id}">${esc(a.label)} · ${a.role}</option>`).join('')}</select></label><label class="control">Responsible administrator<select id="retention-successor">${accounts.filter(a=>a.role==='admin'&&!a.departed_at).map(a=>`<option value="${a.user_id}">${esc(a.label)}</option>`).join('')}</select></label><label class="control">Reason<input id="retirement-reason" maxlength="500" required></label><label><input type="checkbox" id="retirement-handover" required> Responsibilities, project ownership and recovery arrangements have been handed over.</label><button class="btn secondary danger" ${accounts.some(a=>a.role!=='student'&&a.user_id!==profile.user_id&&!a.departed_at)?'':'disabled'}>Revoke access and schedule deletion</button></form></div>
  <p class="small-note">Invitations expire within seven days (the Auth provider may expire codes sooner); abandoned invitation accounts are removed within 30 days. Audit and cleanup records are retained for 12 months, removed by the weekly run. Email alerts require separate school configuration.</p>`;
  if(pageSection!=='all')section.querySelector(`[data-retention-section="${pageSection==='policy'?'leavers':'policy'}"]`)?.remove();
  const manage=async(action,payload)=>{check(await connection.client.rpc('retention_manage',{action,payload}));await reload()};
  section.querySelector('#enable-retention')?.addEventListener('submit',e=>{e.preventDefault();void work(()=>manage('enable',{confirmed:section.querySelector('#retention-ready').checked}))});
  section.querySelector('#extend-retention')?.addEventListener('submit',e=>{e.preventDefault();const payload={user_id:section.querySelector('#retention-student').value,until_at:section.querySelector('#retention-until').value+'T00:00:00Z',reason:section.querySelector('#retention-reason').value};void work(()=>manage('extend',payload))});
  section.querySelector('#retire-staff')?.addEventListener('submit',e=>{e.preventDefault();if(!confirm('Revoke this staff account and schedule deletion after handover?'))return;const payload={user_id:section.querySelector('#retention-staff').value,successor:section.querySelector('#retention-successor').value,reason:section.querySelector('#retirement-reason').value,handover_confirmed:section.querySelector('#retirement-handover').checked};void work(()=>manage('retire_staff',payload))});
  if(pageSection!=='leavers'){
    const logs=check(await connection.client.from('retention_runs').select('started_at,finished_at,status,deleted_students,deleted_staff,failures').order('started_at',{ascending:false}).limit(10));
    if(!section.isConnected)return;
    const history=document.createElement('details');history.innerHTML=`<summary>Recent cleanup runs</summary><div class="table-wrap"><table><thead><tr><th>Finished</th><th>Status</th><th>Students deleted</th><th>Staff deleted</th><th>Failures</th></tr></thead><tbody>${logs.map(r=>`<tr><td>${date(r.finished_at)}</td><td>${esc(r.status)}</td><td>${r.deleted_students}</td><td>${r.deleted_staff}</td><td>${r.failures}</td></tr>`).join('')||'<tr><td colspan="5">No cleanup runs recorded.</td></tr>'}</tbody></table></div>`;section.append(history);
  }

 }catch(error){if(section.isConnected)section.textContent='Retention controls unavailable: '+error.message}
}
module.exports={mount};
