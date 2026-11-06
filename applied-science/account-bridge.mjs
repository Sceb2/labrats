import Subjects from '../src/subjects.cjs';
import Events from '../src/learning-events.cjs';
const {appliedLearningBank}=Subjects;
export function learningBank(source,map){return appliedLearningBank(source,map);}
export function nativeProgress(source,bank,events){
 const records={},merged=Events.mergeEvents(events),histories=new Map();
 const questions=new Map(source.questions.map(q=>[q.id+'@'+q.contentVersion,q]));
 for(const event of merged){
  if(event.bank_version!==bank.meta.bankVersion||event.scoring_version!==bank.meta.scoringVersion)continue;
  const history=histories.get(event.question_id)||[];history.push(event);histories.set(event.question_id,history);
 }
 for(const [id,record]of Object.entries(Events.recordsFromMerged(merged,bank))){
  const q=questions.get(id);if(!q)continue;
  const history=histories.get(id)||[];
  const attempt=event=>({questionId:q.id,contentVersion:q.contentVersion,maxMarks:q.maxMarks,submittedAt:event.attempted_at,
    revealed:event.kind==='reveal'||event.answer_revealed,result:{score:event.earned_marks||0,directMarks:event.earned_marks||0,ecfMarks:0,
      selfAssessedMarks:q.interaction==='written-self-assessment'?event.earned_marks:null}});
  const firstEvent=history.find(e=>e.kind==='submit'&&!e.is_retry&&!e.answer_revealed);
  const first=firstEvent?attempt(firstEvent):history[0]?attempt(history[0]):null;
  records[id]={questionId:q.id,contentVersion:q.contentVersion,first,latest:history.length?attempt(history.at(-1)):first,attempts:history.slice(-10).map(attempt),attemptCount:record.attempts,corrected:record.correctAfterRetry};
 }
 return {schema:1,records,sessions:[]};
}
export function prepareEncounter(session,q,e){
 session.learningEncounters??={};const id=q.id+'@'+q.contentVersion;
 const encounter=session.learningEncounters[id]??={id:crypto.randomUUID(),sequence:0,submitted:session.mode==='retry',revealed:false};
 if(e.hintUsed)encounter.revealed=true;
 session.learningMode=session.mode==='retry'?'mistakes':session.mode==='review'?'preview':'practice';
 return id;
}
