'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {studentEmail, validatePassword, validatePublicConfig} = require('../src/student-identity.cjs');
const {generateUsername, generatePassword} = require('../scripts/account-service.cjs');
const {args, privateOutput} = require('../scripts/student-accounts.cjs');
const {createUsernamePicker, createAvailableStudent, capacity} = require('../src/student-usernames.cjs');
const words = require('../docs/username-wordlist-draft.json');

test('student identity accepts generated usernames only and never accepts a real email', () => {
  assert.equal(studentEmail(' STUDENT-abc234def567 '), 'student-abc234def567@students.invalid');
  assert.equal(studentEmail(' BRAVE-OTTER '), 'brave-otter@students.invalid');
  assert.equal(studentEmail('adventurous-hummingbird'), 'adventurous-hummingbird@students.invalid');
  for (const input of ['person@school.example', '../student-abc234def567', 'admin', 'student-abcd123', 'brave--otter', 'brave otter', 'a-otter', 'a'.repeat(21)+'-otter']) assert.throws(() => studentEmail(input));
});
test('reviewed vocabulary covers every pair once per batch and excludes rejected adjectives', () => {
  assert.equal(words.adjectives.length, 128); assert.equal(words.animals.length, 128);
  assert.equal(new Set(words.adjectives).size, 128); assert.equal(new Set(words.animals).size, 128);
  for (const word of [...words.adjectives, ...words.animals]) assert.match(word, /^[a-z]{2,20}$/);
  for (const word of ['blooming','cherry','furry']) assert.equal(words.adjectives.includes(word), false);
  const next = createUsernamePicker(), names = new Set();
  for (let i = 0; i < capacity; i++) {
    const username = next(), [adjective, animal] = username.split('-');
    assert.ok(words.adjectives.includes(adjective)); assert.ok(words.animals.includes(animal));
    studentEmail(username); names.add(username);
  }
  assert.equal(names.size, 16384); assert.throws(next, /All username combinations/);
});
test('occupied Auth names are skipped; unknown failures stop without another account creation', async () => {
  const candidates = ['brave-otter','crisp-goat','silky-owl'], calls = [];
  const admin = {auth:{admin:{createUser:async input => {
    calls.push(input.email);
    return calls.length < 3 ? {error:{code:calls.length === 1 ? 'email_exists' : 'user_already_exists'}}
      : {data:{user:{id:'new-account'}},error:null};
  }}}};
  const result = await createAvailableStudent(admin, () => candidates.shift(), 'private-password');
  assert.equal(result.username, 'silky-owl'); assert.equal(result.user.id, 'new-account');
  assert.deepEqual(calls, ['brave-otter@students.invalid','crisp-goat@students.invalid','silky-owl@students.invalid']);
  let attempts = 0;
  admin.auth.admin.createUser = async () => { attempts++; return {error:{code:'unexpected_failure'}}; };
  await assert.rejects(createAvailableStudent(admin, () => 'brave-otter', 'private-password'), {code:'unexpected_failure'});
  assert.equal(attempts, 1);
  attempts = 0;
  admin.auth.admin.createUser = async () => { attempts++; return {error:{code:'email_exists'}}; };
  await assert.rejects(createAvailableStudent(admin, createUsernamePicker(), 'private-password'), /No available username/);
  assert.equal(attempts, 128);
});
test('credentials use cryptographic generation and satisfy account rules', () => {
  const usernames = new Set(), passwords = new Set();
  for (let i = 0; i < 100; i++) {
    const username = generateUsername(), password = generatePassword();
    studentEmail(username); validatePassword(password); usernames.add(username); passwords.add(password);
    assert.equal(password.length, 24);
  }
  assert.equal(usernames.size, 100); assert.equal(passwords.size, 100);
});
test('password length permits passphrases and rejects short or excessive passwords', () => {
  validatePassword('four unrelated words here');
  validatePassword('x'.repeat(10));
  assert.throws(() => validatePassword('x'.repeat(9)));
  assert.throws(() => validatePassword('short'));
  assert.throws(() => validatePassword('x'.repeat(73)));
  assert.throws(() => validatePassword('🔒'.repeat(20)));
});
test('browser configuration rejects server credentials and insecure remote URLs', () => {
  const anon = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role: 'anon'})).toString('base64url')}.test`;
  const secret = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({role: 'service_role'})).toString('base64url')}.test`;
  for (const publishableKey of ['sb_publishable_test', anon]) validatePublicConfig({supabaseUrl: 'https://project.supabase.co', publishableKey});
  for (const publishableKey of ['sb_secret_bad', secret, 'bad']) assert.throws(() => validatePublicConfig({supabaseUrl: 'https://project.supabase.co', publishableKey}));
  assert.throws(() => validatePublicConfig({supabaseUrl: 'http://project.supabase.co', publishableKey: 'sb_publishable_test'}));
  assert.throws(() => validatePublicConfig({supabaseUrl: 'https://user:pass@project.supabase.co', publishableKey: 'sb_publishable_test'}));
});
test('operator commands reject unbounded batches and malformed student/class identities', () => {
  const base = ['create-students', '--class', '12345678-1234-1234-1234-123456789abc', '--out', '/tmp/private.csv'];
  assert.equal(args([...base, '--count', '5']).options.count, '5');
  for (const count of ['0', '101', '1.5']) assert.throws(() => args([...base, '--count', count]));
  assert.throws(() => args(['reset-student', '--username', 'person@school.example', '--out', '/tmp/private.csv']));
});
test('credential files are private, outside the checkout, and never overwritten', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-credentials-'));
  try {
    const filename = path.join(folder, 'students.csv');
    const {fd} = privateOutput(filename); fs.closeSync(fd);
    assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
    assert.throws(() => privateOutput(filename));
    assert.throws(() => privateOutput(path.join(__dirname, '../credentials.csv')));
    const link = path.join(folder, 'linked-repository'); fs.symlinkSync(path.resolve(__dirname, '..'), link);
    assert.throws(() => privateOutput(path.join(link, 'credentials.csv')));
  } finally { fs.rmSync(folder, {recursive: true, force: true}); }
});
