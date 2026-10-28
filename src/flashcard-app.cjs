'use strict';
require('./progress-sync.cjs');
const {openAccountClient}=require('./account-client.cjs');
const {createClient}=require('@supabase/supabase-js');
const F=require('./flashcards.cjs'),A=require('./adaptive.cjs'),Events=require('./learning-events.cjs'),Badges=require('./rating-badges.cjs');
const {selectedSubject}=require('./subjects.cjs'),topics=require('../flashcards/topics.json');
const params=new URLSearchParams(location.search),subject=selectedSubject(),demo=!!window.LABRATS_FLASHCARD_DEMO;
const selected=(params.get('topics')||(demo&&subject.id==='chemistry'?'basic':'')).split(',').filter(id=>topics[subject.id].some(t=>t.id===id));
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={cards:[],bank:null,events:[],sync:null,session:null,mode:'twenty'};
const activeURL=demo?(subject.id==='chemistry'?'student-site-preview.html':'applied-science-preview.html'):subject.practiceUrl;
function events(){return state.sync?state.sync.events():state.events;}
function ratings(){return A.ratings(state.bank,events());}
function focus(selector='#app h1, #app h2'){const h=$(selector);if(h){h.tabIndex=-1;h.focus({preventScroll:true});}window.scrollTo(0,0);}
function header(title,finish=false){return `<header class="flashcard-toolbar"><h1>${esc(title)}</h1><div data-account-actions>${finish?'<button class="btn finish-session" id="finish-flashcards">Finish session</button>':`<a class="btn finish-session" href="${activeURL}">Choose topics</a>`}</div></header>`;}
function guestNote(){return state.sync?'':`<p class="notice">Log in to remember your progress. Guest results are not saved.${demo?'':` <a href="student-login.html?subject=${subject.id}">Student Login</a>`}</p>`;}
function setup(){
 if(state.session?.current||state.session?.queue.length){render();return;}
 $('#app').innerHTML=`<section class="card setup-page">${header('Flashcards')}<p>${esc(subject.label)} · ${selected.map(id=>esc(topics[subject.id].find(t=>t.id===id).label)).join(', ')||'No topics selected'}</p><nav class="study-modes" aria-label="Learning mode"><a class="btn secondary" href="${activeURL}">Active Learning</a><span class="btn" aria-current="page">Flashcards</span></nav>${guestNote()}<p id="flashcard-available">${state.cards.length} cards available</p><fieldset class="flashcard-options"><legend>Session length</legend><label><input type="radio" name="flash-length" value="twenty" ${state.mode==='twenty'?'checked':''}>20 cards</label><label><input type="radio" name="flash-length" value="open" ${state.mode==='open'?'checked':''}>Open Mode</label></fieldset><p class="small-note">Missed cards can return once, after other cards where possible. Retries do not improve your revision rating.</p><button class="btn" id="start-flashcards" ${state.cards.length?'':'disabled'}>Start flashcards</button>${!state.cards.length?'<p>No published cards match these topics yet. Choose another topic or ask your teacher.</p>':''}<p><button class="btn text-button" id="see-flashcard-progress">Flashcard progress</button></p></section>`;
 document.querySelectorAll('[name=flash-length]').forEach(el=>el.onchange=()=>state.mode=el.value);
 $('#start-flashcards').onclick=()=>{state.session=F.createSession(state.cards,ratings(),state.mode);state.session.learning={mode:'practice'};F.next(state.session);render();};
 $('#see-flashcard-progress').onclick=progress;focus();
}
function render(){
 const s=state.session,item=s?.current;if(!item){summary();return;}
 const card=item.card,map=ratings(),grade=map[F.identity(card)].grade;
 const topic=topics[subject.id].find(t=>t.id===card.topic_id)?.label||subject.label;
 const copy=(text,id)=>`<span class="flashcard-copy" id="${id}">${esc(text)}</span>`;
 $('#app').innerHTML=`<section class="card flashcard-screen">${header('Flashcards',true)}<div class="flashcard-context"><p class="flashcard-topic">${esc(topic)}</p>${Badges.badgeHTML(grade,F.ratingDescriptions[grade])}</div><p class="flashcard-meta">${s.initials} of ${s.planned} cards assessed${item.retry?' · Retry':''}</p>${guestNote()}<div class="flashcard-stage"><button type="button" class="flashcard-flip" id="reveal-flashcard" aria-describedby="flashcard-flip-hint" aria-label="${esc('Question: '+card.front+'. Reveal answer')}"><span class="flashcard-turner"><span class="flashcard-side flashcard-question" aria-hidden="false"><span class="flashcard-side-label">Question</span>${copy(card.front,'flashcard-front')}</span><span class="flashcard-side flashcard-answer" aria-hidden="true" inert><span class="flashcard-side-label">Answer</span>${copy(card.back,'flashcard-back')}</span></span></button></div><p class="flashcard-flip-hint" id="flashcard-flip-hint">Tap to reveal · Enter or Space on a keyboard</p><div class="flashcard-actions"><button class="btn not-yet" id="flashcard-not-yet" disabled>Not yet</button><button class="btn" id="flashcard-got-it" disabled>Got it</button></div><p class="flashcard-progress-note">${item.retry?'This retry does not improve your long-term rating.':'How well did you recall the answer?'}</p><p id="flashcard-status" class="sr-only" role="status">${esc(state.lastMessage||'')}</p></section>`;
 $('#finish-flashcards').onclick=()=>{if(window.confirm('Finish this flashcard session? Assessed cards keep their results; unanswered cards are not scored.')){s.current=null;s.queue=[];summary();}};
 const flip=$('#reveal-flashcard');
 let showingAnswer=false;
 function updateFace(){
  flip.classList.toggle('is-flipped',showingAnswer);
  for(const [selector,active] of [['.flashcard-question',!showingAnswer],['.flashcard-answer',showingAnswer]]){
   const face=$(selector);face.setAttribute('aria-hidden',String(!active));face.inert=!active;
  }
  flip.setAttribute('aria-label',showingAnswer?'Answer: '+card.back+'. Show question':'Question: '+card.front+'. Reveal answer');
  $('#flashcard-flip-hint').textContent=showingAnswer?'Tap to see the question again':'Tap to reveal · Enter or Space on a keyboard';
  $('#flashcard-not-yet').disabled=$('#flashcard-got-it').disabled=!s.revealed;
 }
 flip.onclick=()=>{showingAnswer=!showingAnswer;if(showingAnswer)s.revealed=true;updateFace();};
 if(s.revealed){showingAnswer=true;updateFace();}
 $('#flashcard-not-yet').onclick=()=>answer(false);$('#flashcard-got-it').onclick=()=>answer(true);
 focus('#reveal-flashcard');
}
function answer(gotIt){
 const s=state.session;if(!s?.current||!s.revealed)return;
 const item=F.assess(s,gotIt),q=state.bank.questions.find(q=>q.id===F.identity(item.card));
 if(state.sync)state.sync.record(q,s.learning,'submit',{score:Number(gotIt)});
 else state.events=Events.mergeEvents(state.events,[Events.makeEvent(state.bank,q,s.learning,'submit',{score:Number(gotIt)})]);
 state.lastMessage=gotIt?'Previous card marked Got it.':'Previous card marked Not yet.';F.next(s);render();
}
function summary(){
 const s=state.session;if(!s){setup();return;}
 $('#app').innerHTML=`<section class="card summary-page">${header('Flashcard session complete')}${guestNote()}<p class="summary-score">${s.gotIt} / ${s.initials}<span>Self-reported recall on first attempts</span></p><p>${s.retries} retries assessed · ${s.planned-s.initials} cards left unassessed</p><p>Retries do not increase your first-attempt recall or long-term rating.</p><button class="btn" id="another-flashcard-session">Choose a new session</button> <button class="btn secondary" id="summary-flashcard-progress">Flashcard progress</button></section>`;
 $('#another-flashcard-session').onclick=()=>{state.session=null;state.lastMessage='';setup();};$('#summary-flashcard-progress').onclick=progress;focus();
}
function progress(){
 const map=ratings(),valid=new Set(state.bank.questions.map(q=>q.id)),all=events().filter(e=>valid.has(e.question_id)),first=all.filter(e=>!e.is_retry),ordered=A.priority(state.bank.questions,map);
 $('#app').innerHTML=`<section class="card progress-page">${header('Flashcard progress')}${guestNote()}<p>Selected topics · self-assessed recall, separate from Active Learning results.</p><p>${new Set(first.map(e=>e.question_id)).size} card${new Set(first.map(e=>e.question_id)).size===1?'':'s'} attempted · ${first.filter(e=>e.earned_marks===1).length} initial attempts marked Got it</p><p>N means not attempted. A–E is revision guidance based on your first self-assessment and time since practice.</p><ul class="flashcard-progress-list">${ordered.map(q=>`<li>${Badges.badgeHTML(map[q.id].grade,F.ratingDescriptions[map[q.id].grade])}<span>${esc(q.title)}</span></li>`).join('')}</ul><button class="btn" id="back-to-flashcards">${state.session?.current?'Resume flashcards':'Flashcard sessions'}</button></section>`;
 $('#back-to-flashcards').onclick=setup;focus();
}
async function rows(client,table,filter){let all=[];for(let offset=0;;offset+=500){const r=await filter(client.from(table).select(table==='flashcard_packs'?'id,subject_id,topic_id,title,status,revision,updated_at':'*')).order(table==='flashcard_packs'?'id':'question_id').range(offset,offset+499);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<500)return all;}}
async function boot(){
 $('#active-learning-link').href=activeURL;
 let connection;
 if(demo){state.cards=window.LABRATS_FLASHCARD_DEMO.subject_id===subject.id?window.LABRATS_FLASHCARD_DEMO.cards.filter(c=>selected.includes(c.topic_id)):[];}
 else{
  connection=await openAccountClient();
  // Published content needs no student token, including after an expired login.
  const catalog=createClient(connection.url,connection.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
   global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal||AbortSignal.timeout(15000)})}});
  const packs=await rows(catalog,'flashcard_packs',q=>q.eq('subject_id',subject.id).eq('status','published'));
  const matching=packs.filter(p=>selected.includes(p.topic_id)),ids=matching.map(p=>p.id);
  const cards=ids.length?await rows(catalog,'flashcard_cards',q=>q.in('pack_id',ids).eq('is_current',true)):[];
  state.cards=cards.map(c=>({...c,topic_id:matching.find(p=>p.id===c.pack_id).topic_id}));
 }
 state.bank=F.learningBank(subject.id,state.cards);
 if(!demo&&params.get('guest')!=='1')state.sync=await window.RevisionSync.open(state.bank,()=>{}, {learningKind:'flashcards',connection,loginUrl:'student-login.html?subject='+subject.id});
 setup();
 $('#flashcard-practice-nav').onclick=setup;$('#flashcard-progress-nav').onclick=progress;
}
window.LabRatsFlashcards={state};
boot().catch(error=>{
 $('#app').innerHTML=`<section class="card"><h1>Flashcards are unavailable</h1><p>${esc(error.message||'Check your connection and the flashcard database setup.')}</p><p><a class="btn" href="${esc(location.href)}">Try again</a> <a class="btn secondary" href="${activeURL}">Active Learning</a></p><p>No account progress has been switched to guest storage.</p></section>`;
});
