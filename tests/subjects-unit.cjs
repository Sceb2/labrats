'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),fs=require('node:fs');
const {appliedLearningBank,subjects,selectedSubject,withGuestMode}=require('../src/subjects.cjs');
const A=require('../src/adaptive.cjs'),Badges=require('../src/rating-badges.cjs'),Events=require('../src/learning-events.cjs');
const source=require('../applied-science/Pilot_Question_Bank.json'),map=require('../applied-science/Physics_Lesson_Map.json');
const bank=appliedLearningBank(source,map),chemistry=require('../questions.json');
test('explicit guest navigation preserves parameters and fragments; ordinary account links stay unchanged',()=>{
 for(const target of ['chemistry.html','applied-science.html','index.html','student-site-preview.html']){
  assert.equal(withGuestMode(target,'?guest=1'),target+'?guest=1');
  assert.equal(withGuestMode(target,''),target);
  assert.equal(withGuestMode(target,'?guest=0'),target);
 }
 assert.equal(withGuestMode('chemistry.html?preview=RC01#main','?guest=1'),'chemistry.html?preview=RC01&guest=1#main');
 assert.equal(withGuestMode('flashcards.html?guest=1&subject=chemistry','?guest=1'),'flashcards.html?guest=1&subject=chemistry');
 assert.equal(withGuestMode('#privacy-notice','?guest=1&subject=applied-science'),'#privacy-notice');
});
test('two subjects have distinct routes and versioned question identities; unknown navigation cannot become an open redirect',()=>{
 assert.equal(subjects.length,2);assert.equal(bank.questions.length,354);assert.equal(new Set(bank.questions.map(q=>q.id)).size,354);
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

test('Applied Science account progress preserves unaided marks, assisted attempts and versions in unordered duplicate history',async()=>{
 const {nativeProgress}=await import('../applied-science/account-bridge.mjs');
 const automatic=source.questions.find(q=>q.maxMarks>1&&q.interaction!=='written-self-assessment');
 const written=source.questions.find(q=>q.interaction==='written-self-assessment');
 const event=(q,n,extra={})=>({event_id:'event-'+n,encounter_id:'encounter-'+n,sequence:1,
  question_id:q.id+'@'+q.contentVersion,bank_version:bank.meta.bankVersion,scoring_version:bank.meta.scoringVersion,
  kind:'submit',earned_marks:1,maximum_marks:q.maxMarks,is_retry:false,answer_revealed:false,
  attempted_at:new Date(Date.UTC(2026,10,6,12,0,n)).toISOString(),session_mode:'practice',...extra});
 const first=event(automatic,1),retry=event(automatic,2,{encounter_id:first.encounter_id,sequence:2,is_retry:true,earned_marks:automatic.maxMarks});
 const reveal=event(written,3,{kind:'reveal',earned_marks:null,answer_revealed:true});
 const assisted=event(written,4,{encounter_id:reveal.encounter_id,sequence:2,answer_revealed:true,earned_marks:written.maxMarks});
 const fresh=event(written,5);
 const history=[fresh,retry,assisted,reveal,first,{...first,response:'PRIVATE-ANSWER',selected:'PRIVATE-CHOICE'},
  event(automatic,6,{bank_version:'unsupported'}),event(automatic,7,{scoring_version:'unsupported'}),
  event(automatic,8,{question_id:automatic.id+'@obsolete'})];
 const progress=nativeProgress(source,bank,history),a=progress.records[first.question_id],w=progress.records[fresh.question_id];
 assert.deepEqual(Object.keys(progress.records).sort(),[first.question_id,fresh.question_id].sort());
 assert.equal(a.first.result.score,1);assert.equal(a.first.submittedAt,first.attempted_at);
 assert.equal(a.latest.result.score,automatic.maxMarks);assert.equal(a.attemptCount,2);assert(a.corrected);
 assert.deepEqual(a.attempts.map(x=>x.result.score),[1,automatic.maxMarks]);
 assert.equal(w.first.submittedAt,fresh.attempted_at);assert.equal(w.first.result.selfAssessedMarks,1);
 assert.equal(w.latest.submittedAt,fresh.attempted_at);assert.equal(w.attemptCount,2);
 assert.equal(w.attempts[0].revealed,true);assert.equal(w.attempts[1].revealed,true);
 assert.equal(w.attempts[2].revealed,false);assert.equal(a.first.result.selfAssessedMarks,null);
 assert(!JSON.stringify(progress).includes('PRIVATE-'));assert.deepEqual(progress.sessions,[]);
});

test('Applied Science keeps the original first result and total count while bounding displayed recent attempts',async()=>{
 const {nativeProgress}=await import('../applied-science/account-bridge.mjs'),q=source.questions[0];
 const history=Array.from({length:15},(_,i)=>({...Events.makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:i?q.maxMarks:0}),
  attempted_at:new Date(Date.UTC(2026,10,6,12,0,i)).toISOString()}));
 const record=nativeProgress(source,bank,[...history].reverse()).records[bank.questions[0].id];
 assert.equal(record.first.result.score,0);assert.equal(record.first.submittedAt,history[0].attempted_at);
 assert.equal(record.latest.submittedAt,history[14].attempted_at);assert.equal(record.attemptCount,15);
 assert.equal(record.attempts.length,10);assert.equal(record.attempts[0].submittedAt,history[5].attempted_at);
 assert.deepEqual(nativeProgress(source,bank,[]),{schema:1,records:{},sessions:[]});
});

