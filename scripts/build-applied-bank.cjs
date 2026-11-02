'use strict';
// Promote the teacher-approved draft sources into the existing practice schema.
// Waves remains authored in Pilot_Question_Bank.json. Its identities and values
// are retained; this is an additive catalogue release, not a scoring revision.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
// Approved source snapshots. Update only after teacher approval of a revised pack.
const approvedSourceHashes={"forces":"53df18093453874a46c1c167d7ae4bc090f756d0f5bd85dd33f62087495fc36e","electricity":"35c02b30b494d07a35d33b66b3cd3a26b2c1249f287e2d9d26eafcc88eb0964c"};
const forcesLessons={F01:['FO01','FO02'],F02:['FO03'],F03:['FO04','FO05'],F04:['FO06','FO07'],F05:['FO08'],F06:['FO09'],F07:['FO10'],F08:['FO11'],F09:['FO12'],F10:['FO13'],F11:['FO14','FO15'],F12:['FO16'],F13:['FO17']};
function electricityLesson(q){
 const n=Number(q.id.slice(1));
 const specific={13:'EL05',14:'EL05',15:'EL04',16:'EL06',17:'EL04',18:'EL10',19:'EL11',20:'EL12',21:'EL12',22:'EL12',59:'EL06',60:'EL06',61:'EL04',62:'EL04',63:'EL03',102:'EL12',103:'EL15',105:'EL12',106:'EL12',107:'EL02',108:'EL04',109:'EL02',110:'EL03',111:'EL04'};
 if(specific[n])return specific[n];
 for(const [end,id]of [[12,'EL01'],[38,'EL02'],[50,'EL03'],[56,'EL05'],[58,'EL04'],[67,'EL04'],[73,'EL07'],[81,'EL08'],[86,'EL09'],[89,'EL10'],[92,'EL11'],[98,'EL13'],[106,'EL15'],[116,'EL14'],[120,'EL16']])if(n<=end)return id;
 throw Error('No lesson mapping for '+q.id);
}
function buildAppliedBank(){
 const bank=read('applied-science/Pilot_Question_Bank.json'),map=read('applied-science/Physics_Lesson_Map.json');
 bank.questions=bank.questions.filter(q=>q.topic==='Waves');
 const lesson=id=>{const l=map.lessons.find(l=>l.id===id);if(!l)throw Error('Unknown lesson '+id);return l;};
 lesson('EL06').title=lesson('EL06').group='LEDs';
 for(const [file,topic]of [['forces','Forces'],['electricity','Electricity']]){
  const sourceBytes=fs.readFileSync(path.join(root,'content-drafts',file,'questions.json'));
  if(require('node:crypto').createHash('sha256').update(sourceBytes).digest('hex')!==approvedSourceHashes[file])throw Error(file+' source changed: teacher approval and publication hash update are required.');
  const draft=JSON.parse(sourceBytes);
  for(const group of draft.topics){
   if(file==='forces')for(const id of forcesLessons[group.id])lesson(id).group=group.title;
   for(const source of group.questions){
    const ids=file==='forces'?forcesLessons[group.id]:[electricityLesson(source)];
    const parts=source.parts.map(part=>({...part,shuffleOptions:part.type==='choice'?true:undefined,
     modelAnswer:part.modelAnswer||(part.type==='choice'?part.options.find(o=>o.id===part.correctOptionId).text:`${part.answer.value} ${part.answer.unit}`),
     correctFeedback:part.correctFeedback||part.modelAnswer||source.answer||'Correct.',
     incorrectFeedback:part.incorrectFeedback||part.modelAnswer||source.answer||source.workedAnswer}));
    const asset=source.diagram?'assets/'+file+'-'+source.id+'.svg':null;
    if(asset)fs.writeFileSync(path.join(root,'applied-science',asset),source.diagram.svg+'\n');
    bank.questions.push({id:source.id,contentVersion:source.contentVersion,title:source.id+' · '+source.prompt,topic,
     primaryLessonId:ids[0],requiredLessonIds:ids,strand:source.kind==='recall'?'recall':'application',
     assessmentObjectives:[...new Set(parts.map(p=>p.ao))],commandWord:['State','Identify','Calculate','Determine','Compare','Describe','Explain','Suggest','Predict'].includes(parts[0].prompt.split(' ')[0])?parts[0].prompt.split(' ')[0]:parts[0].type==='numeric'?'Calculate':'Identify',
     interaction:source.interaction,maxMarks:source.maxMarks,prompt:source.prompt,parts,
     answerOpening:source.interaction==='answer-completion'?'Explanation:':undefined,openingEarnsMarks:source.interaction==='answer-completion'?false:undefined,
     modelAnswer:source.workedAnswer,generalFeedback:[source.workedAnswer],hint:source.hint,
     sources:source.specRefs.map(ref=>'SPEC '+ref),asset,accessibleDescription:source.diagram?.description||'',
     reviewStatus:'teacher-approved',enabled:true,provenance:'Original practice question; teacher reviewed and approved for LabRats.',
     skillIds:[...new Set(parts.map(p=>ids[0]+'-'+p.ao))],specRefs:source.specRefs,teacherLessonTitle:lesson(ids[0]).group,
     reviewNotes:'Practice marks describe the scaffolded task, not an official examination tariff.'});
   }
  }
 }
 for(const t of map.topics){t.contentState='available';t.selectableInPilot=true;}
 for(const l of map.lessons)l.pilotQuestionIds=bank.questions.filter(q=>q.requiredLessonIds.includes(l.id)).map(q=>q.id);
 bank.title='AAQ Physics · Waves, Forces, Electricity and Energy';
 bank.summary={questionCount:bank.questions.length,recallQuestions:bank.questions.filter(q=>q.strand==='recall').length,
 applicationQuestions:bank.questions.filter(q=>q.strand==='application').length,practiceMarks:bank.questions.reduce((n,q)=>n+q.maxMarks,0),
 writtenSelfAssessmentQuestions:bank.questions.filter(q=>q.interaction==='written-self-assessment').length,
 answerCompletionQuestions:bank.questions.filter(q=>q.interaction==='answer-completion').length};
 if(new Set(bank.questions.map(q=>q.id)).size!==354||bank.questions.length!==354)throw Error('Expected 110 Waves + 124 Forces + 120 Electricity questions.');
 write('applied-science/Pilot_Question_Bank.json',bank);write('applied-science/Physics_Lesson_Map.json',map);
}
if(require.main===module)buildAppliedBank();
module.exports={buildAppliedBank};
