'use strict';
const USERNAME = /^student-[a-z2-9]{12}$/;
function normalizeUsername(value) { return String(value || '').trim().toLowerCase(); }
function studentEmail(value) {
  const username = normalizeUsername(value);
  if (!USERNAME.test(username)) throw new Error('Enter the student username your teacher gave you.');
  return `${username}@students.invalid`;
}
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Use at least 12 characters. A few unrelated words work well.');
  // Auth uses bcrypt; never silently accept a password beyond its 72-byte boundary.
  if (new TextEncoder().encode(password).length > 72) throw new Error('That password is too long. Please use a shorter passphrase.');
}
function validatePublicConfig(config) {
  const url = new URL(config.supabaseUrl);
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Invalid Supabase project URL.');
  }
  const key = config.publishableKey;
  if (typeof key !== 'string') throw new Error('Missing public API key.');
  let isAnon = false;
  if (key.startsWith('eyJ')) {
    try { isAnon = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; } catch {}
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key) && !isAnon) {
    throw new Error('Only a publishable or legacy anon key may be used in the browser.');
  }
  return {url: url.origin, key};
}
module.exports = {USERNAME, normalizeUsername, studentEmail, validatePassword, validatePublicConfig};
