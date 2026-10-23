'use strict';
// Server-only generation from the school's reviewed vocabulary (one source).
const {adjectives, animals} = require('../docs/username-wordlist-draft.json');
const capacity = adjectives.length * animals.length;
function randomIndex(limit) {
  const range = 0x100000000, ceiling = range - range % limit;
  let value;
  do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= ceiling);
  return value % limit;
}
const usernameAt = index => `${adjectives[Math.floor(index / animals.length)]}-${animals[index % animals.length]}`;
function generateUsername() { return nextGeneratedUsername(); }
function createUsernamePicker(pick = randomIndex) {
  // Partial Fisher–Yates: each pair is considered once per batch, even when
  // occupied names need to be skipped. Auth's unique email enforces concurrency.
  let remaining = capacity;
  const swaps = new Map();
  return () => {
    if (!remaining) throw new Error('All username combinations have been considered. Expand the word lists.');
    const index = pick(remaining), value = swaps.get(index) ?? index;
    remaining--;
    swaps.set(index, swaps.get(remaining) ?? remaining);
    swaps.delete(remaining);
    return usernameAt(value);
  };
}
const nextGeneratedUsername = createUsernamePicker();
const isUsernameConflict = error => ['email_exists', 'user_already_exists'].includes(error?.code);
async function createAvailableStudent(admin, nextUsername, password) {
  // Bound external calls in a request; never retry timeouts or unknown failures
  // because Auth may already have created an account in those cases.
  for (let attempt = 0; attempt < 128; attempt++) {
    const username = nextUsername();
    const result = await admin.auth.admin.createUser({email: `${username}@students.invalid`, password, email_confirm: true});
    if (isUsernameConflict(result.error)) continue;
    if (result.error) throw result.error;
    return {username, user: result.data.user};
  }
  throw new Error('No available username found. Check account capacity before retrying.');
}
module.exports = {generateUsername, createUsernamePicker, createAvailableStudent, isUsernameConflict, capacity};
