'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/adaptive.cjs'),bank=require('../questions.json');
const now=Date.parse('2026-10-23T12:00:00Z'),q=bank.questions[0];
const event=(day,fraction=1,extra={})=>({event_id:'event-'+day,encounter_id:'encounter-'+day,sequence:1,question_id:q.id,bank_version:bank.meta.bankVersion,scoring_version:bank.meta.scoringVersion,kind:'submit',earned_marks:Math.round(q.maxMark*fraction),maximum_marks:q.maxMark,is_retry:false,answer_revealed:false,attempted_at:new Date(now-day*A.DAY).toISOString(),...extra});
test('ratings credit partial unaided marks and require distributed evidence for A',()=>{
 assert.equal(A.ratings(bank,[],now)[q.id].isNew,true);
 assert.equal(A.ratings(bank,[event(0)],now)[q.id].grade,'C');
 assert.equal(A.ratings(bank,[event(0,.5)],now)[q.id].grade,'C');
 assert.equal(A.ratings(bank,[event(0,0)],now)[q.id].grade,'E');
 assert.equal(A.ratings(bank,[event(2),event(1),event(0)],now)[q.id].grade,'A');
});
test('reveals, retries, duplicate events and incompatible versions cannot inflate ratings',()=>{
 const first=event(0,.5),baseline=A.ratings(bank,[first],now)[q.id];
 const extras=[first,event(1,1,{is_retry:true}),event(2,1,{answer_revealed:true}),event(3,1,{kind:'reveal'}),event(4,1,{scoring_version:'unknown'})];
 assert.deepEqual(A.ratings(bank,extras,now)[q.id],baseline);
});
test('time since recall lowers retention and makes overdue questions more frequent',()=>{
 const history=[event(2),event(1),event(0)],fresh=A.ratings(bank,history,now)[q.id],later=A.ratings(bank,history,now+60*A.DAY)[q.id];
 assert.equal(fresh.grade,'A');assert.ok(later.grade>'A');assert.ok(later.weight>fresh.weight);
 const questions=bank.questions.filter(q=>q.enabled!==false),map=A.ratings(bank,history,now);let state=7;
 const random=()=>{state=(state*16807)%2147483647;return(state-1)/2147483646;};
 const selected=A.select(questions,map,random);assert.ok(selected.length);assert.equal(new Set(selected.map(q=>q.id)).size,selected.length);
 const marks=selected.reduce((sum,q)=>sum+q.maxMark,0);assert.ok(marks>=20&&marks<=23);
});
test('weighted sessions select weak questions more frequently without repeating cards',()=>{
 const questions=Array.from({length:30},(_,i)=>({id:'Q'+i,maxMark:2,type:'reagents'}));
 const map=Object.fromEntries(questions.map((q,i)=>[q.id,{weight:i===0?.05:i===1?36:4}]));
 let state=17,strong=0,weak=0;const random=()=>{state=(state*16807)%2147483647;return(state-1)/2147483646;};
 for(let run=0;run<300;run++){const selected=A.select(questions,map,random);assert.equal(selected.length,10);assert.equal(new Set(selected.map(q=>q.id)).size,10);strong+=selected.some(q=>q.id==='Q0');weak+=selected.some(q=>q.id==='Q1');}
 assert.ok(weak>strong*5);assert.ok(weak>200);
});
