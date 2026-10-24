'use strict';
const subjects=require('../subjects.json');
function selectedSubject(search=typeof location==='undefined'?'':location.search){
  const id=new URLSearchParams(search).get('subject');
  return subjects.find(subject=>subject.id===id)||subjects.find(subject=>subject.id==='chemistry');
}
function appliedLearningBank(source,map){
  return {meta:{subjectId:'applied-science',bankVersion:'applied-science-'+source.bankVersion,scoringVersion:'applied-1',compatibleBankVersions:[]},
    topics:map.lessons.map(l=>({id:l.id,label:l.title,module:l.topic})),
    questions:source.questions.map(q=>({id:q.id+'@'+q.contentVersion,title:q.title,maxMark:q.maxMarks,prerequisites:q.requiredLessonIds,type:q.interaction,enabled:q.enabled,originalId:q.id,contentVersion:q.contentVersion}))};
}
module.exports={subjects,selectedSubject,appliedLearningBank};
