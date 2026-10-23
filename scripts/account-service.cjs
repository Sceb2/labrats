'use strict';
const {randomInt, randomBytes} = require('node:crypto');
const {studentEmail} = require('../src/student-identity.cjs');
const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
function generateUsername() {
  return 'student-' + Array.from({length: 12}, () => alphabet[randomInt(alphabet.length)]).join('');
}
function generatePassword() { return randomBytes(18).toString('base64url'); }
function check(result, message) { if (result.error) throw new Error(message); return result.data; }
async function provisionStudent(admin, {username, password, classId}) {
  const {user} = check(await admin.auth.admin.createUser({email: studentEmail(username), password,
    email_confirm: true}), 'Could not create student in Auth.');
  try {
    check(await admin.from('account_profiles').insert({user_id: user.id, role: 'student', username,
      must_change_password: true}), 'Could not create student profile.');
    if (classId) check(await admin.from('class_students').insert({class_id: classId, student_id: user.id}),
      'Could not assign class.');
    return user.id;
  } catch (error) {
    const removed = await admin.auth.admin.deleteUser(user.id);
    if (removed.error) throw new Error(`Provisioning failed; an operator must remove incomplete Auth user ${user.id}.`);
    throw error;
  }
}
async function resetStudent(admin, username, password) {
  const profile = check(await admin.from('account_profiles').select('user_id').eq('username', username)
    .eq('role', 'student').single(), 'Student account not found.');
  check(await admin.rpc('prepare_student_password_reset', {target: profile.user_id}), 'Could not lock student account for reset.');
  check(await admin.auth.admin.updateUserById(profile.user_id, {password}),
    'Password reset failed. Account remains disabled; retry the reset.');
  check(await admin.from('account_profiles').update({active: true, must_change_password: true})
    .eq('user_id', profile.user_id), 'Account remains disabled; retry the reset.');
  return profile.user_id;
}
module.exports = {generateUsername, generatePassword, provisionStudent, resetStudent};
