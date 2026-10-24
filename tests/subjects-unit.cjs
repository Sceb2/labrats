'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),fs=require('node:fs');
const {appliedLearningBank,subjects,selectedSubject}=require('../src/subjects.cjs');
const A=require('../src/adaptive.cjs'),Badges=require('../src/rating-badges.cjs'),Events=require('../src/learning-events.cjs');
const source=require('../applied-science/Pilot_Question_Bank.json'),map=require('../applied-science/Physics_Lesson_Map.json');
const bank=appliedLearningBank(source,map),chemistry=require('../questions.json');
test('two subjects have distinct routes and versioned question identities; unknown navigation cannot become an open redirect',()=>{
 assert.equal(subjects.length,2);assert.equal(bank.questions.length,110);assert.equal(new Set(bank.questions.map(q=>q.id)).size,110);
 assert.notEqual(bank.meta.bankVersion,chemistry.meta.bankVersion);
 assert.equal(selectedSubject('?subject=applied-science').practiceUrl,'applied-science.html');
 assert.equal(selectedSubject('?subject=https://untrusted.invalid').practiceUrl,'chemistry.html');
 for(const subject of subjects)assert(fs.existsSync(subject.practiceUrl));
});
test('unattempted questions have N with the same non-zero selection weight; a failed first answer is E',()=>{
 const q=chemistry.questions[0],now=Date.now();
 assert.equal(A.ratings(chemistry,[],now)[q.id].grade,'N');assert.equal(A.ratings(chemistry,[],now)[q.id].weight,4);
 const event=Events.makeEvent(chemistry,q,{mode:'practice'},'submit',{score:0});
 assert.equal(A.ratings(chemistry,[event],now)[q.id].grade,'E');
 assert.deepEqual(Object.keys(Badges.descriptions),['N','A','B','C','D','E']);
 for(const grade of Object.keys(Badges.descriptions)){assert.match(Badges.badgeHTML(grade),/data-rating-tip/);assert(Badges.descriptions[grade].text.length>20);}
});
test('a matching question ID from a different subject bank cannot change its rating or records',()=>{
 const original=chemistry.questions[0],q={...bank.questions[0],id:original.id},other={...bank,questions:[q]};
 const event=Events.makeEvent(chemistry,original,{mode:'practice'},'submit',{score:original.maxMark});
 assert.equal(A.ratings(other,[event])[q.id].grade,'N');assert.deepEqual(Events.recordsFor([event],other),{});
});
test('all imported automatic questions retain full-credit authored answers, including final-answer routes',async()=>{
 const core=await import('../applied-science/pilot-core.mjs');
 const before=JSON.stringify(source);
 for(const q of source.questions.filter(q=>q.interaction!=='written-self-assessment')){
  const answer=Object.fromEntries(q.parts.map(part=>[part.id,part.type==='choice'?part.correctOptionId:part.answer.value]));
  assert.equal(core.markQuestion(q,answer).score,q.maxMarks,q.id);
  if(q.unscaffoldedFinalAnswerRoute?.enabled)assert.equal(core.markQuestion(q,answer,'final-answer').score,q.maxMarks,q.id);
 }
 assert.equal(JSON.stringify(source),before);
});
test('Applied Science sessions retain the lesson gates, mark budget and one-question-per-family rule with adaptive ordering',async()=>{
 const core=await import('../applied-science/pilot-core.mjs'),lessons=map.lessons.filter(l=>l.topic==='Waves').map(l=>l.id);
 for(let seed=1;seed<=20;seed++){
  const order=A.weightedOrder(bank.questions,A.ratings(bank,[]),core.seededRandom(seed));
  const priority=Object.fromEntries(order.map((q,i)=>[q.originalId,i]));
  const plan=core.selectSession(source,lessons,{allowDrafts:true,seed,priority});
  assert(plan.actualMarks>0&&plan.actualMarks<=20);assert.equal(new Set(plan.questionIds).size,plan.questionIds.length);
  const families=plan.questionIds.map(id=>source.questions.find(q=>q.id===id)).map(q=>q.familyId||q.id);assert.equal(new Set(families).size,families.length);
 }
 assert.equal(core.selectSession(source,[],{allowDrafts:true}).questionCount,0);
});
test('Applied Science hints/retries and account projections never persist selected answers or written responses',async()=>{
 const {prepareEncounter,nativeProgress}=await import('../applied-science/account-bridge.mjs');
 const q=source.questions[0],mapped=bank.questions[0],session={mode:'retry'};
 prepareEncounter(session,q,{hintUsed:true});
 const event=Events.makeEvent(bank,mapped,{...session,mode:session.learningMode},'submit',{score:q.maxMarks,response:'PRIVATE-WORK'});
 assert(event.is_retry);assert(event.answer_revealed);assert.equal(Object.keys(event).length,13);assert(!JSON.stringify(event).includes('PRIVATE-WORK'));
 const projection=nativeProgress(source,bank,[event]);assert(!JSON.stringify(projection).includes('responses'));assert(!JSON.stringify(projection).includes('writtenText'));
 assert.equal(A.ratings(bank,[event])[mapped.id].grade,'N');
});
