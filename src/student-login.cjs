'use strict';
const {createClient, processLock} = require('@supabase/supabase-js');
const {studentEmail, validatePassword, validatePublicConfig} = require('./student-identity.cjs');
const $ = selector => document.querySelector(selector);
let client, sessionKey, memory = new Map();
let busy = false;
function status(message, error = false) {
  $('#auth-status').textContent = message;
  $('#auth-status').dataset.error = String(error);
}
function setBusy(value) {
  busy = value;
  document.querySelectorAll('button').forEach(button => { button.disabled = value; });
  $('#login-form').setAttribute('aria-busy', String(value));
  $('#password-form').setAttribute('aria-busy', String(value));
}
// Per-tab storage; never read or rewrite legacy revision progress in localStorage.
const storage = {
  getItem(key) { try { return sessionStorage.getItem(key) ?? memory.get(key) ?? null; } catch { return memory.get(key) ?? null; } },
  setItem(key, value) { memory.set(key, value); try { sessionStorage.setItem(key, value); } catch {} },
  removeItem(key) { memory.delete(key); try { sessionStorage.removeItem(key); } catch {} }
};
function signedOut() {
  $('#login-form').hidden = false;
  $('#account-panel').hidden = true;
  $('#password-form').reset();
  $('#password').value = '';
  $('#account-name').textContent = '';
}
async function account() {
  // getUser verifies the token with Auth, rather than trusting a stored session.
  const {data: {user}, error} = await client.auth.getUser();
  if (error || !user) throw new Error('Your session could not be verified. Please sign in again.');
  const {data: profile, error: profileError} = await client.from('account_profiles')
    .select('username,role,active,must_change_password').eq('user_id', user.id).single();
  if (profileError) throw new Error('Your school account is not available yet. Ask your teacher to check it.');
  if (!profile.active || profile.role !== 'student') throw new Error('This account cannot use student sign-in. Ask your teacher for help.');
  $('#login-form').hidden = true;
  $('#account-panel').hidden = false;
  $('#account-name').textContent = profile.username;
  $('#account-message').textContent = profile.must_change_password
    ? 'Choose your own password before using your account. Do not reuse your temporary password.'
    : 'You are signed in. Revision progress is not yet saved to your account.';
  $('#password-heading').textContent = profile.must_change_password ? 'Choose your own password' : 'Change password';
  $('#continue-practice').hidden = profile.must_change_password;
  return profile;
}
async function clearSession() {
  try { await client.auth.signOut({scope: 'local'}); }
  finally {
    // A network failure must not leave credentials in this tab's storage.
    client.auth.stopAutoRefresh();
    for (const key of [sessionKey, `${sessionKey}-user`, `${sessionKey}-code-verifier`]) storage.removeItem(key);
    signedOut();
  }
}
function authError(error) {
  if (error?.status === 429 || error?.code === 'over_request_rate_limit') return 'Too many attempts. Wait a few minutes before trying again.';
  if (error?.status === 0 || error?.name === 'AuthRetryableFetchError') return 'Unable to reach sign-in. Check your connection and try again.';
  return 'Sign-in was unsuccessful. Check your username and password, or ask your teacher for help.';
}
async function boot() {
  const response = await fetch('auth-config.json', {cache: 'no-store'});
  if (!response.ok) throw new Error('Sign-in is not configured yet. Browser-only practice is still available.');
  const {url, key} = validatePublicConfig(await response.json());
  sessionKey = `ocr-student-auth-v1-${new URL(url).host}`;
  client = createClient(url, key, {auth: {storage, storageKey: sessionKey, persistSession: true,
    // Storage is tab-local; serialize Auth in this tab without requiring origin-scoped Web Locks.
    autoRefreshToken: true, detectSessionInUrl: false, lock: processLock},
    global: {fetch: (input, init) => fetch(input, {...init, signal: init?.signal || AbortSignal.timeout(15000)})}});
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    let email;
    try { email = studentEmail($('#username').value); } catch (error) { status(error.message, true); return; }
    setBusy(true); status('Signing in…');
    const password = $('#password').value;
    $('#password').value = '';
    try {
      const {error} = await client.auth.signInWithPassword({email, password});
      if (error) { status(authError(error), true); return; }
      try {
        const profile = await account();
        status(profile.must_change_password ? 'Signed in. Please choose your own password.' : 'Signed in.');
        (profile.must_change_password ? $('#new-password') : $('#account-name')).focus();
      } catch (error) { await clearSession(); status(error.message, true); }
    } catch { status('Unable to reach sign-in. Check your connection and try again.', true); }
    finally { setBusy(false); }
  });
  $('#password-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const password = $('#new-password').value;
    try {
      validatePassword(password);
      if (password !== $('#confirm-password').value) throw new Error('The two passwords do not match.');
    } catch (error) { status(error.message, true); return; }
    setBusy(true); status('Saving password…');
    try {
      const {error} = await client.auth.updateUser({password});
      if (error) {
        status(error.code === 'same_password' ? 'Choose a different password from your temporary or current password.'
          : 'The password could not be changed. Try a different password, or sign in again.', true); return;
      }
      $('#password-form').reset();
      const profile = await account();
      if (profile.must_change_password) throw new Error('Your password changed, but account setup is incomplete. Ask your teacher for help.');
      status('Password saved. Keep it private.');
    } catch (error) { status(error.message || 'Password update failed. Please try again.', true); }
    finally { setBusy(false); }
  });
  $('#sign-out').addEventListener('click', async () => {
    if (busy) return;
    setBusy(true); status('Signing out…');
    try { await clearSession(); status('Signed out of this tab.'); }
    catch { status('Signed out of this tab. The server could not be reached.'); }
    finally { setBusy(false); }
  });
  // Keep event callback synchronous: awaiting Auth calls here can deadlock its lock.
  client.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT' && !busy) { signedOut(); status('Your session ended. Please sign in again.'); }
  });
  const {data: {session}} = await client.auth.getSession();
  if (session) {
    try { await account(); status('Sign-in restored for this tab.'); }
    catch (error) { await clearSession(); status(error.message, true); }
  } else { signedOut(); status('Ready to sign in.'); }
}
boot().catch(() => { status('Sign-in is unavailable. Please try again later. Browser-only practice is still available.', true); });
