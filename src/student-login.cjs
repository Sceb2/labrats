'use strict';
const {openAccountClient} = require('./account-client.cjs');
const {studentEmail, validatePassword} = require('./student-identity.cjs');
const {selectedSubject}=require('./subjects.cjs');
const selected=selectedSubject(window.OCR_PREVIEW_SUBJECT_ID?'?subject='+window.OCR_PREVIEW_SUBJECT_ID:undefined);
const $ = selector => document.querySelector(selector);
let client, accountConnection;
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
function signedOut() {
  $('#login-form').hidden = false;
  $('#account-panel').hidden = true;
  $('#password-form').reset();
  $('#password-form').hidden = true;
  $('#change-password-toggle').hidden = true;
  $('#change-password-toggle').setAttribute('aria-expanded', 'false');
  $('#password').value = '';
  $('#account-name').textContent = '';
}
async function account() {
  let profile;
  try {profile = await accountConnection.profile();} catch {throw new Error('Your school account is not available yet. Ask your teacher to check it.');}
  if (!profile.active || profile.role !== 'student') throw new Error('This account cannot use student sign-in. Ask your teacher for help.');
  $('#login-form').hidden = true;
  $('#account-panel').hidden = false;
  $('#account-name').textContent = profile.username;
  $('#account-message').textContent = profile.must_change_password
    ? 'Choose your own password before using your account. Do not reuse your temporary password.'
    : 'You are signed in. Practice saves new results to your account; existing browser-only history stays separate.';
  $('#password-heading').textContent = profile.must_change_password ? 'Choose your own password' : 'Change password';
  $('#password-form').hidden = !profile.must_change_password;
  $('#change-password-toggle').hidden = profile.must_change_password;
  $('#change-password-toggle').setAttribute('aria-expanded', 'false');
  $('#continue-practice').hidden = profile.must_change_password;
  return profile;
}
async function clearSession(discardLearning = true) {
  try {await accountConnection.signOut({discardLearning});} finally {signedOut();}
}
function authError(error) {
  if (error?.status === 429 || error?.code === 'over_request_rate_limit') return 'Too many attempts. Wait a few minutes before trying again.';
  if (error?.status === 0 || error?.name === 'AuthRetryableFetchError') return 'Unable to reach sign-in. Check your connection and try again.';
  return 'Sign-in was unsuccessful. Check your username and password, or ask your teacher for help.';
}
async function boot() {
  const practiceTarget=window.OCR_PREVIEW_SUBJECT_URL||selected.practiceUrl;
  const guestLink=document.querySelector('header a');if(guestLink)guestLink.href=practiceTarget;
  $('#continue-practice').href=practiceTarget;
  document.title='Student Login · LabRats';
  const brand=document.querySelector('.brand');if(brand)brand.textContent='LabRats';
  accountConnection = await openAccountClient(); client = accountConnection.client;
  $('#change-password-toggle').addEventListener('click', () => {
    if (busy) return;
    const form = $('#password-form');
    form.hidden = !form.hidden;
    $('#change-password-toggle').setAttribute('aria-expanded', String(!form.hidden));
    if (form.hidden) form.reset();
    else $('#new-password').focus();
  });
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
      } catch (error) { await clearSession(false); status(error.message, true); }
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
      $('#account-name').focus();
    } catch (error) { status(error.message || 'Password update failed. Please try again.', true); }
    finally { setBusy(false); }
  });
  $('#sign-out').addEventListener('click', async () => {
    if (busy) return;
    const pending = accountConnection.pendingCount();
    if (pending && !window.confirm(`${pending} attempts have not synced. Signing out will discard them. Sign out anyway?`)) return;
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
    catch (error) { await clearSession(false); status(error.message, true); }
  } else { signedOut(); status(''); }
}
boot().catch(() => { status('Sign-in is unavailable. Please try again later. Browser-only practice is still available.', true); });
