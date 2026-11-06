'use strict';
const subjects=require('../subjects.json');
function selectedSubject(search=typeof location==='undefined'?'':location.search){
  const id=new URLSearchParams(search).get('subject');
  return subjects.find(subject=>subject.id===id)||subjects.find(subject=>subject.id==='chemistry');
}
// Only an explicit guest choice bypasses a saved account session. Carry it
// through learning-mode/subject navigation without changing sign-in links.
function withGuestMode(target,search=typeof location==='undefined'?'':location.search){
  if(new URLSearchParams(search).get('guest')!=='1'||target.startsWith('#'))return target;
  const url=new URL(target,'https://labrats.invalid/');
  url.searchParams.set('guest','1');
  return target.split(/[?#]/)[0]+url.search+url.hash;
}
function preserveGuestLinks(){
  document.querySelectorAll('.choose-subject,.subject-card,.desktop-brand,.mobile-brand-banner a,.privacy-link,.privacy-return').forEach(link=>{
    link.setAttribute('href',withGuestMode(link.getAttribute('href')));
  });
}
function appliedLearningBank(source,map){
  return {meta:{subjectId:'applied-science',bankVersion:'applied-science-'+source.bankVersion,scoringVersion:'applied-1',compatibleBankVersions:[]},
    topics:map.lessons.map(l=>({id:l.id,label:l.title,module:l.topic})),
    questions:source.questions.map(q=>({id:q.id+'@'+q.contentVersion,title:q.title,maxMark:q.maxMarks,prerequisites:q.requiredLessonIds,type:q.interaction,enabled:q.enabled,originalId:q.id,contentVersion:q.contentVersion}))};
}
module.exports={subjects,selectedSubject,appliedLearningBank,withGuestMode,preserveGuestLinks};
