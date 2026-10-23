'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {studentEmail, validatePassword, validatePublicConfig} = require('../src/student-identity.cjs');
const {generateUsername, generatePassword} = require('../scripts/account-service.cjs');
const {args, privateOutput} = require('../scripts/student-accounts.cjs');

test('student identity accepts generated usernames only and never accepts a real email', () => {
  assert.equal(studentEmail(' STUDENT-abc234def567 '), 'student-abc234def567@students.invalid');
  for (const input of ['person@school.example', '../student-abc234def567', 'admin', 'student-abcd']) assert.throws(() => studentEmail(input));
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
