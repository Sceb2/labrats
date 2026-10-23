'use strict';
const C = require('../core.js'), Review = require('../review.js');
const fields = ['event_id','encounter_id','sequence','question_id','bank_version','scoring_version','kind','earned_marks','maximum_marks','is_retry','answer_revealed','attempted_at','session_mode'];
function metadata(event) {return Object.fromEntries(fields.map(key => [key, event[key]]));}
function mergeEvents(...groups) {
  const byId = new Map();
  for (const events of groups) for (const event of events || []) byId.set(event.event_id, metadata(event));
  return [...byId.values()].sort((a,b) => Date.parse(a.attempted_at) - Date.parse(b.attempted_at) || a.encounter_id.localeCompare(b.encounter_id) || a.sequence - b.sequence || a.event_id.localeCompare(b.event_id));
}
function recordsFor(events, bank) {
  const records = {}, ids = new Set(bank.questions.map(q => q.id));
  for (const event of mergeEvents(events)) {
    if (!ids.has(event.question_id) || !C.compatibleBankVersion(event.bank_version, bank) || event.scoring_version !== bank.meta.scoringVersion) continue;
    const result = event.kind === 'submit' ? {score: event.earned_marks, max: event.maximum_marks} : null;
    records[event.question_id] = C.progressEvent(records[event.question_id], event.kind, result);
    Review.apply(records[event.question_id], event.kind, result, Date.parse(event.attempted_at));
  }
  return records;
}
function makeEvent(bank, question, session, kind, result, uuid = () => crypto.randomUUID()) {
  session.learningEncounters ??= {};
  const encounter = session.learningEncounters[question.id] ??= {id: uuid(), sequence: 0, submitted: false, revealed: false};
  encounter.time = Math.max(Date.now(), (encounter.time || 0) + 1);
  const event = {event_id: uuid(), encounter_id: encounter.id, sequence: ++encounter.sequence,
    question_id: question.id, bank_version: bank.meta.bankVersion, scoring_version: bank.meta.scoringVersion,
    kind, earned_marks: kind === 'submit' ? result.score : null, maximum_marks: question.maxMark,
    is_retry: encounter.submitted, answer_revealed: encounter.revealed || kind === 'reveal',
    attempted_at: new Date(encounter.time).toISOString(), session_mode: session.mode};
  if (kind === 'submit') encounter.submitted = true;
  if (kind === 'reveal') encounter.revealed = true;
  return event;
}
module.exports = {metadata, mergeEvents, recordsFor, makeEvent};
