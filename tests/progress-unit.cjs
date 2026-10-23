'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {metadata, mergeEvents, recordsFor, makeEvent} = require('../src/learning-events.cjs');
const bank = require('../questions.json'), q = bank.questions[0];
test('event history retains only metadata, never selected answers or response text', () => {
  const session = {mode: 'practice'}, result = {score: 1, max: 2, details: [{selected: 'secret answer'}]};
  const event = makeEvent(bank,q,session,'submit',result,randomUUID);
  const clean = metadata({...event, response: 'private response', student_id: 'other-user'});
  assert.equal(Object.keys(clean).length,13);
  assert.equal(JSON.stringify(clean).includes('private'),false);
  assert.equal(JSON.stringify(clean).includes('selected'),false);
  assert.equal('student_id' in clean,false);
});
test('retries and reveals are per encounter; a fresh session can have an unaided first submission', () => {
  const session = {mode:'practice'};
  const reveal = makeEvent(bank,q,session,'reveal',null,randomUUID);
  const attempt = makeEvent(bank,q,session,'submit',{score:2},randomUUID);
  const retry = makeEvent(bank,q,session,'submit',{score:2},randomUUID);
  assert.equal(reveal.answer_revealed,true); assert.equal(attempt.answer_revealed,true);
  assert.equal(attempt.is_retry,false); assert.equal(retry.is_retry,true);
  assert.deepEqual([reveal.sequence,attempt.sequence,retry.sequence],[1,2,3]);
  const fresh = makeEvent(bank,q,{mode:'practice'},'submit',{score:2},randomUUID);
  assert.equal(fresh.answer_revealed,false); assert.equal(fresh.is_retry,false);
  assert.notEqual(fresh.encounter_id,attempt.encounter_id);
});
test('duplicate and out-of-order uploads converge without overwriting the first result', () => {
  const session = {mode:'practice'};
  const wrong = makeEvent(bank,q,session,'submit',{score:0},randomUUID);
  const right = makeEvent(bank,q,session,'submit',{score:2},randomUUID);
  const merged = mergeEvents([right],[wrong,wrong]);
  assert.equal(merged.length,2);
  const records = recordsFor(merged,bank);
  assert.equal(records[q.id].first.score,0); assert.equal(records[q.id].attempts,2);
  assert.equal(records[q.id].review.outstanding,false); assert.equal(records[q.id].correctAfterRetry,true);
  assert.deepEqual(recordsFor([wrong,right],bank),recordsFor([right,wrong],bank));
});
test('different bank/scoring versions cannot contaminate the current progress projection', () => {
  const event = makeEvent(bank,q,{mode:'practice'},'submit',{score:2},randomUUID);
  assert.deepEqual(recordsFor([{...event,scoring_version:'unsupported'}],bank),{});
  assert.deepEqual(recordsFor([{...event,bank_version:'unsupported'}],bank),{});
});
