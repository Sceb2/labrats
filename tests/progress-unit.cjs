'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {metadata, mergeEvents, recordsFor, makeEvent} = require('../src/learning-events.cjs');
const bank = require('../questions.json'), q = bank.questions[0];
const {rejectionReason} = require('../src/sync-rejections.cjs');
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
test('a reveal does not prevent the first unaided mark in a later encounter', () => {
  const firstSession={mode:'practice'}, reveal=makeEvent(bank,q,firstSession,'reveal',null,randomUUID);
  const fresh=makeEvent(bank,q,{mode:'practice'},'submit',{score:1},randomUUID);
  fresh.attempted_at=new Date(Date.parse(reveal.attempted_at)+1000).toISOString();
  const record=recordsFor([fresh,reveal,reveal],bank)[q.id];
  assert.deepEqual(record.first,{score:1,max:q.maxMark,outcome:'partial'});
  assert.equal(record.revealed,true);assert.equal(record.correctAfterRetry,false);
  const assisted=makeEvent(bank,q,firstSession,'submit',{score:q.maxMark},randomUUID);
  assisted.attempted_at=new Date(Date.parse(reveal.attempted_at)+500).toISOString();
  assert.equal(recordsFor([assisted,reveal],bank)[q.id].first,null);
  assert.equal(recordsFor([assisted,reveal,fresh],bank)[q.id].first.score,1);
});
test('only definite validation failures are classified for unsaved-attempt review', () => {
  assert.equal(rejectionReason({code:'P0001',message:'Check the device clock'}),'clock');
  assert.equal(rejectionReason({code:'P0001',message:'Unknown question version or maximum mark'}),'version');
  assert.equal(rejectionReason({code:'23514'}),'invalid');
  for(const error of [{code:'42501'},{code:'PGRST202'},{code:'P0001',message:'Unexpected database failure'},{status:503},{name:'AuthRetryableFetchError'}])assert.equal(rejectionReason(error),null);
});
