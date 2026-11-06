'use strict';
const {summarise}=require('./cohort-progress.cjs'),Badges=require('./rating-badges.cjs');
const flashTopics=require('../flashcards/topics.json');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const code=q=>q.type==='flashcard'?q.id.split('/').pop():q.id;
const percent=value=>value===null?'—':Math.round(value*100)+'%';
function grade(row){return row.grade?Badges.badgeHTML(row.grade,{label:'Class-average revision rating',text:'Each student contributes equally. A=5, B=4, C=3, D=2 and E=1. The mean is rounded to a letter; unattempted questions are excluded. This is revision guidance, not an exam grade.'})+` <span class="small-note">${row.score.toFixed(1)}/5</span>`:'<span class="small-note">No graded attempts</span>';}
async function mount({connection,subject,classId,studentIds,bank,container}){
 const host=document.createElement('div');host.className='cohort-report';container.replaceChildren(host);
 let channel='questions',request=0;const cache=new Map();
 const $=selector=>host.querySelector(selector);
 async function load(next=channel){
  channel=next;const ticket=++request;
  shell();$('#cohort-results').innerHTML='<p role="status">Loading class progress…</p>';
  try{
   if(!cache.has(channel)){
    const version=channel==='flashcards'?'flashcards-1':bank.meta.bankVersion;
    const r=await connection.client.rpc('class_progress_summary',{target_class:classId,channel,
     compatible_versions:channel==='flashcards'?[version]:[...new Set([version,...bank.meta.compatibleBankVersions||[]])],
     scoring:channel==='flashcards'?'flashcards-1':bank.meta.scoringVersion});
    if(!host.isConnected||ticket!==request)return;
    if(r.error)throw r.error;
    const result=r.data;
    if(result.class_id!==classId||result.subject_id!==subject||result.channel!==channel||result.student_count!==studentIds.length)
     throw Error('Class membership changed. Refresh the staff dashboard.');
    const catalogue=channel==='questions'?bank:{meta:{subjectId:subject,bankVersion:'flashcards-1',scoringVersion:'flashcards-1'},
     topics:flashTopics[subject],questions:result.cards.map(c=>({id:c.id,title:c.title,maxMark:1,type:'flashcard',prerequisites:[c.topic_id]}))};
    cache.set(channel,summarise(catalogue,result,studentIds));
   }
   if(host.isConnected&&ticket===request)render(cache.get(channel));
  }catch(error){if(host.isConnected&&ticket===request){const missing=['PGRST202','42883'].includes(error.code);$('#cohort-results').innerHTML=`<p role="alert">${missing?'Class progress needs Supabase migration 016 before it can load.':esc(error.message||'Class progress is unavailable. Refresh to retry.')}</p>`;}}
 }
 function shell(){
  host.innerHTML=`<div class="staff-report-tabs" role="tablist" aria-label="Class progress type">${[['questions','Active Learning'],['flashcards','Flashcards']].map(([id,label])=>`<button type="button" role="tab" id="cohort-tab-${id}" aria-controls="cohort-results" aria-selected="${channel===id}" tabindex="${channel===id?'0':'-1'}">${label}</button>`).join('')}</div><div id="cohort-results" role="tabpanel" aria-labelledby="cohort-tab-${channel}"></div>`;
  const tabs=[...host.querySelectorAll('[role=tab]')];tabs.forEach((tab,i)=>{
   tab.onclick=()=>void load(i===0?'questions':'flashcards');
   tab.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-i;void load(next===0?'questions':'flashcards');host.querySelectorAll('[role=tab]')[next].focus();};
  });
 }
 function render(report){
  const flash=channel==='flashcards',noun=flash?'cards':'questions';
  const gradedTopics=report.topics.filter(row=>row.total&&row.contributors),newTopics=report.topics.filter(row=>row.total&&!row.contributors);
  $('#cohort-results').innerHTML=`<p class="small-note">${flash?'Self-reported flashcard recall, separate from question results.':'Current revision ratings from saved account practice.'} Guest activity is not included.</p>
   <div class="staff-grid cohort-stats"><div><h3>Class size</h3><p class="stat">${report.studentCount}</p></div><div><h3>Students contributing</h3><p class="stat">${report.contributors}<span class="small-note"> / ${report.studentCount}</span></p></div><div><h3>${flash?'Cards':'Questions'} reached</h3><p class="stat">${report.reached}<span class="small-note"> / ${report.questions.length}</span></p></div></div>
   <h2>Topic averages</h2><p class="small-note">Each student counts equally. Unattempted ${noun} are excluded.</p>
   <div class="table-wrap"><table class="cohort-topics"><thead><tr><th>Topic</th><th>Average rating</th><th>Participation</th></tr></thead><tbody>${gradedTopics.map(row=>`<tr><td><button type="button" class="btn text-button cohort-topic-link" data-cohort-topic="${esc(row.topic.id)}">${esc(row.topic.label)}</button></td><td>${grade(row)}</td><td>${row.contributors} / ${report.studentCount} students<span class="small-note cohort-subline">${row.reached} / ${row.total} ${noun}</span></td></tr>`).join('')||`<tr><td colspan="3">${report.questions.length?'No graded attempts yet.':'No published '+noun+' in this subject yet.'}</td></tr>`}</tbody></table></div>
   ${newTopics.length?`<details class="cohort-unattempted"><summary>Topics without graded attempts (${newTopics.length})</summary><ul>${newTopics.map(row=>`<li><button class="btn text-button" type="button" data-cohort-topic="${esc(row.topic.id)}">${esc(row.topic.label)}</button><span class="small-note">0 / ${report.studentCount} students · ${row.total} ${noun}</span></li>`).join('')}</ul></details>`:''}
   <h2>${flash?'Cards often marked Not yet':'Questions students struggle with'}</h2><p class="small-note">${flash?'Latest initial self-assessment per student.':'Latest unaided answer per student; partial credit is shown separately.'} ${flash?'Ordered by the proportion marked Not yet.':'Ordered by the proportion losing marks.'} Retries and reveals are excluded.</p>
   <ol class="cohort-priorities">${report.priorities.slice(0,12).map(row=>`<li><div><strong>${esc(code(row.question))}</strong><span>${esc(row.question.title)}</span></div><p>${row.notFull} / ${row.contributors} ${flash?'marked Not yet':'not fully correct'}${!flash?` · ${row.incorrect} incorrect, ${row.partial} partial`:''}<span class="cohort-subline small-note">${percent(row.accuracy)} ${flash?'Got it':'average marks'}${row.contributors<3?' · Limited data':''}</span></p></li>`).join('')||`<li>${report.contributors?'No lost marks in the eligible latest results.':'No graded attempts yet.'}</li>`}</ol>
   <details id="cohort-question-detail"><summary>Every ${flash?'flashcard':'question'}</summary><div class="cohort-question-tools"><label class="control">Topic<select id="cohort-topic-filter"><option value="">All topics</option>${report.topics.filter(row=>row.total).map(row=>`<option value="${esc(row.topic.id)}">${esc(row.topic.label)}</option>`).join('')}</select></label><label class="control">Find a ${flash?'card':'question'}<input id="cohort-question-search" type="search" placeholder="Code or wording"></label></div><div id="cohort-question-list"></div></details>
   <details class="cohort-method"><summary>How these figures work</summary><p>A=5, B=4, C=3, D=2 and E=1. We average each student's current graded ${noun} within a topic, then average those students equally. The letter rounds that score to the nearest grade. N and students without a graded attempt are excluded.</p><p>Ratings use the same recall, partial-mark and elapsed-time rules as student pages. ${flash?'These are self-assessments, not automatically marked results. Only current cards in published packs are included.':'Written self-assessment can contribute to topic ratings and is labelled in the question list. It is excluded from the questions-to-revisit list.'} ${noun[0].toUpperCase()+noun.slice(1)} can contribute to several topics. Current class members share their subject progress across classes.</p><p>Low participation is shown explicitly; a high average can come from a small subset of the class. Updated ${esc(new Date(report.asOf).toLocaleString('en-GB'))}. Refresh the staff dashboard for new results.</p></details>`;
  function questionList(){
   const topic=$('#cohort-topic-filter').value,text=$('#cohort-question-search').value.toLowerCase();
   const rows=report.questions.filter(row=>(!topic||row.question.prerequisites.includes(topic))&&
    (row.question.id+' '+row.question.title).toLowerCase().includes(text));
   $('#cohort-question-list').innerHTML=`<p class="small-note">${rows.length} ${noun}</p><div class="table-wrap"><table><thead><tr><th>${flash?'Card':'Question'}</th><th>Average rating</th><th>Students graded</th><th>Latest ${flash?'Got it':'average marks'}</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(code(row.question))} · ${esc(row.question.title)}${row.selfAssessed?'<span class="small-note cohort-subline">Written self-assessment</span>':''}</td><td>${grade(row)}</td><td>${row.contributors} / ${report.studentCount}</td><td>${percent(row.accuracy)}</td></tr>`).join('')||'<tr><td colspan="4">No matching questions.</td></tr>'}</tbody></table></div>`;
  }
  $('#cohort-topic-filter').onchange=questionList;$('#cohort-question-search').oninput=questionList;
  host.querySelectorAll('[data-cohort-topic]').forEach(button=>button.onclick=()=>{
   $('#cohort-question-detail').open=true;$('#cohort-topic-filter').value=button.dataset.cohortTopic;questionList();$('#cohort-topic-filter').focus();$('#cohort-question-detail').scrollIntoView({block:'start'});
  });questionList();
 }
 await load();
}
module.exports={mount};
