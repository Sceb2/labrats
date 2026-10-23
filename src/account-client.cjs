'use strict';
const {createClient, processLock} = require('@supabase/supabase-js');
const {validatePublicConfig} = require('./student-identity.cjs');
const memory = new Map();
const tabStorage = {
  getItem(key) {if(memory.has(key))return memory.get(key);try {return sessionStorage.getItem(key);} catch {return null;}},
  setItem(key, value) {memory.set(key, value); try {sessionStorage.setItem(key, value);return true;} catch {return false;}},
  removeItem(key) {memory.set(key,null); try {sessionStorage.removeItem(key);} catch {}}
};
function keys() {
  const names = new Set(memory.keys());
  try {Object.keys(sessionStorage).forEach(key => names.add(key));} catch {}
  return [...names];
}
async function openAccountClient() {
  const configCacheKey='ocr-public-auth-config-v1:'+new URL('auth-config.json',location.href).href;
  let config;
  try {
    const response = await fetch('auth-config.json', {cache: 'no-store', signal: AbortSignal.timeout(5000)});
    if (!response.ok) throw new Error('Sign-in settings are unavailable.');
    config = await response.json();
  } catch (error) {
    try {config = JSON.parse(tabStorage.getItem(configCacheKey)); validatePublicConfig(config);} catch {throw error;}
  }
  const {url, key} = validatePublicConfig(config);
  tabStorage.setItem(configCacheKey, JSON.stringify(config));
  const sessionKey = `ocr-student-auth-v1-${new URL(url).host}`;
  const profileKey = `ocr-account-profile-${new URL(url).host}`;
  const prefix = `ocr-learning-${new URL(url).host}-`;
  const client = createClient(url, key, {auth: {storage: tabStorage, storageKey: sessionKey,
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock},
    global: {fetch: (input, init) => fetch(input, {...init, signal: init?.signal || AbortSignal.timeout(15000)})}});
  const read = key => {try {return JSON.parse(tabStorage.getItem(key));} catch {return null;}};
  function clearLearning() {for (const key of keys()) if (key.startsWith(prefix) || key === profileKey) tabStorage.removeItem(key);}
  function rememberProfile(profile) {
    const previous = read(profileKey);
    if (previous && previous.user_id !== profile.user_id) clearLearning();
    tabStorage.setItem(profileKey, JSON.stringify(profile));
  }
  async function profile() {
    const {data: {user}, error} = await client.auth.getUser();
    if (error || !user) throw error || new Error('No signed-in user.');
    const result = await client.from('account_profiles').select('user_id,username,role,active,must_change_password').eq('user_id', user.id).single();
    if (result.error) throw result.error;
    rememberProfile(result.data); return result.data;
  }
  async function signOut({discardLearning = true} = {}) {
    try {return await client.auth.signOut({scope: 'local'});} finally {
      client.auth.stopAutoRefresh(); if (discardLearning) clearLearning();
      for (const name of [sessionKey, `${sessionKey}-user`, `${sessionKey}-code-verifier`]) tabStorage.removeItem(name);
    }
  }
  const pendingCount = () => {const key=prefix+read(profileKey)?.user_id;return (read(key+':pending')||read(key)?.pending||[]).length;};
  return {client, sessionKey, prefix, read, storage: tabStorage, profile, cachedProfile: () => read(profileKey), signOut, pendingCount};
}
module.exports = {openAccountClient};
