'use strict';
const C = require('../core.js');
const DAY = 86400000;
const intervals = {A: 21, B: 10, C: 4, D: 1, E: .25};
const grades = ['A','B','C','D','E'];
function gradeFor(value) {return value >= .9 ? 'A' : value >= .75 ? 'B' : value >= .5 ? 'C' : value >= .25 ? 'D' : 'E';}
function ratings(bank, events = [], now = Date.now()) {
  const valid = new Map(bank.questions.map(q => [q.id, q]));
  const seen = new Set(), encounters = new Set(), evidence = {};
  for (const event of [...events].sort((a,b) => Date.parse(a.attempted_at)-Date.parse(b.attempted_at) || a.sequence-b.sequence || String(a.event_id).localeCompare(String(b.event_id)))) {
    const q = valid.get(event.question_id), time = Date.parse(event.attempted_at);
    if (!q || !C.compatibleBankVersion(event.bank_version,bank) || event.scoring_version !== bank.meta.scoringVersion
      || seen.has(event.event_id) || !Number.isFinite(time) || time > now + 300000) continue;
    seen.add(event.event_id);
    if (event.kind !== 'submit' || event.is_retry || event.answer_revealed || event.maximum_marks !== q.maxMark
      || !Number.isInteger(event.earned_marks) || event.earned_marks < 0 || event.earned_marks > q.maxMark) continue;
    const encounter = event.question_id + ':' + event.encounter_id;
    if (encounters.has(encounter)) continue;
    encounters.add(encounter);
    (evidence[q.id] ??= []).push({time: Math.min(now,time), fraction: event.earned_marks / q.maxMark});
  }
  return Object.fromEntries(bank.questions.map(q => {
    const attempts = evidence[q.id] || [];
    if (!attempts.length) return [q.id,{grade:'N',isNew:true,accuracy:null,lastAt:null,dueAt:now,weight:4,evidenceDays:0}];
    // Repeated practice on one day cannot outweigh distributed recall or grant A.
    const days = new Map();
    for (const attempt of attempts) {
      const day = Math.floor(attempt.time / DAY);
      const bucket = days.get(day) || {total:0,count:0,time:0};
      bucket.total += attempt.fraction; bucket.count++; bucket.time = Math.max(bucket.time,attempt.time); days.set(day,bucket);
    }
    let weighted = 0, total = 0;
    for (const bucket of days.values()) {
      const weight = Math.pow(.5,(now-bucket.time)/(30*DAY));
      weighted += bucket.total/bucket.count*weight; total += weight;
    }
    const accuracy = weighted/total, lastAt = attempts[attempts.length-1].time;
    let base = gradeFor(accuracy);
    const cap = days.size >= 3 ? 'A' : days.size >= 2 ? 'B' : 'C';
    if (grades.indexOf(base) < grades.indexOf(cap)) base = cap;
    const retained = accuracy * Math.pow(.5,Math.max(0,now-lastAt)/(intervals[base]*4*DAY));
    let grade = gradeFor(retained);
    if (grades.indexOf(grade) < grades.indexOf(base)) grade = base;
    const dueAt = lastAt + intervals[grade]*DAY;
    const overdue = Math.max(0,Math.min(3,(now-dueAt)/(intervals[grade]*DAY)));
    const rank=grades.indexOf(grade);
    const weight = (1+rank*2)*(now >= dueAt ? 1+overdue : [.05,.1,.15,.6,.8][rank]);
    return [q.id,{grade,isNew:false,accuracy,lastAt,dueAt,weight,evidenceDays:days.size}];
  }));
}
function weightedOrder(questions, ratingMap, random = Math.random) {
  return questions.map(q => ({q,key:-Math.log(Math.max(Number.MIN_VALUE,Math.min(1,random())))/(ratingMap[q.id]?.weight||4)}))
    .sort((a,b)=>a.key-b.key||a.q.id.localeCompare(b.q.id)).map(entry=>entry.q);
}
function select(questions, ratingMap, random = Math.random) {
  const ordered = weightedOrder(questions,ratingMap,random);
  // Preserve weighted order while reusing the tested whole-question mark budget.
  return C.practiceSet(ordered,()=>.999999999);
}
function priority(questions, ratingMap) {
  return [...questions].sort((a,b)=>(ratingMap[b.id]?.weight||4)-(ratingMap[a.id]?.weight||4)||a.id.localeCompare(b.id));
}
module.exports = {ratings,select,weightedOrder,priority,intervals,DAY};
