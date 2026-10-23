'use strict';
// Only definite validation failures may be separated from the retry queue.
// Never classify transport errors, missing migrations or permission failures.
const messages = new Map([
  ['Check the device clock', 'clock'],
  ['Unknown question version or maximum mark', 'version'],
  ['Event ID already exists with different data', 'conflict'],
  ['Unexpected learning event fields', 'invalid'],
  ['Invalid learning event values', 'invalid']
]);
function rejectionReason(error) {
  if (error?.code === 'P0001') return messages.get(error.message) || null;
  if (['23502','23503','23505','23514','22P02','22007','22008','22003'].includes(error?.code)) return 'invalid';
  return null;
}
const descriptions = {
  clock: 'The attempt time is outside the allowed range. Check your device clock. You can discard this unsaved attempt and answer the question in a new session.',
  version: 'This question version is not available for saving yet. Ask your teacher to check it, then retry.',
  conflict: 'This attempt ID conflicts with an existing record. Ask your teacher before discarding it.',
  invalid: 'This attempt could not be validated. Ask your teacher to check it.'
};
module.exports = {rejectionReason, descriptions};