test('approved expansion preserves the published Waves questions and maps every new question and diagram without changing its marking rules',()=>{
 const waves=source.questions.filter(q=>q.topic==='Waves');
 assert.equal(createHash('sha256').update(JSON.stringify(waves)).digest('hex'),'e84a620bccf060c42b1e0939f27e5297af6ff96cac42705311888a3c96cab0fd');
 assert.equal(bank.meta.bankVersion,'applied-science-0.4.0');
 for(const [file,topic,count]of [['forces','Forces',124],['electricity','Electricity',120]]){
  const original=require('../content-drafts/'+file+'/questions.json').topics.flatMap(t=>t.questions),promoted=source.questions.filter(q=>q.topic===topic);
  assert.equal(promoted.length,count);
  for(const draft of original){
   const q=promoted.find(q=>q.id===draft.id);assert(q);assert.equal(q.reviewStatus,'teacher-approved');assert.equal(q.contentVersion,draft.contentVersion);assert.equal(q.prompt,draft.prompt);assert.equal(q.maxMarks,draft.maxMarks);
   assert(q.requiredLessonIds.length);assert(q.requiredLessonIds.every(id=>map.lessons.some(l=>l.id===id&&l.topic===topic)));
   for(let i=0;i<draft.parts.length;i++)for(const field of ['type','correctOptionId','answer','ecf','domain','marks'])assert.deepEqual(q.parts[i][field],draft.parts[i][field],q.id+' '+field);
   if(draft.diagram){assert.equal(fs.readFileSync('applied-science/'+q.asset,'utf8').trim(),draft.diagram.svg.trim());assert.equal(q.accessibleDescription,draft.diagram.description);}
   if(q.interaction==='answer-completion'){assert.equal(q.answerOpening,'Explanation:');assert.equal(q.openingEarnsMarks,false);assert(q.parts.every(p=>p.type==='choice'));}
  }
 }
 for(const l of map.lessons)assert(source.questions.some(q=>q.requiredLessonIds.includes(l.id)),'empty topic '+l.id);
 const previous=fs.readFileSync('supabase/migrations/202610240009_applied_science_catalog.sql','utf8'),expanded=fs.readFileSync('supabase/migrations/202611020011_applied_science_forces_electricity_catalog.sql','utf8');
 const rows=sql=>sql.split('\n').filter(line=>line.startsWith("('applied-science',")).map(line=>line.replace(/,$/,''));
 for(const row of rows(previous))assert(rows(expanded).includes(row),'existing catalogue row must not change');
 assert.equal(rows(expanded).length,354);assert.match(expanded,/on conflict do nothing/);
});

test('Electricity regrouping covers all 120 questions exactly once without changing their questions or marks',async()=>{
 const config=require('../applied-science/electricity-topics.json'),draft=require('../content-drafts/electricity/questions.json');
 assert.equal(config.topics.length,10);assert.deepEqual(map.lessons.filter(l=>l.topic==='Electricity').map(l=>l.title),config.topics.map(t=>t.label));
 const ids=config.topics.flatMap(t=>t.questionIds);assert.equal(ids.length,120);assert.equal(new Set(ids).size,120);
 const core=await import('../applied-science/pilot-core.mjs');
 for(const t of config.topics){const eligible=core.eligibility(source,[t.id],{allowDrafts:true}).eligible;assert.deepEqual(eligible.map(q=>q.id).sort(),t.questionIds.slice().sort());assert(eligible.every(q=>q.primaryLessonId===t.id));}
 const original=JSON.parse(fs.readFileSync('content-drafts/electricity/questions.json','utf8')).topics.flatMap(t=>t.questions).sort((a,b)=>a.id.localeCompare(b.id));
 assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),'cf250d7d90c5a83922a48ad7fb84694bd5a6f0b0e8a63b88cc3da8f9b0c97af9');
 for(const t of draft.topics)assert.deepEqual(t.questions.map(q=>q.id),config.topics.find(x=>x.id===t.id).questionIds);
});
