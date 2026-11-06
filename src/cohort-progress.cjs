'use strict';
const Adaptive=require('./adaptive.cjs');
const grades=['A','B','C','D','E'];
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
function averageGrade(score){return score===null?null:grades[Math.min(4,Math.max(0,5-Math.round(score)))];}
function summarise(bank,summary,studentIds){
 const now=Date.parse(summary.as_of),roster=new Set(studentIds),questions=bank.questions.filter(q=>q.enabled!==false);
 if(!Number.isFinite(now))throw Error('Class report timestamp unavailable.');
 const byQuestion=new Map(questions.map(q=>[q.id,{question:q,students:new Map()}]));
 for(const evidence of summary.evidence){
  const row=byQuestion.get(evidence.question_id),lastAt=Date.parse(evidence.last_at);
  if(!row||!roster.has(evidence.student_id)||evidence.maximum_marks!==row.question.maxMark
   ||!Number.isFinite(evidence.accuracy)||evidence.accuracy<0||evidence.accuracy>1
   ||!Number.isInteger(evidence.evidence_days)||evidence.evidence_days<1||!Number.isFinite(lastAt)
   ||!Number.isFinite(evidence.latest_fraction)||evidence.latest_fraction<0||evidence.latest_fraction>1)continue;
  const rating=Adaptive.ratingFromEvidence({accuracy:evidence.accuracy,lastAt,evidenceDays:evidence.evidence_days},now);
  row.students.set(evidence.student_id,{grade:rating.grade,points:5-grades.indexOf(rating.grade),fraction:evidence.latest_fraction});
 }
 const contributors=new Set();
 const rows=[...byQuestion.values()].map(row=>{
  const values=[...row.students.values()];for(const id of row.students.keys())contributors.add(id);
  const score=mean(values.map(v=>v.points)),incorrect=values.filter(v=>v.fraction===0).length,
   partial=values.filter(v=>v.fraction>0&&v.fraction<1).length;
  return {...row,contributors:values.length,score,grade:averageGrade(score),incorrect,partial,
   notFull:incorrect+partial,notFullRate:values.length?(incorrect+partial)/values.length:0,
   accuracy:mean(values.map(v=>v.fraction)),selfAssessed:row.question.type==='written-self-assessment'};
 });
 const topics=bank.topics.map(topic=>{
  const related=rows.filter(row=>row.question.prerequisites.includes(topic.id)),students=new Map();
  for(const row of related)for(const [id,value]of row.students){if(!students.has(id))students.set(id,[]);students.get(id).push(value.points);}
  // Each contributing student has equal weight, regardless of how many cards
  // they attempted. Unattempted questions and students contribute no zeroes.
  const studentMeans=[...students.values()].map(values=>mean(values)),score=mean(studentMeans);
  return {topic,score,grade:averageGrade(score),contributors:students.size,
   reached:related.filter(row=>row.contributors).length,total:related.length};
 });
 const priorities=rows.filter(row=>!row.selfAssessed&&row.notFull>0).sort((a,b)=>
  b.notFullRate-a.notFullRate||a.accuracy-b.accuracy||b.contributors-a.contributors||a.question.id.localeCompare(b.question.id));
 return {topics,questions:rows,priorities,studentCount:roster.size,contributors:contributors.size,
  reached:rows.filter(row=>row.contributors).length,asOf:summary.as_of};
}
module.exports={summarise,averageGrade};
