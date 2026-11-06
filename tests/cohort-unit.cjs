'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {summarise}=require('../src/cohort-progress.cjs');
const asOf='2026-11-06T12:00:00Z';
const bank={meta:{},topics:[{id:'t1'},{id:'t2'},{id:'t3'}],questions:[
 {id:'q1',maxMark:2,prerequisites:['t1']},{id:'q2',maxMark:2,prerequisites:['t1']},
 {id:'q3',maxMark:2,prerequisites:['t1','t3']},{id:'q4',maxMark:2,prerequisites:['t2']},
 {id:'disabled',maxMark:2,prerequisites:['t1'],enabled:false}
]};
const evidence=(student_id,question_id,accuracy=1,latest_fraction=accuracy)=>({student_id,question_id,accuracy,latest_fraction,maximum_marks:2,evidence_days:3,last_at:asOf});
test('topic grades give equal weight to students, omit N and show separate participation',()=>{
 const report=summarise(bank,{as_of:asOf,evidence:[evidence('a','q1'),evidence('a','q2'),evidence('a','q3'),evidence('b','q1',0)]},['a','b','new']);
 const row=report.topics.find(t=>t.topic.id==='t1');
 assert.equal(row.score,3);assert.equal(row.grade,'C');assert.equal(row.contributors,2);assert.equal(row.reached,3);
 assert.equal(report.studentCount,3);assert.equal(report.contributors,2);
 assert.equal(report.topics.find(t=>t.topic.id==='t2').score,null);
 assert.equal(report.topics.find(t=>t.topic.id==='t3').grade,'A');
 assert.equal(report.questions.find(q=>q.question.id==='q4').grade,null);
});
test('struggle ranking uses each student’s latest fractional marks and excludes written self-assessment',()=>{
 const written={id:'written',maxMark:2,type:'written-self-assessment',prerequisites:['t1']};
 const report=summarise({...bank,questions:[...bank.questions,written]},{as_of:asOf,evidence:[
  evidence('a','q1',.2,.5),evidence('b','q1',1,1),evidence('a','q2',0),
  evidence('a','written',0),evidence('outsider','q1',0),evidence('a','disabled',0),
  {...evidence('a','q3'),maximum_marks:99}
 ]},['a','b']);
 assert.deepEqual(report.priorities.map(r=>r.question.id),['q2','q1']);
 assert.equal(report.priorities[1].incorrect,0);assert.equal(report.priorities[1].partial,1);
 assert.equal(report.priorities[1].accuracy,.75);assert.equal(report.priorities[1].contributors,2);
 assert.equal(report.questions.find(q=>q.question.id==='q3').contributors,0);
 assert.equal(report.questions.find(q=>q.question.id==='written').contributors,1);
});
test('an empty class never produces a fictitious E grade or a misleading success rate',()=>{
 const report=summarise(bank,{as_of:asOf,evidence:[]},[]);
 assert.equal(report.contributors,0);assert.equal(report.priorities.length,0);
 assert(report.topics.every(t=>t.grade===null));assert(report.questions.every(q=>q.accuracy===null));
});
