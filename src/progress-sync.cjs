'use strict';
const {openAccountClient} = require('./account-client.cjs');
const {metadata, mergeEvents, recordsFor, makeEvent} = require('./learning-events.cjs');
const Adaptive = require('./adaptive.cjs');
const Badges = require('./rating-badges.cjs');
Badges.installRatingTips();
const {rejectionReason, descriptions} = require('./sync-rejections.cjs');

async function open(bank, onRecords = () => {}, {
  navigate = path => location.replace(new URL(path, location.href)),
  loginUrl = 'student-login.html'
} = {}) {
  let connection;
  try {connection = await openAccountClient();} catch {return null;}
  const {client} = connection;
  let owner = connection.cachedProfile();
  let session, sessionError;
  if (!navigator.onLine) session = connection.read(connection.sessionKey);
  else try {const result=await client.auth.getSession();session=result.data.session;sessionError=result.error;} catch(error){sessionError=error;}
  if (!session && !owner) return null;
  if(!session&&owner&&navigator.onLine&&!(sessionError&&(sessionError.status===0||sessionError.name==='AuthRetryableFetchError'))){
    throw new Error('Open Student sign in to sign in again. Waiting attempts are kept for this account.');
  }
  if (session && navigator.onLine) {
    try {owner = await connection.profile();} catch (error) {
      if (!owner || (error.status && ![0,502,503,504].includes(error.status))) {
        throw new Error('Your account could not be checked. Open Student sign in to sign in again.');
      }
    }
  }
  if (!owner || owner.role !== 'student' || !owner.active || owner.must_change_password) {
    throw new Error('Open Student sign in and choose your own password before saving account progress.');
  }
  const subject=bank.meta.subjectId||'chemistry';
  const cacheKey = connection.prefix + owner.user_id + (subject==='chemistry'?'':':'+subject);
  const cached = connection.read(cacheKey) || {};
  let history = mergeEvents(cached.history), pending = mergeEvents(connection.read(cacheKey+':pending')||cached.pending), closed = false, running = false;
  let rejected = (connection.read(cacheKey+':rejected') || []).filter(item => item?.event && Object.hasOwn(descriptions,item.reason))
    .map(item => ({event:metadata(item.event),reason:item.reason}));
  const rejectedIds=new Set(rejected.map(item=>item.event.event_id));
  pending=pending.filter(event=>!rejectedIds.has(event.event_id));
  const unsavedCount=()=>pending.length+rejected.length;
  let message = '', timer;
  const bar = document.createElement('aside'); bar.id = 'account-sync-bar'; bar.className = 'account-sync-bar';
  const identity = document.createElement('strong'); identity.textContent = owner.username;
  const state = document.createElement('span'); state.id = 'account-sync-status'; state.setAttribute('role','status');
  const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn text-button'; retry.textContent = 'Retry sync'; retry.id = 'retry-progress-sync';
  const logout = document.createElement('button'); logout.type = 'button'; logout.className = 'btn account-sign-out'; logout.textContent = 'Sign Out'; logout.id = 'practice-sign-out';
  const login=document.createElement('a');login.href=loginUrl;login.textContent='Sign in again';login.hidden=true;
  const attention=document.createElement('details');attention.id='sync-attention';attention.hidden=true;
  const summary=document.createElement('summary'),explanation=document.createElement('p'),list=document.createElement('ul');
  explanation.textContent='These attempts have not saved. Other valid attempts can still sync. Keep this tab open until you resolve them.';
  const retryRejected=document.createElement('button');retryRejected.type='button';retryRejected.className='btn text-button';retryRejected.id='retry-rejected-attempts';retryRejected.textContent='Retry these attempts';
  const discardRejected=document.createElement('button');discardRejected.type='button';discardRejected.className='btn text-button';discardRejected.id='discard-rejected-attempts';discardRejected.textContent='Discard these unsaved attempts';
  attention.append(summary,explanation,list,retryRejected,discardRejected);
  bar.append(identity, state, login, retry, logout, attention); (document.querySelector('.workspace') || document.body).prepend(bar);
  function placeAccountAction() {
    if (closed) return;
    const slot=document.querySelector('#app [data-account-actions]');
    const target=slot&&!slot.closest('[hidden]')?slot:bar;
    if(logout.parentElement!==target)target.append(logout);
  }
  const actionObserver=new MutationObserver(placeAccountAction);
  actionObserver.observe(document.querySelector('.workspace')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  function publish() {
    if (closed) return;
    // Prioritize durable pending metadata over the replaceable remote-history cache.
    // Store rejected metadata before removing it from the pending queue.
    if(!connection.storage.setItem(cacheKey+':rejected',JSON.stringify(rejected))){
      connection.storage.removeItem(cacheKey);
      connection.storage.setItem(cacheKey+':rejected',JSON.stringify(rejected));
    }
    if(!connection.storage.setItem(cacheKey+':pending',JSON.stringify(pending))){
      connection.storage.removeItem(cacheKey);
      connection.storage.setItem(cacheKey+':pending',JSON.stringify(pending));
    }
    connection.storage.setItem(cacheKey, JSON.stringify({history}));
    onRecords(recordsFor(mergeEvents(history, pending), bank));
    const rejectedMessage=rejected.length?`${rejected.length} attempt${rejected.length===1?' needs':'s need'} attention.${login.hidden?' Open Review unsaved attempts.':' They are kept for this account.'}`:'';
    state.textContent = [message || (pending.length ? `${pending.length} attempt${pending.length === 1 ? '' : 's'} waiting to save. Keep this tab open.` : rejected.length?'':'All progress saved to your account.'),rejectedMessage].filter(Boolean).join(' ');
    retry.hidden = !pending.length && !message; retry.disabled = running;
    attention.hidden=!rejected.length||!login.hidden;summary.textContent=`Review unsaved attempts (${rejected.length})`;
    list.replaceChildren(...rejected.map(item=>{const row=document.createElement('li');row.textContent=`${item.event.question_id} · ${new Date(item.event.attempted_at).toLocaleString()} · ${descriptions[item.reason]}`;return row;}));
    retryRejected.disabled=discardRejected.disabled=running;
  }
  async function upload(batch) {
    if(closed||!batch.length)return;
    const result=await client.rpc('sync_learning_attempts',{events:batch,expected_student:owner.user_id});
    if(closed)return;
    if(result.error){
      const reason=rejectionReason(result.error);
      if(!reason)throw result.error;
      if(batch.length>1){const middle=Math.floor(batch.length/2);await upload(batch.slice(0,middle));await upload(batch.slice(middle));return;}
      const event=metadata(batch[0]);
      rejected=rejected.filter(item=>item.event.event_id!==event.event_id).concat({event,reason});
      pending=pending.filter(item=>item.event_id!==event.event_id);publish();return;
    }
    const acknowledged=new Set(result.data);
    if(batch.some(event=>!acknowledged.has(event.event_id)))throw new Error('Incomplete acknowledgement.');
    history=mergeEvents(history,batch);pending=pending.filter(event=>!acknowledged.has(event.event_id));publish();
  }
  async function pull() {
    const remote = [];
    for (let offset = 0;; offset += 500) {
      const result = await client.from('learning_attempts').select('*').eq('student_id', owner.user_id).eq('subject_id',subject)
        .order('received_at').order('event_id').range(offset, offset + 499);
      if (result.error) throw result.error;
      remote.push(...result.data); if (result.data.length < 500) break;
    }
    if (!closed) history = mergeEvents(history, remote);
  }
  async function flush() {
    if (closed || running) return;
    if (!navigator.onLine) {message = pending.length ? `Offline · ${pending.length} attempts waiting to save. Keep this tab open.` : 'Offline · showing saved progress from this tab.'; publish(); return;}
    running = true; message = 'Checking account and syncing…'; publish();
    let stage='account';
    try {
      const checked = await connection.profile();
      if (checked.user_id !== owner.user_id) {closed = true; clearInterval(timer); navigate('index.html'); return;}
      if (!checked.active || checked.must_change_password || checked.role !== 'student') throw new Error('account');
      stage='sync';login.hidden=true;const main=document.querySelector('main');if(main)main.hidden=false;
      while (!closed && pending.length) {
        await upload(pending.slice(0,100));
      }
      if (!closed) await pull();
      message = '';
    } catch (error) {
      const needsLogin=(stage==='account'&&([401,403,404,406].includes(error.status)||error.name==='AuthSessionMissingError'))||error.message==='account'||error.code==='42501';
      if(needsLogin){login.hidden=false;const main=document.querySelector('main');if(main)main.hidden=true;}
      message = needsLogin
        ? 'Sign in again with this account to save waiting attempts.'
        : `Unable to sync · ${pending.length} attempts waiting. Check your connection or ask your teacher.`;
    } finally {running = false; publish();}
  }
  const unload = event => {if (!closed && unsavedCount()) {event.preventDefault(); event.returnValue = '';}};
  window.addEventListener('beforeunload', unload);
  window.addEventListener('online', flush); window.addEventListener('offline', flush);
  retry.onclick = flush;
  retryRejected.onclick=()=>{
    if(running||closed)return;
    pending=mergeEvents(pending,rejected.map(item=>item.event));rejected=[];message='';publish();void flush();
  };
  discardRejected.onclick=()=>{
    if(running||closed||!window.confirm(`Discard ${rejected.length} rejected unsaved attempts? Saved results and other waiting attempts will be kept.`))return;
    rejected=[];message='';publish();
  };
  logout.onclick = async () => {
    if(closed)return;
    const waiting=Math.max(unsavedCount(),connection.pendingCount());
    if (waiting && !window.confirm(`${waiting} attempts have not synced. Signing out will discard those unsaved attempts. Sign out anyway?`)) return;
    closed = true; clearInterval(timer); actionObserver.disconnect(); window.removeEventListener('beforeunload', unload);
    logout.disabled=true;retry.disabled=true;state.textContent='Signing out…';
    const main=document.querySelector('main');if(main)main.hidden=true;
    window.removeEventListener('online', flush); window.removeEventListener('offline', flush);
    try {await connection.signOut();} finally {navigate('index.html');}
  };
  const scopedStorage = {
    get(key, fallback) {
      if (['ocrOrgProgressV2','ocrOrgActiveV2'].includes(key)) return fallback;
      return connection.read(cacheKey + ':' + key) ?? fallback;
    },
    set(key, value) {
      // Do not persist session drafts, responses, result details, or email report text.
      if (['ocrOrgPrefsV2','ocrOrgCelebrationsV1','ocrOrgCelebrationSoundV1'].includes(key)) connection.storage.setItem(cacheKey + ':' + key, JSON.stringify(value));
      return true;
    },
    remove(key) {connection.storage.removeItem(cacheKey + ':' + key); return true;}
  };
  publish(); timer = setInterval(flush, 15000);
  // Start requests after the app has installed its account-scoped progress state.
  setTimeout(flush, 0);
  return {storage: scopedStorage, records: () => recordsFor(mergeEvents(history,pending), bank),
    events: () => mergeEvents(history,pending),
    record(question, session, kind, result) {
      if (closed) return;
      pending = mergeEvents(pending, [makeEvent(bank, question, session, kind, result)]); message = ''; publish(); void flush();
    }, flush, owner};
}
window.RevisionSync = {open};
window.RevisionAdaptive = {...Adaptive, ...Badges, appendGuest: (events,bank,question,session,kind,result) =>
  mergeEvents(events,[makeEvent(bank,question,session,kind,result)])};
