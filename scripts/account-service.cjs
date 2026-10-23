'use strict';
const {randomBytes, randomUUID} = require('node:crypto');
const {studentEmail} = require('../src/student-identity.cjs');
const {generateUsername} = require('../src/student-usernames.cjs');
function generatePassword() { return randomBytes(18).toString('base64url'); }
function check(result, message) { if (result.error) throw new Error(message); return result.data; }
async function provisionStudent(admin, {username, password, classId}) {
  const created = await admin.auth.admin.createUser({email: studentEmail(username), password, email_confirm: true});
  if (created.error) throw Object.assign(new Error('Could not create student in Auth.'), {code: created.error.code});
  const {user} = created.data;
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
  const scope={target:profile.user_id,operation:randomUUID()};
  const prepared=await admin.rpc('operator_prepare_student_reset',scope);
  check(prepared, prepared.error?.code==='55006'
    ? 'Another reset is in progress. Wait two minutes before retrying.'
    : 'Could not lock student account for reset. Check migration 006 and the current operator tool.');
  check(await admin.auth.admin.updateUserById(profile.user_id, {password}),
    'Password reset failed. Account remains disabled; retry the reset.');
  check(await admin.rpc('operator_finish_student_reset',scope), 'Account remains disabled; retry the reset after two minutes.');
  return profile.user_id;
}
module.exports = {generateUsername, generatePassword, provisionStudent, resetStudent};
