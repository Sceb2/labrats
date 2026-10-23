'use strict';
const {openAccountClient} = require('./account-client.cjs');
const {metadata, mergeEvents, recordsFor, makeEvent} = require('./learning-events.cjs');
const Adaptive = require('./adaptive.cjs');

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
  const cacheKey = connection.prefix + owner.user_id;
  const cached = connection.read(cacheKey) || {};
  let history = mergeEvents(cached.history), pending = mergeEvents(connection.read(cacheKey+':pending')||cached.pending), closed = false, running = false;
  let message = '', timer;
  const bar = document.createElement('aside'); bar.id = 'account-sync-bar'; bar.className = 'account-sync-bar';
  const identity = document.createElement('strong'); identity.textContent = owner.username;
  const state = document.createElement('span'); state.id = 'account-sync-status'; state.setAttribute('role','status');
  const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn text-button'; retry.textContent = 'Retry sync'; retry.id = 'retry-progress-sync';
  const logout = document.createElement('button'); logout.type = 'button'; logout.className = 'btn text-button'; logout.textContent = 'Sign out'; logout.id = 'practice-sign-out';
  const login=document.createElement('a');login.href=loginUrl;login.textContent='Sign in again';login.hidden=true;
  bar.append(identity, state, login, retry, logout); (document.querySelector('.workspace') || document.body).prepend(bar);
  function publish() {
    if (closed) return;
    // Prioritize durable pending metadata over the replaceable remote-history cache.
    if(!connection.storage.setItem(cacheKey+':pending',JSON.stringify(pending))){
      connection.storage.removeItem(cacheKey);
      connection.storage.setItem(cacheKey+':pending',JSON.stringify(pending));
    }
    connection.storage.setItem(cacheKey, JSON.stringify({history}));
    onRecords(recordsFor(mergeEvents(history, pending), bank));
    state.textContent = message || (pending.length ? `${pending.length} attempt${pending.length === 1 ? '' : 's'} waiting to save. Keep this tab open.` : 'All progress saved to your account.');
    retry.hidden = !pending.length && !message; retry.disabled = running;
  }
  async function pull() {
    const remote = [];
    for (let offset = 0;; offset += 500) {
      const result = await client.from('learning_attempts').select('*').eq('student_id', owner.user_id)
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
        const batch = pending.slice(0, 100);
        const result = await client.rpc('sync_learning_attempts', {events: batch, expected_student: owner.user_id});
        if (result.error) throw result.error;
        const acknowledged = new Set(result.data);
        if (batch.some(event => !acknowledged.has(event.event_id))) throw new Error('Incomplete acknowledgement.');
        if (closed) return;
        history = mergeEvents(history, batch); pending = pending.filter(event => !acknowledged.has(event.event_id)); publish();
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
  const unload = event => {if (!closed && pending.length) {event.preventDefault(); event.returnValue = '';}};
  window.addEventListener('beforeunload', unload);
  window.addEventListener('online', flush); window.addEventListener('offline', flush);
  retry.onclick = flush;
  logout.onclick = async () => {
    if(closed)return;
    if (pending.length && !window.confirm(`${pending.length} attempts have not synced. Signing out will discard those waiting attempts. Sign out anyway?`)) return;
    closed = true; clearInterval(timer); window.removeEventListener('beforeunload', unload);
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
window.RevisionAdaptive = {...Adaptive, appendGuest: (events,bank,question,session,kind,result) =>
  mergeEvents(events,[makeEvent(bank,question,session,kind,result)])};
