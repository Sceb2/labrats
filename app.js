'use strict';
const C=ChemCore,$=s=>document.querySelector(s),app=()=>$('#app');
let nativeStorage;try{nativeStorage=window.localStorage}catch{nativeStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}}
const storage=C.safeStorage(nativeStorage);
const S={suspended:null,view:'topics',bank:null,topics:[],types:[...C.TYPES],difficulty:[...C.DIFFICULTIES],statuses:['draft','teacher-review-required','teacher-approved'],progress:null,session:null,response:{},marked:false,result:null,orders:{},activeStep:0,source:null,timer:null,locked:false};
window.addEventListener('revision:before-update',event=>{if(S.bank&&S.progress&&!save())event.preventDefault()});
function snapshotPractice(){return {session:C.clone(S.session),response:C.clone(S.response),orders:C.clone(S.orders),activeStep:S.activeStep,marked:S.marked,result:C.clone(S.result),source:S.source}}
function suspendPractice(){if(S.session&&!S.session.finished)S.suspended=snapshotPractice()}
function save(){const prefsSaved=storage.set('ocrOrgPrefsV2',{topics:S.topics,types:S.types,difficulty:S.difficulty,statuses:S.statuses});const progressSaved=storage.set('ocrOrgProgressV2',S.progress);if(!progressSaved)$('#storage-note').textContent=' Storage is unavailable; this visit still works.';const draft=S.session&&!S.session.finished?snapshotPractice():S.suspended;let draftSaved=true;if(draft&&!draft.session.finished)draftSaved=storage.set('ocrOrgActiveV2',{...draft.session,response:draft.response,ui:{orders:draft.orders,activeStep:draft.activeStep,marked:draft.marked,result:draft.result,source:draft.source,view:S.view}});else draftSaved=storage.remove('ocrOrgActiveV2');document.getElementById('question-report-panel')?._update?.();return prefsSaved&&progressSaved&&draftSaved}
function eligible(){return C.eligible(S.bank,S.topics,S.types,S.difficulty,S.statuses)}
function stopTimer(){clearInterval(S.timer);S.timer=null}
function goHome(){if(S.session&&!S.session.finished){if(S.session.mode==='challenge')finish();else finish(false)}home()}
function topicSelection(ids,changedId,checked){const selected=[...new Set(ids)];if(checked&&changedId!=='basic'&&selected.includes(changedId)&&S.bank.topics.some(t=>t.id==='basic')&&!selected.includes('basic'))selected.unshift('basic');return selected}
function topicCountLabel(id){
 const selected=S.topics.includes(id),topics=selected?S.topics:topicSelection([...S.topics,id],id,true);
 const related=S.bank.questions.filter(q=>q.enabled!==false&&q.prerequisites.includes(id)&&S.types.includes(q.type)&&S.difficulty.includes(q.difficulty)&&S.statuses.includes(q.status));
 const available=C.eligible(S.bank,topics,S.types,S.difficulty,S.statuses).filter(q=>q.prerequisites.includes(id)).length;
 const blocked=related.length-available;
 return `<small class="topic-count">${available} ${available===1?'question':'questions'} ${selected?'available now':'available if selected'}${blocked?` · ${blocked} need other topics`:''}</small>`;
}
function checklist(list,selected,attr){
 return `<div class="checks">${list.map(t=>{const label=attr==='topic'?t.label.replace(/^\d\.\d\.\d\s+/,''):t.label;const code=attr==='topic'?t.label.match(/^\d\.\d\.\d/)?.[0]:'';return `<label class="topic"><input type="checkbox" data-${attr}="${U.esc(t.id)}" ${selected.includes(t.id)?'checked':''}><span class="topic-text">${U.esc(label)}${code?`<span class="topic-code">${code}</span>`:''}</span></label>`}).join('')}</div>`;
}

function home(){
 const previous=document.body.dataset.screen==='setup';if(previous){document.querySelectorAll('[data-disclosure]').forEach(el=>setupDisclosures[el.dataset.disclosure]=el.open)}
 suspendPractice();setNavigation('practice');document.body.dataset.screen='setup';stopTimer();S.session=null;S.locked=false;
 const eligibleQ=eligible(),mistakes=eligibleQ.filter(q=>['partial','incorrect'].includes(S.progress.records[q.id]?.first?.outcome)),groups={};
 const practiceMarks=C.practiceSet(eligibleQ,()=>0).reduce((n,q)=>n+q.maxMark,0);
 S.bank.topics.forEach(t=>(groups[t.module]??=[]).push(t));
 const noQuestions=!S.types.length?'Select at least one question type in Practice settings.':!S.difficulty.length?'Select at least one difficulty in Practice settings.':!S.topics.length?'Select a topic you have studied to start.':!S.topics.includes('basic')?'Select Basic concepts and nomenclature to include the required foundation.':'No questions match. Select the other required topics or broaden your Practice settings.';
 const settingsLabel=`${S.types.length===C.TYPES.length?'All question types':S.types.length+' question types'} · ${S.difficulty.length===C.DIFFICULTIES.length?'all difficulties':S.difficulty.length+' difficulties'}`;
 app().innerHTML=`<div class="card setup-page"><header class="page-heading"><h1>Choose your topics</h1><p>Select topics you have studied.</p></header><details class="selection-tools" data-disclosure="selection" ${setupDisclosures.selection?'open':''}><summary>Selection tools</summary><div class="row"><button class="btn text-button" id="all">Select all</button><button class="btn text-button" id="none">Clear topics</button></div><p class="muted">Questions appear when all their required topics are selected.</p></details>${Object.entries(groups).map(([module,topics],i)=>`<details class="module-section" data-disclosure="${U.esc(module)}" ${setupDisclosures[module]??i===0?'open':''}><summary><span>${U.esc(module)}</span><span class="module-selected">${topics.filter(t=>S.topics.includes(t.id)).length} selected</span></summary>${checklist(topics,S.topics,'topic')}</details>`).join('')}<p class="foundation-note">${S.topics.includes('basic')?'Basic concepts included automatically.':'Selecting a reaction topic includes Basic concepts.'}</p><details class="practice-settings" data-disclosure="settings" ${setupDisclosures.settings?'open':''}><summary>Practice settings <span>${U.esc(settingsLabel)}</span></summary><h2>Question types</h2>${checklist(C.TYPES.map(id=>({id,label:U.typeLabel(id)})),S.types,'type')}<h2>Difficulty</h2>${checklist(C.DIFFICULTIES.map(id=>({id,label:id})),S.difficulty,'difficulty')}<label class="topic"><input type="checkbox" id="celebration-effects" ${celebrationEffects?'checked':''}><span>Celebration effects<span class="topic-code">Reduced-motion preferences are always respected.</span></span></label>${celebrationSoundControl('celebration-sound')}<details><summary>About your session</summary><p>Untimed practice uses about 20 marks. Larger synthesis questions can give up to 23; small question pools give shorter sessions.</p></details></details><details class="challenge-settings" data-disclosure="challenge" ${setupDisclosures.challenge?'open':''}><summary>Personal challenge <span>Optional · timed</span></summary><label class="control" for="duration">Duration<select id="duration"><option value="5">5 minutes</option><option value="10">10 minutes</option></select></label><p>Feedback appears at the end.</p><button class="btn secondary" id="challenge" ${eligibleQ.length?'':'disabled'}>Begin challenge</button><details><summary>How challenge scores work</summary><p>Only first submissions count. Partial marks count; speed earns no bonus. Accuracy is marks earned ÷ marks available on submitted questions. Personal bests compare identical settings and use marks earned to break an accuracy tie. Questions do not repeat.</p></details></details>${mistakes.length?`<p class="setup-mistakes"><button class="btn text-button" id="mistakes">Review ${mistakes.length} first-attempt mistakes</button></p>`:''}<section class="setup-actions action-dock" aria-label="Start or resume practice"><p id="eligible-count" role="status">${S.topics.length} ${S.topics.length===1?'topic':'topics'} selected · ${eligibleQ.length} questions available${practiceMarks?` · ${practiceMarks} mark${practiceMarks===1?'':'s'} per practice session`:''}</p>${!eligibleQ.length?`<p id="start-help" class="start-help">${noQuestions}</p>`:''}${S.suspended?'<button class="btn" id="resume-practice">Resume practice</button>':''}<button class="btn ${S.suspended?'secondary':''}" id="practice" ${eligibleQ.length?'':'disabled aria-describedby="start-help"'}>Start ${S.suspended?'new ':''}practice</button></section></div>`;
 for(const [attr,key]of [['topic','topics'],['type','types'],['difficulty','difficulty']])document.querySelectorAll(`[data-${attr}]`).forEach(el=>el.onchange=()=>{const id=el.dataset[attr];S[key]=el.checked?[...new Set([...S[key],id])]:S[key].filter(x=>x!==id);if(attr==='topic')S.topics=topicSelection(S.topics,id,el.checked);save();home();document.querySelector(`[data-${attr}="${id}"]`)?.focus({preventScroll:true})});
 $('#all').onclick=()=>{S.topics=S.bank.topics.map(t=>t.id);save();home()};$('#none').onclick=()=>{S.topics=[];save();home()};$('#practice').onclick=()=>start('practice',eligibleQ);if($('#mistakes'))$('#mistakes').onclick=()=>start('mistakes',mistakes);$('#challenge').onclick=()=>start('challenge',eligibleQ,Number($('#duration').value));if($('#resume-practice'))$('#resume-practice').onclick=resumePractice;
 $('#celebration-effects').onchange=e=>{celebrationEffects=e.target.checked;storage.set('ocrOrgCelebrationsV1',celebrationEffects);clearEffects()};bindCelebrationSound('celebration-sound');save();resizeActions();
}

function start(mode,questions,duration=0){if(S.suspended){S.session=S.suspended.session;S.suspended=null;finish(false)}stopTimer();const chosen=mode==='practice'?C.practiceSet(questions):C.shuffle(questions);S.session={id:'session-'+Date.now(),mode,ids:chosen.map(q=>q.id),plannedMarks:chosen.reduce((n,q)=>n+q.maxMark,0),practicePolicy:mode==='practice'?'practice-20-v1':null,i:0,started:Date.now(),end:duration?Date.now()+duration*60000:0,duration,config:C.configId({topics:S.topics,types:S.types,difficulty:S.difficulty,statuses:S.statuses,duration,bankVersion:S.bank.meta.bankVersion,scoringVersion:S.bank.meta.scoringVersion}),attempts:{},finished:false};S.response={};S.orders={};S.locked=false;save();renderQuestion();if(mode==='challenge')S.timer=setInterval(tick,250)}
function current(){return S.bank.questions.find(q=>q.id===S.session.ids[S.session.i])}
function order(key,options){return S.orders[key]??(S.orders[key]=C.shuffle(options))}
function controls(unit,response,prefix=''){
 return unit.components.map(c=>{const key=prefix+c.id,opts=order(key,c.options);if(c.options.some(id=>S.bank.vocabulary[id].asset))return `<fieldset><legend>${U.esc(c.label)} ${c.essential?'('+c.marks+' mark)':'(optional)'}</legend><div class="product-grid">${opts.map((id,i)=>`<label class="product-option"><input type="radio" name="${key}" data-component="${c.id}" data-prefix="${prefix}" value="${id}" ${response[c.id]===id?'checked':''}>Structure ${String.fromCharCode(65+i)}${U.image(S.bank,S.bank.vocabulary[id].asset)}</label>`).join('')}</div></fieldset>`;
 return `<label class="control" for="${key}">${U.esc(c.label)} ${c.essential?'('+c.marks+' mark)':'(optional — no mark)'}<select id="${key}" data-component="${c.id}" data-prefix="${prefix}"><option value="">Choose…</option>${opts.map(id=>`<option value="${id}" ${response[c.id]===id?'selected':''}>${U.esc(U.label(S.bank,id))}</option>`).join('')}</select></label>`}).join('')
}
function bindComponents(){document.querySelectorAll('[data-component]').forEach(el=>el.onchange=()=>{clearSubmissionWarning();const pre=el.dataset.prefix;if(pre){const id=pre.slice(0,-1);(S.response[id]??={})[el.dataset.component]=el.value}else S.response[el.dataset.component]=el.value;save();if(current().type==='multistep')refreshRouteState(current())})}
function drawMechanism(q,readonly=false){
 const m=q.mechanism||q.site,anchors=m.anchors;
 const position=(a,i)=>({x:a.labelX??55+i*490/Math.max(1,anchors.length-1),y:a.labelY??37});
 return `<div class="mechanism-canvas">${U.image(S.bank,m.asset)}<svg class="anchor-guides" viewBox="0 0 600 320" aria-hidden="true">${anchors.map((a,i)=>{const p=position(a,i);return `<line x1="${p.x}" y1="${p.y+16}" x2="${a.x}" y2="${a.y}"/><circle cx="${a.x}" cy="${a.y}" r="4"/>`}).join('')}</svg>${anchors.map((a,i)=>{const p=position(a,i);return `<button class="anchor" type="button" data-anchor="${a.id}" style="left:${100*p.x/600}%;top:${100*p.y/320}%" aria-label="${i+1} — ${U.esc(a.label)} (${a.kind})" ${readonly?'disabled':''}>${i+1}</button><span class="anchor-marker" style="left:${100*p.x/600}%;top:${100*p.y/320}%" aria-hidden="true">${i+1}</span>`}).join('')}<svg class="arrow-layer" viewBox="0 0 600 320" aria-hidden="true"><defs><marker id="drawhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#0f766e"/></marker></defs><g id="student-arrows"></g></svg></div><div class="site-buttons grid">${anchors.map((a,i)=>`<button type="button" class="btn secondary" data-anchor="${a.id}" ${readonly?'disabled':''}>${i+1} — ${U.esc(a.label)}</button>`).join('')}</div>`
}
function arrowsControls(q){if(q.mechanism.destinationOnly)return destinationControls(q);return `<p id="arrow-status" class="interaction-status" role="status">Choose an electron source, then its destination.</p>${drawMechanism(q)}<div class="mechanism-tools"><button type="button" class="btn text-button" id="undo">Undo last arrow</button><details><summary>Arrow tools</summary><button type="button" class="btn text-button" id="cancel-source">Cancel source selection</button><button type="button" class="btn text-button" id="clear-arrows">Clear arrows</button></details></div><ol id="arrow-list" aria-label="Placed electron arrows"></ol>`}

function refreshArrows(q){const an=q.mechanism.anchors;$('#student-arrows').innerHTML=(S.response.arrows||[]).map(p=>{const a=an.find(a=>a.id===p.from),b=an.find(a=>a.id===p.to);return a&&b?`<path d="${U.arrowPath(a.x,a.y,b.x,b.y)}" fill="none" stroke="#0f766e" stroke-width="3" marker-end="url(#drawhead)"/>`:''}).join('');$('#arrow-list').innerHTML=(S.response.arrows||[]).map(p=>`<li>${U.esc(an.find(a=>a.id===p.from)?.label)} → ${U.esc(an.find(a=>a.id===p.to)?.label)}</li>`).join('');document.querySelectorAll('[data-anchor]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.anchor===S.source)))}
function addArrow(q,from,to){if(from===to){$('#arrow-status').textContent='Use two distinct sites. The source is still selected.';return}S.response.arrows??=[];if(S.response.arrows.some(p=>p.from===from&&p.to===to)){S.source=null;refreshArrows(q);$('#arrow-status').textContent='That arrow is already present. Choose a new source.';return}S.response.arrows.push({from,to});clearSubmissionWarning();S.source=null;refreshArrows(q);save();$('#arrow-status').textContent='Arrow added. Choose another source, or submit.'}
function bindArrows(q){if(q.mechanism.destinationOnly){bindDestinations(q);return}refreshArrows(q);document.querySelectorAll('[data-anchor]').forEach(el=>el.onclick=()=>{if(S.marked)return;if(!S.source){S.source=el.dataset.anchor;$('#arrow-status').textContent='Source: '+q.mechanism.anchors.find(a=>a.id===S.source).label+'. Now choose a destination.';refreshArrows(q)}else addArrow(q,S.source,el.dataset.anchor)});$('#cancel-source').onclick=()=>{S.source=null;refreshArrows(q);$('#arrow-status').textContent='Source selection cancelled. Choose an electron source.'};$('#undo').onclick=()=>{clearSubmissionWarning();S.response.arrows?.pop();S.source=null;refreshArrows(q);save();$('#arrow-status').textContent='Last arrow removed.'};$('#clear-arrows').onclick=()=>{clearSubmissionWarning();S.response.arrows=[];S.source=null;refreshArrows(q);save();$('#arrow-status').textContent='Arrows cleared.'}}
// Destination-only questions retain the shared arrow marking and saved-response format.
function destinationAtoms(q){return order(q.id+'.destinations',q.mechanism.anchors.filter(a=>a.kind==='atom').map(a=>a.id)).map(id=>q.mechanism.anchors.find(a=>a.id===id))}
function destinationControls(q){
 const m=q.mechanism,atoms=destinationAtoms(q),source=m.anchors.find(a=>a.id===m.fixedSource);
 return `<p id="arrow-status" class="interaction-status" role="status">Start supplied: ${U.esc(source.label)}. Choose one numbered atom for the arrowhead.</p><div class="mechanism-canvas endpoint-canvas">${U.image(S.bank,m.asset)}<svg class="endpoint-guides" viewBox="0 0 600 360" aria-hidden="true">${atoms.map(a=>`<line x1="${a.labelX}" y1="${a.labelY}" x2="${a.x}" y2="${a.y}"/>`).join('')}</svg>${atoms.map((a,i)=>`<button type="button" class="endpoint-marker" data-destination="${a.id}" style="left:${100*a.labelX/600}%;top:${100*a.labelY/360}%" aria-label="Atom ${i+1}: ${U.esc(a.label)}" aria-pressed="false">${i+1}</button>`).join('')}<svg class="arrow-layer" viewBox="0 0 600 360" aria-hidden="true"><defs><marker id="endpoint-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#14563e"/></marker></defs><g id="endpoint-student-arrow"></g></svg></div><button type="button" class="btn text-button" id="enlarge-endpoint">Enlarge diagram</button><p class="destination-help" id="destination-help">Choose on the diagram or use the matching buttons. A highlight means selected; it does not mean correct.</p><div class="site-buttons destination-options" role="group" aria-label="Choose the atom where the missing arrow ends" aria-describedby="destination-help">${atoms.map((a,i)=>`<button type="button" class="btn secondary" data-destination="${a.id}" aria-pressed="false"><strong>${i+1}</strong><span>${U.esc(a.label)}</span></button>`).join('')}</div><div class="mechanism-tools"><button type="button" class="btn text-button" id="clear-destination">Clear selection</button></div><ol id="arrow-list" aria-label="Selected electron arrow"></ol>`;
}
function refreshDestinations(q){
 const m=q.mechanism,source=m.anchors.find(a=>a.id===m.fixedSource),selected=S.response.arrows?.[0],target=m.anchors.find(a=>a.id===selected?.to);
 const d=target?U.arrowPath(source.x,source.y,target.x,target.y):'';
 $('#endpoint-student-arrow').innerHTML=target?`<path d="${U.esc(d)}" fill="none" stroke="#14563e" stroke-width="3" marker-end="url(#endpoint-head)"/>`:'';
 document.querySelectorAll('#task [data-destination]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.destination===target?.id)));
 $('#arrow-list').innerHTML=target?`<li>${U.esc(source.label)} → ${U.esc(target.label)}</li>`:'';
 $('#arrow-status').textContent=target?'Selected: '+target.label+'. Check your answer when ready.':'Start supplied: '+source.label+'. Choose one numbered atom for the arrowhead.';
}
function bindDestinations(q){
 refreshDestinations(q);
 document.querySelectorAll('#task [data-destination]').forEach(el=>el.onclick=()=>{if(S.marked)return;S.response.arrows=[{from:q.mechanism.fixedSource,to:el.dataset.destination}];S.source=null;clearSubmissionWarning();refreshDestinations(q);save()});
 $('#clear-destination').onclick=()=>{S.response.arrows=[];clearSubmissionWarning();refreshDestinations(q);save()};
 $('#enlarge-endpoint').onclick=()=>{
  const dialog=document.createElement('dialog');dialog.className='endpoint-zoom';dialog.setAttribute('aria-label','Enlarged mechanism diagram');
  const copy=$('.endpoint-canvas').cloneNode(true);copy.querySelectorAll('button').forEach(button=>{const marker=document.createElement('span');marker.className='endpoint-marker';marker.style.cssText=button.style.cssText;marker.textContent=button.textContent;marker.setAttribute('aria-hidden','true');if(button.getAttribute('aria-pressed')==='true')marker.classList.add('selected');button.replaceWith(marker)});
  copy.querySelector('#endpoint-head').id='endpoint-zoom-head';copy.querySelector('#endpoint-student-arrow').id='endpoint-zoom-arrow';copy.querySelectorAll('[marker-end]').forEach(el=>el.setAttribute('marker-end','url(#endpoint-zoom-head)'));
  dialog.innerHTML='<button type="button" class="btn secondary" autofocus>Close diagram</button><p>Scroll across to inspect the diagram. Close it to choose your atom.</p><div class="endpoint-zoom-scroll" tabindex="0" role="region" aria-label="Scrollable enlarged mechanism diagram"></div>';dialog.querySelector('.endpoint-zoom-scroll').append(copy);document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();$('#enlarge-endpoint')?.focus()},{once:true});dialog.showModal();
 };
}

function routeNodes(q){return (q.layout==='network'?q.nodes:q.pathway).map((p,i)=>({...p,tag:q.layout==='network'?(p.id==='start'?'Start':p.id):(i===0?'Start':i===q.pathway.length-1?'Target':p.letter||'I'+i)}))}
function routeEnds(q,i){const nodes=routeNodes(q),step=q.steps[i];return q.layout==='network'?[nodes.find(n=>n.id===step.startNode),nodes.find(n=>n.id===step.endNode)]:[nodes[i],nodes[i+1]]}
function stepFill(step){const essential=step.components.filter(c=>c.essential),response=S.response[step.id]||{},filled=essential.filter(c=>!!response[c.id]).length;return {filled,total:essential.length,text:filled===essential.length?'Filled in':filled?'Partly filled':'Not started'}}
function routeGuide(q){return `<aside class="route-guide" aria-label="How to complete this pathway"><h2>How to complete this pathway</h2><ul><li><strong>Compound boxes</strong> show the starting material, intermediates and products. A dashed box is a missing structure to identify in its step panel.</li><li><strong>Numbered arrows are reaction steps.</strong> Select a step to open its answer panel below the pathway.</li><li><strong>Fill in every step, then submit once.</strong> Your selections are saved as you switch panels. “Filled in” means an answer is selected, not that it is correct.</li></ul><p id="route-progress" class="route-progress" role="status"></p></aside>`}
function routeNode(p,completed){const hidden=p.hidden&&!completed,heading=`<div class="compound-heading">Compound ${U.esc(p.tag)}</div>`;const fig=hidden?`<figure class="chem unknown-structure"><div class="unknown-box" role="img" aria-label="Missing structure ${U.esc(p.letter)}">${U.esc(p.letter)}<span>Structure to identify</span></div><figcaption>${U.esc(p.caption)}</figcaption></figure>`:U.image(S.bank,p.asset,p.caption);return `<div class="compound-box">${heading}${fig}</div>`}
function routeButton(q,i,completed){
 const [a,b]=routeEnds(q,i),fill=stepFill(q.steps[i]);return `<button type="button" class="route-arrow btn secondary" data-step="${i}" aria-controls="step-panel" aria-expanded="false" aria-label="Step ${i+1}: Compound ${U.esc(a.tag)} to Compound ${U.esc(b.tag)}. ${completed?'Submitted.':'Open answers.'}" ${completed?'disabled':''}><strong>Step ${i+1} · ${U.esc(a.tag)} → ${U.esc(b.tag)}</strong><span class="route-action sr-only">${completed?'Submitted':'Open answers'}</span>${completed?'':`<span class="route-fill">${fill.text}</span>`}</button>`;
}

function pathway(q,completed=false){
 const nodes=routeNodes(q);
 if(q.layout!=='network')return `<div class="pathway ${completed?'completed':''}">${nodes.map((p,i)=>`${routeNode(p,completed)}${i<q.steps.length?routeButton(q,i,completed):''}`).join('')}</div>`;
 const visited=new Set();
 function branch(id){
  const node=nodes.find(n=>n.id===id);if(visited.has(id))return `<p class="shared-compound">Continues at Compound ${U.esc(node.tag)}</p>`;visited.add(id);
  const outgoing=q.steps.map((s,i)=>({s,i})).filter(({s})=>s.startNode===id);
  return `<section class="chemical-branch" aria-label="Compound ${U.esc(node.tag)} and its reactions"><div class="branch-compound" data-route-node="${U.esc(id)}">${routeNode(node,completed)}</div>${outgoing.length?`<div class="branch-children">${outgoing.map(({s,i})=>`<div class="chemical-branch-edge" data-route-edge="${i}">${routeButton(q,i,completed)}${branch(s.endNode)}</div>`).join('')}</div>`:''}</section>`;
 }
 const start=nodes.find(n=>!q.steps.some(s=>s.endNode===n.id));
 return `<div class="chemical-network ${completed?'completed':''}" role="group" aria-label="Complete branched synthesis pathway">${branch(start.id)}</div>`;
}

function refreshRouteState(q){document.querySelectorAll('#task [data-step]').forEach(el=>{const i=Number(el.dataset.step),active=i===S.activeStep,fill=stepFill(q.steps[i]);el.setAttribute('aria-expanded',String(active));if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');el.classList.toggle('selected-step',active);el.querySelector('.route-action').textContent=active?'Editing this step':'Open answers';el.querySelector('.route-fill').textContent=fill.text});const n=q.steps.filter(s=>stepFill(s).filled===stepFill(s).total).length;$('#route-progress').textContent=`${n} / ${q.steps.length} steps filled in`}
function reportQuestionControls(){return `<div class="question-report-footer"><button type="button" class="btn secondary report-toggle" id="report-question" aria-expanded="false" aria-controls="question-report-panel">Report question</button><section id="question-report-panel" aria-label="Report this question" hidden></section></div>`}
function questionReportText(q,issue=''){
 let link='Offline preview';try{if(/^https?:/.test(location.protocol)){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('preview',q.id);link=url.href}}catch{}
 const label=id=>S.bank.vocabulary[id]?.label||id;
 const unitAnswers=(unit,response={})=>(unit.components||[]).map(c=>`${c.label}: ${response[c.id]?label(response[c.id]):'[No answer entered]'}`).join('\n');
 let answer;
 if(q.type==='multistep')answer=q.steps.map((step,i)=>`Step ${i+1}\n${unitAnswers(step,S.response[step.id])}`).join('\n\n');
 else if(q.interaction==='arrows'){const anchor=id=>q.mechanism.anchors.find(a=>a.id===id)?.label||id;answer=(S.response.arrows||[]).map((a,i)=>`Arrow ${i+1}: ${anchor(a.from)} → ${anchor(a.to)}`).join('\n')||'[No arrows entered]';}
 else answer=unitAnswers(q,S.response)||'[No answer entered]';
 const deferred=S.session.mode==='challenge'&&!S.session.finished,result=deferred?null:S.result,marking=deferred?'Feedback appears at the end of the challenge':S.marked?(result?`${result.score}/${result.max} marks`:'Answer revealed; no marks awarded'):'Not marked yet';
 const detail=result?JSON.stringify(result,null,2):'[No marking result]';
 return [`Question report — OCR Organic Chemistry`,`Question code: ${q.id}`,`Question: ${q.title}`,`App version: ${window.CHEM_BUILD?.label||'1.7'}`,`Bank version: ${S.bank.meta.bankVersion}`,`Link: ${link}`,'','Problem noticed:',issue.trim()||'[Describe the problem here]','','Question wording:',q.prompt,'','My answer:',answer,'',`Marking: ${marking}`,`Session: ${S.session.mode}`,'','Marking detail:',detail,'','Please attach a screenshot if it helps explain the issue.'].join('\n');
}
function reportMailto(email,q,body){const recipient=/^[^\s@<>,;?&#]+@[^\s@<>,;?&#]+\.[^\s@<>,;?&#]+$/.test(email)?email:'';return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent('Question report: '+q.id+' — '+q.title)}&body=${encodeURIComponent(body.replace(/\r?\n/g,'\r\n'))}`}
function bindQuestionReport(q){
 const trigger=$('#report-question'),panel=$('#question-report-panel');
 let email=window.CHEM_REPORT_EMAIL||'';
 const validEmail=value=>typeof value==='string'&&/^[^\s@<>,;?&#]+@[^\s@<>,;?&#]+\.[^\s@<>,;?&#]+$/.test(value.trim())?value.trim():'';
 email=validEmail(email);
 const update=()=>{
  if(panel.hidden||!panel.isConnected)return;
  const body=questionReportText(q,S.session.reportIssues?.[q.id]||'');
  $('#report-preview').value=`To: ${email||'[Your teacher’s email address]'}\nSubject: Question report: ${q.id} — ${q.title}\n\n${body}`;
  $('#report-email').href=reportMailto(email,q,body);$('#report-recipient').textContent=email?'To: '+email:'Add your teacher’s email address in the To field before sending.';
 };
 panel._update=update;
 trigger.onclick=()=>{
  const opening=panel.hidden;panel.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(!opening){trigger.focus();return}
  panel.innerHTML=`<h2>Report ${U.esc(q.id)}</h2><p id="report-explanation"><strong>Create draft</strong> opens your email app with the question details and your answer already filled in. Check the draft, add a screenshot if useful, then send it yourself. Nothing is sent automatically.</p><p class="small-note">If no email app opens, choose <strong>Copy draft</strong> and paste it into your school email.</p><label for="report-issue">What looks wrong? <span class="small-note">(optional)</span></label><textarea id="report-issue" rows="3" maxlength="600" placeholder="For example: my correct answer was marked wrong.">${U.esc(S.session.reportIssues?.[q.id]||'')}</textarea><p id="report-recipient" class="small-note"></p><label for="report-preview">Email draft</label><textarea id="report-preview" rows="10" readonly aria-describedby="report-explanation"></textarea><div class="report-actions"><a class="btn" id="report-email">Create draft</a><button type="button" class="btn secondary" id="copy-report">Copy draft</button><button type="button" class="btn text-button" id="close-report">Close report</button></div><p id="report-status" role="status"></p>`;
  $('#report-issue').oninput=event=>{S.session.reportIssues??={};S.session.reportIssues[q.id]=event.target.value;update();save()};
  $('#report-email').onclick=()=>{update();$('#report-status').textContent='Your email app may open now. Review the draft and send it there. If nothing opens, use Copy draft.'};
  $('#copy-report').onclick=async()=>{update();try{await navigator.clipboard.writeText($('#report-preview').value);if(panel.isConnected)$('#report-status').textContent='Draft copied. Paste it into an email to your teacher, check it, then send it.'}catch{if(panel.isConnected){$('#report-preview').focus();$('#report-preview').select();$('#report-status').textContent='Copy the selected draft text, then paste it into an email to your teacher.'}}};
  $('#close-report').onclick=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus()};
  update();$('#report-issue').focus();
 };
 if(!email&&location.protocol!=='file:')fetch('report-config.json',{cache:'no-store'}).then(x=>x.ok?x.json():{}).then(config=>{email=validEmail(config.email);update()}).catch(()=>{});
}
function taskInstructions(q){return `<section class="task-instructions" aria-label="Your task"><p class="task-sentence">${U.esc(q.prompt)}</p></section>`}
function renderQuestion(keepResponse=false){
 setNavigation('practice');document.body.dataset.screen='question';
 if(S.session.mode==='challenge'&&C.remaining(S.session.end)===0)return finish();if(S.session.i>=S.session.ids.length)return finish();
 const q=current();if(!keepResponse){S.response={};S.orders={};S.marked=false;S.result=null;S.source=null;S.activeStep=0}S.locked=false;
 app().innerHTML=`<article class="card question-screen ${q.type==='multistep'?'synthesis-screen':''}"><div class="question-chrome"><div id="clean-question-header">${questionHeader()}</div>${sessionMenu(q)}</div><h1>${U.esc(U.typeLabel(q.type))}</h1>${taskInstructions(q)}<div class="question-context">${U.questionIntro(S.bank,q)}</div><div id="task"></div><div id="fb"></div><div class="action-row answer-actions"><div class="secondary-actions">${S.session.mode!=='challenge'?'<button class="btn text-button" id="reveal">Reveal answer<span>No marks awarded</span></button>':''}</div><button class="btn" id="submit">${S.session.mode==='challenge'?'Submit answer':q.type==='multistep'?'Check all steps':'Check answer'}</button></div><p class="sr-only" id="answer-status" role="status" aria-atomic="true"></p>${reportQuestionControls()}</article>`;
 if(q.type==='multistep'){
  $('#task').innerHTML=`<div class="synthesis-workspace"><section class="pathway-area" id="full-pathway" aria-labelledby="pathway-heading"><div class="pathway-caption"><h2 id="pathway-heading">Reaction pathway</h2><span id="route-progress" role="status"></span></div>${pathway(q)}</section><section id="step-panel" tabindex="-1" aria-labelledby="step-heading"></section></div>`;bindSteps(q);
 }else if(q.interaction==='arrows'){$('#task').innerHTML=arrowsControls(q);bindArrows(q)}
 else if(q.interaction==='site'){$('#task').innerHTML=drawMechanism(q)+controls(q,S.response);bindComponents();document.querySelectorAll('[data-anchor]').forEach(el=>el.onclick=()=>{S.response.site=q.site.optionByAnchor[el.dataset.anchor];$('[data-component="site"]').value=S.response.site;document.querySelectorAll('[data-anchor]').forEach(a=>a.setAttribute('aria-pressed',String(a.dataset.anchor===el.dataset.anchor)));save()})}
 else{$('#task').innerHTML=controls(q,S.response);bindComponents()}
 bindQuestionReport(q);$('#submit').onclick=submit;$('#reveal')&&($('#reveal').onclick=reveal);mountSessionControls();bindSessionActions();$('#question-effects').onchange=e=>{celebrationEffects=e.target.checked;storage.set('ocrOrgCelebrationsV1',celebrationEffects);clearEffects()};bindCelebrationSound('question-sound');
 document.querySelector('.session-menu').addEventListener('keydown',e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus()}});
 save();resizeActions();U.focusHeading();if(S.session.mode==='challenge'){if(S.session.attempts[q.id]){S.marked=true;disableTask();challengeFeedback()}tick()}
}

function bindSteps(q){document.querySelectorAll('#task [data-step]').forEach(el=>el.onclick=()=>{S.activeStep=Number(el.dataset.step);showStep(q);save();focusStepPanel()});showStep(q)}
function showStep(q){
 const step=q.steps[S.activeStep],[a,b]=routeEnds(q,S.activeStep);$('#step-panel').innerHTML=`<div class="step-panel-top"><h2 id="step-heading">Step ${S.activeStep+1} of ${q.steps.length} · ${U.esc(a.tag)} → ${U.esc(b.tag)}</h2><span>${step.components.filter(c=>c.essential).reduce((n,c)=>n+c.marks,0)} marks</span></div><div class="step-compounds">${routeNode(a,false)}<span class="step-reaction-arrow" aria-label="reacts to give">→</span>${routeNode(b,false)}</div>${controls(step,S.response[step.id]||{},step.id+'.')}<nav class="step-navigation" aria-label="Reaction step navigation"><button type="button" class="btn text-button" id="previous-step" ${S.activeStep===0?'disabled':''}>Previous step</button><button type="button" class="btn secondary" id="next-step" ${S.activeStep===q.steps.length-1?'disabled':''}>Next step</button><button type="button" class="btn text-button" id="back-pathway">View full pathway</button></nav>`;
 refreshRouteState(q);bindComponents();for(const [id,delta]of [['previous-step',-1],['next-step',1]])$('#'+id).onclick=()=>{S.activeStep+=delta;showStep(q);save();focusStepPanel()};$('#back-pathway').textContent='Back to pathway';$('#back-pathway').onclick=()=>{const arrow=$('#full-pathway .selected-step');arrow?.focus({preventScroll:true});arrow?.scrollIntoView({block:'center',behavior:'auto'})};
}

function focusStepPanel(){const panel=$('#step-panel');panel.focus({preventScroll:true});panel.scrollIntoView({block:'nearest',behavior:'auto'})}
function record(q,result,event){const id=q.id;S.progress.records[id]=C.progressEvent(S.progress.records[id],event,result);if(event==='submit'&&result.score<result.max)S.progress.records[id].lastMistakeAt=Date.now();if(event==='submit'&&!S.session.attempts[id])S.session.attempts[id]={response:C.clone(S.response),result,first:true,revealed:false};else if(event==='reveal'&&!S.session.attempts[id])S.session.attempts[id]={response:C.clone(S.response),result:null,first:false,revealed:true};save()}
function disableTask(){document.querySelectorAll('#task button,#task select,#task input').forEach(el=>el.disabled=true);if($('#submit'))$('#submit').disabled=true;if($('#reveal'))$('#reveal').disabled=true}

function unansweredParts(q){
 if(q.interaction==='arrows')return (S.response.arrows||[]).length?q.mechanism.requiredArrows.length>(S.response.arrows||[]).length?[{label:'Fewer arrows have been placed than this step requires.',arrows:true}]:[]:[{label:'No electron-pair arrows have been added.',arrows:true}];
 const units=q.type==='multistep'?q.steps:[q];
 return units.flatMap((unit,i)=>{const response=q.type==='multistep'?S.response[unit.id]||{}:S.response;return unit.components.filter(c=>c.essential&&!response[c.id]).map(c=>({label:(q.type==='multistep'?`Step ${i+1}: `:'')+c.label,step:q.type==='multistep'?i:null,component:c.id,prefix:q.type==='multistep'?unit.id+'.':''}))});
}
function clearSubmissionWarning(){document.getElementById('submission-warning')?.remove()}
function warnUnanswered(q,parts){
 clearSubmissionWarning();
 const title=q.interaction==='arrows'?'Your mechanism is unfinished':`${parts.length} ${parts.length===1?'part is':'parts are'} unanswered`;
 const target=$('.answer-actions');target.insertAdjacentHTML('beforebegin',`<section id="submission-warning" class="submission-warning" aria-labelledby="unanswered-heading"><h2 id="unanswered-heading" tabindex="-1">${title}</h2><p>Your answers have not been marked. You can complete them or submit as they are.</p><ul id="unanswered-list">${parts.map(p=>`<li>${U.esc(p.label)}</li>`).join('')}</ul><div class="row"><button class="btn" type="button" id="return-to-question">Return to question</button><button class="btn secondary" type="button" id="submit-anyway">Submit anyway</button></div></section>`);
 $('#return-to-question').onclick=()=>{const first=parts[0];clearSubmissionWarning();if(first.step!==null&&first.step!==undefined){S.activeStep=first.step;showStep(q);save();focusStepPanel()}const control=first.arrows?$('#task .site-buttons button'):document.querySelector(`[data-component="${first.component}"][data-prefix="${first.prefix}"]`);control?.focus();control?.scrollIntoView({block:'center',behavior:'auto'})};
 $('#submit-anyway').onclick=()=>submit(true);$('#unanswered-heading').focus({preventScroll:true});$('#submission-warning').scrollIntoView({block:'nearest',behavior:'auto'});
}
function submit(allowUnanswered=false){
 if(S.marked||S.locked)return;if(S.session.mode==='challenge'&&C.remaining(S.session.end)===0)return finish();
 const missing=unansweredParts(current());if(S.session.mode!=='challenge'&&allowUnanswered!==true&&missing.length){warnUnanswered(current(),missing);return}clearSubmissionWarning();
 const q=current(),previous=C.clone(S.progress.records[q.id]||{}),result=C.mark(q,S.response,S.bank);S.marked=true;S.result=result;record(q,result,'submit');disableTask();updateQuestionHeader();
 if(S.session.mode==='challenge')challengeFeedback();else displayFeedback(q,result,false,{animate:true,category:ChemExperience.category(result,previous)});
}

function displayFeedback(q,result,revealed=false,options={}){
 const task=$('#task');task.hidden=false;if(!task.closest('.answer-review-disclosure')){const review=document.createElement('details');review.className='review-context answer-review-disclosure';review.innerHTML='<summary>View your answer</summary>';task.before(review);review.append(task)}document.body.dataset.screen='feedback';
 const context=$('.question-context');if(context?.children.length&&!context.querySelector('details'))context.innerHTML=`<details class="review-context"><summary>View question diagram</summary>${context.innerHTML}</details>`;
 clearSubmissionWarning();$('#fb').innerHTML=`${revealed?U.modelAnswer(S.bank,q):'<div id="encouragement"></div>'+U.feedback(S.bank,q,result,S.response)}${q.type==='multistep'?`<details class="completed-pathway"><summary>View completed pathway</summary>${pathway(q,true)}</details>`:''}`;
 $('.action-row').innerHTML=`<div class="secondary-actions"><button class="btn text-button" id="retry">Retry question</button><span class="retry-note">Retries do not change your first-attempt score.</span></div><button class="btn" id="next">${S.session.i===S.session.ids.length-1?'View summary':'Next question'}</button>`;
 $('#next').onclick=next;$('#retry').onclick=()=>renderQuestion();updateQuestionHeader();
 const text=revealed?'Model answer. Not scored.':`${result.score===result.max?'Correct':result.score?'Partly correct':'Not yet correct'}. ${result.score} of ${result.max} marks.`;
 $('#answer-status').textContent=text;resizeActions();if(!revealed)showEncouragement(q,result,options.category||ChemExperience.category(result,S.progress.records[q.id]),!!options.animate);
 const reviewHeading=$('#fb .feedback-heading h2');reviewHeading.tabIndex=-1;reviewHeading.focus({preventScroll:true});$('#fb').scrollIntoView({block:'start',behavior:'auto'});save();if(options.animate&&!revealed)celebrateQuestion(result);
}

function reveal(){if(S.marked)return;const q=current();S.marked=true;record(q,null,'reveal');const r=C.mark(q,S.response,S.bank);disableTask();displayFeedback(q,r,true)}
function next(){S.session.i++;S.response={};save();renderQuestion()}
function tick(){if(!S.session||S.session.finished||S.session.mode!=='challenge')return;const left=C.remaining(S.session.end);if($('#time'))$('#time').textContent=`${Math.floor(Math.ceil(left/1000)/60)}:${String(Math.ceil(left/1000)%60).padStart(2,'0')} left`;if(left===0)finish()}
function finish(show=true){stopTimer();if(!S.session||S.session.finished){if(show&&S.session)summary(S.session);return}const session=S.session;session.finished=true;session.finishedAt=Date.now();session.timedOut=session.mode==='challenge'&&C.remaining(session.end)===0;const stats=sessionStats(session);if(session.mode==='challenge'&&stats.maximum){const prev=S.progress.bests[session.config];if(!prev||stats.accuracy>prev.accuracy||(stats.accuracy===prev.accuracy&&stats.earned>prev.earned))S.progress.bests[session.config]={accuracy:stats.accuracy,earned:stats.earned,maximum:stats.maximum,date:session.finishedAt}}S.progress.sessions.push(C.clone(session));S.progress.sessions=S.progress.sessions.slice(-12);save();if(show)summary(session);}
function sessionMarks(s){return s.plannedMarks??s.ids.reduce((n,id)=>n+(S.bank.questions.find(q=>q.id===id)?.maxMark||0),0)}
function sessionStats(s){const r=Object.values(s.attempts).filter(a=>a.result&&a.first&&!a.revealed);const earned=r.reduce((n,a)=>n+a.result.score,0),maximum=r.reduce((n,a)=>n+a.result.max,0);return {earned,maximum,accuracy:maximum?earned/maximum:0,submitted:r.length,correct:r.filter(a=>a.result.score===a.result.max).length,partial:r.filter(a=>a.result.score>0&&a.result.score<a.result.max).length}}
function summary(s,revisit=false){
 setNavigation('progress');document.body.dataset.screen='summary';stopTimer();S.locked=true;const a=sessionStats(s),pb=S.progress.bests[s.config],perfect=ChemExperience.perfectSession(s,S.bank);
 app().innerHTML=`<div class="card summary-page"><h1>${revisit?'Completed session':'Session summary'}</h1>${perfect?`<section class="perfect-celebration" aria-label="Perfect session"><span class="perfect-trophy-static" aria-hidden="true">${trophySVG()}</span><h2>${U.esc(pickMessage('perfect'))}</h2><p>Every question fully correct on its first attempt.</p></section>`:''}<p class="summary-score">${a.maximum?`${a.earned} / ${a.maximum}`:'No scored answers'}<span>${a.maximum?`${Math.round(a.accuracy*100)}% accuracy on submitted answers`:'Answers revealed or not submitted are not scored'}</span></p><p class="session-completion"><strong>${a.submitted} of ${s.ids.length} questions submitted for marking</strong><span>${a.maximum} of ${sessionMarks(s)} ${s.mode==='challenge'?'available':'planned'} marks submitted for marking</span></p><p class="session-budget">${s.ids.length} question${s.ids.length===1?'':'s'} · ${sessionMarks(s)} mark${sessionMarks(s)===1?'':'s'} planned${s.timedOut?' · time finished':''}</p><div class="summary-outcomes"><span>${a.correct} correct</span><span>${a.partial} partly correct</span><span>${a.submitted-a.correct-a.partial} incorrect</span><span>${s.ids.filter(id=>s.attempts[id]?.revealed).length} revealed</span><span>${s.ids.filter(id=>!s.attempts[id]).length} not attempted</span></div><p class="muted">Retries and reveals do not increase first-attempt accuracy.</p>${s.mode==='challenge'&&pb?`<details><summary>Personal best</summary><p>${Math.round(pb.accuracy*100)}% accuracy on submitted answers · ${pb.earned}/${pb.maximum} marks for these exact settings.</p><p>Topics, types, difficulty, duration and question-bank/scoring versions must match.</p></details>`:''}<h2>Review your answers</h2><div class="summary-reviews">${s.ids.map((id,i)=>{const q=S.bank.questions.find(q=>q.id===id),attempt=s.attempts[id];return `<details><summary><span>Question ${i+1} · ${U.esc(q.title)}</span><span>${attempt?.result?attempt.result.score+'/'+attempt.result.max:attempt?.revealed?'Revealed':'Not attempted'}</span></summary>${attempt?.result?U.feedback(S.bank,q,attempt.result,attempt.response):!attempt?`<p>Not attempted.</p><button class="btn secondary" data-summary-reveal="${id}">Reveal answer · no first-attempt score</button>`:`${U.modelAnswer(S.bank,q)}`}</details>`}).join('')}</div><div class="action-dock"><button class="btn" id="choose">Choose topics</button>${S.suspended?'<button class="btn secondary" id="resume-practice">Resume practice</button>':''}</div><p id="summary-status" class="sr-only" role="status">${perfect?'Perfect session. ':''}${a.submitted} of ${s.ids.length} questions submitted for marking. ${a.maximum?`${a.earned} of ${a.maximum} marks on submitted answers.`:'No scored answers.'}</p></div>`;
 $('#choose').onclick=home;if($('#resume-practice'))$('#resume-practice').onclick=resumePractice;
 document.querySelectorAll('[data-summary-reveal]').forEach(el=>el.onclick=()=>{const id=el.dataset.summaryReveal;S.progress.records[id]=C.progressEvent(S.progress.records[id],'reveal');s.attempts[id]={response:{},result:null,first:false,revealed:true};const old=S.progress.sessions.findIndex(x=>x.id===s.id);if(old>=0)S.progress.sessions[old]=C.clone(s);save();summary(s,revisit)});
 U.focusHeading();document.querySelector('.summary-page h1')?.scrollIntoView({block:'start',behavior:'auto'});resizeActions();if(perfect&&!revisit&&!celebratedSessions.has(s.id)){celebratedSessions.add(s.id);celebrateSession({sound:true})}
}

function setNavigation(view){
 clearEffects();clearSessionControls();if(view==='topics')view='practice';S.view=view;document.body.dataset.screen=view;document.body.dataset.view=view;
 document.querySelectorAll('[data-nav]').forEach(el=>{const challenge=S.session?.mode==='challenge'&&!S.session.finished;el.disabled=challenge&&el.dataset.nav!=='practice';el.title=el.disabled?'Finish the challenge before opening this section':'';const active=el.dataset.nav===view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
}

function questionHeader(){
 const s=S.session,marked=sessionStats(s).submitted,revealed=s.ids.filter(id=>s.attempts[id]?.revealed).length,progress=Math.min(s.ids.length,marked+revealed),challenge=s.mode==='challenge';return `<div class="question-topline"><p>Question ${s.i+1} of ${s.ids.length}</p>${challenge?'<strong id="time" role="timer" aria-live="off"></strong>':''}<span class="question-value">${current().maxMark} mark${current().maxMark===1?'':'s'}</span></div><div class="session-progress" role="progressbar" aria-label="Questions checked or revealed" aria-valuemin="0" aria-valuemax="${s.ids.length}" aria-valuenow="${progress}" aria-valuetext="${progress} of ${s.ids.length} questions checked or revealed; ${marked} submitted for marking; ${revealed} revealed"><i style="width:${100*progress/s.ids.length}%"></i></div><p class="session-size">${s.ids.length} question${s.ids.length===1?'':'s'} · ${sessionMarks(s)} mark${sessionMarks(s)===1?'':'s'} ${challenge?'available':'in this session'}</p>`;
}

function updateQuestionHeader(){if($('#clean-question-header'))$('#clean-question-header').innerHTML=questionHeader();if(S.session.mode==='challenge')tick()}

function resumePractice(){if(!S.session&&!S.suspended){home();save();return}if(S.suspended){const draft=S.suspended;S.suspended=null;S.session=draft.session;S.response=draft.response;S.orders=draft.orders;S.activeStep=draft.activeStep;S.marked=draft.marked;S.result=draft.result;S.source=draft.source}if(S.session.mode==='challenge'&&C.remaining(S.session.end)===0){finish();return}renderQuestion(true);if(S.marked&&S.session.mode!=='challenge'){disableTask();displayFeedback(current(),S.result||C.mark(current(),S.response,S.bank),!!S.session.attempts[current().id]?.revealed)}if(S.source&&$('#arrow-status'))$('#arrow-status').textContent='Source: '+current().mechanism.anchors.find(a=>a.id===S.source).label+'. Now choose a destination.';stopTimer();if(S.session.mode==='challenge')S.timer=setInterval(tick,250);save()}
function showMistakeOverview(){
 suspendPractice();stopTimer();S.session=null;setNavigation('mistakes');const mistakes=eligible().filter(q=>['partial','incorrect'].includes(S.progress.records[q.id]?.first?.outcome));
 app().innerHTML=`<div class="card progress-page"><h1>Review mistakes</h1><p>${mistakes.length?`${mistakes.length} questions to revisit from your selected topics.`:'No mistakes to review from your selected topics yet.'}</p>${mistakes.length?`<details><summary>Questions to revisit</summary><ul>${mistakes.map(q=>`<li>${U.esc(q.title)}</li>`).join('')}</ul></details><div class="action-dock"><button class="btn" id="begin-mistakes">Review these questions</button></div>`:''}${S.suspended?'<p><button class="btn secondary" id="resume-practice">Resume practice</button></p>':''}<p class="muted">Retries do not change your first-attempt score.</p>${!mistakes.length?'<button class="btn" id="choose-topics">Choose topics</button>':''}</div>`;
 if($('#begin-mistakes'))$('#begin-mistakes').onclick=()=>start('mistakes',mistakes);if($('#resume-practice'))$('#resume-practice').onclick=resumePractice;if($('#choose-topics'))$('#choose-topics').onclick=home;mountSessionEnd();save();resizeActions();U.focusHeading();
}

function finishCurrentSession(){
 if(S.suspended){S.session=S.suspended.session;S.suspended=null;}finish();
}
function mountSessionEnd(){
 if(!S.suspended||S.suspended.session.finished)return;
 app().insertAdjacentHTML('beforeend','<details class="saved-session"><summary>Saved session</summary><button class="btn text-button" id="finish-current">Finish saved session</button><p>Your submitted marks are saved.</p></details>');$('#finish-current').onclick=finishCurrentSession;
}

function recentMistakes(){
 const times={};
 for(const session of [...S.progress.sessions,...(S.suspended?[S.suspended.session]:[])])for(const [id,a]of Object.entries(session.attempts||{}))if(a.result&&a.result.score<a.result.max)times[id]=Math.max(times[id]||0,session.started||0);
 return S.bank.questions.filter(q=>q.enabled!==false&&['partial','incorrect'].includes(S.progress.records[q.id]?.first?.outcome)).map(q=>({q,time:S.progress.records[q.id].lastMistakeAt||times[q.id]||0})).sort((a,b)=>b.time-a.time).slice(0,10).map(x=>x.q);
}
function showProgress(){
 suspendPractice();stopTimer();S.session=null;S.locked=false;setNavigation('progress');
 const activeQuestions=S.bank.questions.filter(q=>q.enabled!==false),activeRecords=Object.fromEntries(activeQuestions.filter(q=>S.progress.records[q.id]).map(q=>[q.id,S.progress.records[q.id]])),a=C.accuracy(activeRecords),mistakes=recentMistakes();
 app().innerHTML=`<div class="card progress-page"><h1>Your progress</h1><div class="summary-outcomes"><span>${a.correct} correct</span><span>${a.partial} partly correct</span><span>${a.incorrect} incorrect</span></div><p class="muted">First unrevealed attempts · ${activeQuestions.length-a.total} questions without a first-attempt score.</p>${S.suspended?'<button class="btn" id="resume-practice">Resume practice</button>':''}<section aria-labelledby="recent-mistakes-heading"><h2 id="recent-mistakes-heading">Recent mistakes</h2>${mistakes.length?`<ul class="recent-mistakes">${mistakes.map(q=>{const r=S.progress.records[q.id];return `<li><div><strong>${U.esc(q.title)}</strong><span>${U.esc(U.typeLabel(q.type))} · ${r.first.score}/${r.first.max} first-attempt marks${r.correctAfterRetry?' · corrected on retry':''}</span></div><button class="btn secondary" data-review-mistake="${q.id}">Try again</button></li>`}).join('')}</ul>`:'<p>No first-attempt mistakes recorded yet.</p>'}</section><details><summary>Question-by-question progress</summary><ul>${activeQuestions.map(q=>{const r=S.progress.records[q.id];return `<li>${q.id}: ${U.esc(C.outcome(r))}${r?.correctAfterRetry?' · correct after retry':''}${r?.revealed?' · answer revealed':''}</li>`}).join('')}</ul></details>${S.progress.sessions.length?`<h2>Completed sessions</h2><div class="grid">${S.progress.sessions.slice().reverse().map(s=>`<button class="btn secondary" data-session="${s.id}">${new Date(s.started).toLocaleString('en-GB')} · ${s.mode} · ${s.ids.length} questions</button>`).join('')}</div>`:''}<details><summary>Privacy and storage</summary><p>Selections, first attempts, retries, reveals, up to 12 completed sessions and matching personal bests are stored in this browser. A bank or scoring version change starts fresh progress. Practice still works if storage is blocked.</p><button class="btn text-button" id="reset">Reset progress on this device</button></details></div>`;
 $('#reset').onclick=()=>{app().innerHTML='<div class="card"><h1>Reset progress?</h1><p>This deletes stored attempts, sessions and personal bests on this device.</p><div class="row"><button id="yes" class="btn">Reset progress</button><button id="cancel" class="btn secondary">Cancel</button></div></div>';$('#yes').onclick=()=>{S.suspended=null;S.session=null;S.progress=C.restoreProgress(null,S.bank);save();showProgress()};$('#cancel').onclick=showProgress;U.focusHeading()};
 if($('#resume-practice'))$('#resume-practice').onclick=resumePractice;document.querySelectorAll('[data-session]').forEach(el=>el.onclick=()=>summary(S.progress.sessions.find(s=>s.id===el.dataset.session),true));document.querySelectorAll('[data-review-mistake]').forEach(el=>el.onclick=()=>{const q=S.bank.questions.find(q=>q.id===el.dataset.reviewMistake&&q.enabled!==false);if(q)start('mistakes',[q])});mountSessionEnd();save();resizeActions();U.focusHeading();
}

function initialiseNavigation(){document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>{if(!S.bank)return;const view=el.dataset.nav;if(view==='practice'){if(S.session?.finished)S.session=null;resumePractice();return}if(view==='mistakes'){showMistakeOverview();return}if(view==='progress'){showProgress();return}home();save()})}
const setupDisclosures={};
let celebrationEffects=storage.get('ocrOrgCelebrationsV1',true)!==false;
let celebrationSound=storage.get('ocrOrgCelebrationSoundV1',false)===true;
const pickMessage=ChemExperience.messagePicker(),celebratedSessions=new Set();
let effectTimer=null,effectAnimations=[],actionObserver=null,partyAudio=null,effectRun=0;

function sessionMenu(q){
 const challenge=S.session.mode==='challenge';return `<details class="session-menu"><summary>Session menu</summary><div class="session-menu-panel"><p class="menu-score">${challenge?'Feedback at the end':`Score so far: ${sessionStats(S.session).earned} / ${sessionMarks(S.session)} marks`}</p>${challenge?'':`<button class="btn text-button" id="change-topics" data-session-action="topics">Change topics</button><button class="btn text-button" data-session-nav="mistakes" data-session-action="mistakes">Mistakes</button><button class="btn text-button" data-session-nav="progress" data-session-action="progress">Progress</button>`}<button class="btn text-button" id="exit" data-session-action="finish">Finish session</button><label class="topic"><input type="checkbox" id="question-effects" ${celebrationEffects?'checked':''}><span>Celebration effects</span></label>${celebrationSoundControl('question-sound')}</div></details>`;
}
function challengeFeedback(){
 $('#task').hidden=true;$('.action-row').innerHTML=`<button class="btn" id="next">${S.session.i===S.session.ids.length-1?'View summary':'Next question'}</button>`;$('#fb').innerHTML='<p class="submission-saved">Submission saved. Feedback appears at the end of the challenge.</p>';$('#next').onclick=next;$('#answer-status').textContent='Submission saved. Feedback at the end.';updateQuestionHeader();resizeActions();
}
function trophySVG(){return '<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><path d="M27 20H10v19c0 19 12 31 31 34M93 20h17v19c0 19-12 31-31 34" fill="none" stroke="#a77917" stroke-width="9"/><path d="M25 10h70v35c0 29-15 44-35 44S25 74 25 45Z" fill="#e3b649" stroke="#a77917" stroke-width="3"/><path d="M33 17h12v31c0 13 3 23 10 30-14-7-22-18-22-34Z" fill="#fff0ac"/><path d="M54 88h12v24H54Z" fill="#b6861c"/><path d="M42 109h36l9 16H33Z" fill="#d9ab38" stroke="#a77917" stroke-width="3"/><rect x="25" y="125" width="70" height="10" rx="3" fill="#14563e"/><text x="60" y="61" fill="#172d3a" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="35">1</text></svg>'}
function celebrationSoundControl(id){return `<label class="topic"><input type="checkbox" id="${id}" ${celebrationSound?'checked':''}><span>Party-blower sound<span class="topic-code">Perfect sessions only · off by default.</span></span></label>`}
function bindCelebrationSound(id){const control=document.getElementById(id);if(control)control.onchange=e=>{celebrationSound=e.target.checked;storage.set('ocrOrgCelebrationSoundV1',celebrationSound);if(!celebrationSound)stopPartySound()}}
function stopPartySound(){if(partyAudio){partyAudio.pause();try{partyAudio.currentTime=0}catch{}}}
function playPartySound(){
 if(!celebrationEffects||!celebrationSound||document.hidden)return;
 if(!partyAudio){partyAudio=new Audio(window.CHEM_PARTY_SOUND||'assets/audio/party-blowers.wav?v='+encodeURIComponent(window.CHEM_BUILD?.id||'20261013-v1.3'));partyAudio.preload='auto';partyAudio.volume=.45}
 const run=effectRun;try{partyAudio.currentTime=0;const playing=partyAudio.play();playing?.then(()=>{if(run!==effectRun||!celebrationSound||!celebrationEffects||document.hidden)stopPartySound()}).catch(()=>{})}catch{}
}
function clearEffects(){ChemEffects.clear();effectRun++;clearTimeout(effectTimer);effectTimer=null;effectAnimations.forEach(a=>a.cancel());effectAnimations=[];document.querySelectorAll('.confetti-layer,.shooting-star-layer,.celebration-layer').forEach(el=>el.remove());stopPartySound()}
function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false}
function showEncouragement(q,result,category,animate){
 const host=$('#encouragement');if(!host)return;
 const tip=U.feedbackTip(S.bank,q,result),variant=['tick','highlight','sparkle'][Math.floor(Math.random()*3)],symbol=category==='partial'?'½':category==='incorrect'?'↗':'✓';
 host.innerHTML=`<aside class="encouragement ${category} effect-${variant}"><button class="encouragement-dismiss" aria-label="Dismiss encouragement" type="button">×</button><span class="celebration-symbol" aria-hidden="true">${symbol}</span><div><h2>${U.esc(pickMessage(category))}</h2><p>${U.esc(tip)}</p></div></aside>`;
 host.querySelector('button').onclick=()=>{host.replaceChildren();$('#next')?.focus({preventScroll:true})};
 if(animate&&celebrationEffects&&!reducedMotion())host.querySelector('aside').classList.add('encouragement-enter');
}
function celebrateQuestion(result){
 if(!celebrationEffects||!ChemExperience.fullMarkSubmission(result,S.session.mode,{submitted:true,revealed:false}))return;
 clearEffects();ChemEffects.setPreferences(celebrationEffects,false);ChemEffects.question(result.score,result.max);
}
function celebrateSession({sound=false}={}){
 if(!celebrationEffects)return;clearEffects();
 ChemEffects.setPreferences(celebrationEffects,false);ChemEffects.session();
 if(sound)playPartySound();if(!reducedMotion()||(sound&&celebrationSound))effectTimer=setTimeout(clearEffects,5400);
}

function resizeActions(){
 actionObserver?.disconnect();const dock=document.querySelector('.action-dock'),bar=document.querySelector('.mobile-session-controls');
 const measure=()=>{const vv=window.visualViewport,gap=vv?Math.max(0,window.innerHeight-vv.height-vv.offsetTop):0,keyboard=!!vv&&vv.scale<=1.05&&gap>160&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);document.documentElement.style.setProperty('--action-height',(dock?.offsetHeight||0)+'px');document.documentElement.style.setProperty('--session-bar-space',(bar?.offsetHeight||0)+'px');document.documentElement.style.setProperty('--session-keyboard-inset',(bar&&keyboard?gap:0)+'px');document.body.classList.toggle('keyboard-open',keyboard)};
 measure();if(window.ResizeObserver){actionObserver=new ResizeObserver(measure);if(dock)actionObserver.observe(dock);if(bar)actionObserver.observe(bar)};
}
window.visualViewport?.addEventListener('resize',resizeActions);
window.visualViewport?.addEventListener('scroll',resizeActions);
window.addEventListener('resize',resizeActions);
document.addEventListener('focusin',()=>{resizeActions();requestAnimationFrame(ensureFocusedVisible)});
document.addEventListener('focusout',()=>requestAnimationFrame(resizeActions));
window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener('change',clearEffects);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearEffects()});
window.addEventListener('pagehide',clearEffects);


function clearSessionControls(){
 document.querySelector('.mobile-session-controls')?.remove();document.documentElement.style.setProperty('--session-bar-space','0px');document.documentElement.style.setProperty('--session-keyboard-inset','0px');
}
function mountSessionControls(){
 clearSessionControls();const challenge=S.session.mode==='challenge';
 document.body.insertAdjacentHTML('beforeend',`<nav class="mobile-session-controls" aria-label="Session controls"><button type="button" class="session-control" id="mobile-change-topics" data-session-action="topics" ${challenge?'disabled aria-describedby="mobile-challenge-help"':''}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v7l-5 9a1 1 0 0 0 1 2h12a1 1 0 0 0 1-2l-5-9V3M8 15h8"/></svg><span>Change topics</span></button><button type="button" class="session-control" id="mobile-mistakes" data-session-action="mistakes" ${challenge?'disabled aria-describedby="mobile-challenge-help"':''}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg><span>Mistakes</span></button><button type="button" class="session-control finish-control" id="mobile-finish-session" data-session-action="finish"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5H5v14h8M10 12h11m-4-4 4 4-4 4"/></svg><span>Finish session</span></button>${challenge?'<p id="mobile-challenge-help">Topics and mistakes unlock when the challenge ends.</p>':''}</nav>`);
}
function performSessionAction(action){
 if(S.session?.mode==='challenge'&&!S.session.finished&&action!=='finish')return;
 if(action==='topics')home();else if(action==='mistakes')showMistakeOverview();else if(action==='progress')showProgress();else if(action==='finish')finish();
}
function bindSessionActions(){
 document.querySelectorAll('[data-session-action]').forEach(button=>button.onclick=()=>performSessionAction(button.dataset.sessionAction));
}
function ensureFocusedVisible(){
 const target=document.activeElement,bar=document.querySelector('.mobile-session-controls');if(!bar?.offsetHeight||!target?.matches('button,input,textarea,select,summary')||bar.contains(target))return;
 const bounds=target.getBoundingClientRect(),barTop=bar.getBoundingClientRect().top;
 if(bounds.bottom>barTop-12)window.scrollBy({top:Math.ceil(bounds.bottom-barTop+12),behavior:'auto'});
}

initialiseNavigation();
const bottomNav=document.querySelector('.side-nav');
if(bottomNav){const reserve=()=>document.documentElement.style.setProperty('--mobile-nav-space',(bottomNav.offsetHeight+18)+'px');reserve();if(window.ResizeObserver)new ResizeObserver(reserve).observe(bottomNav);window.addEventListener('resize',reserve)}

window.addEventListener('visibilitychange',tick);window.addEventListener('focus',tick);
U.load().then(b=>{S.bank=b;const check=C.validate(b);if(check.errors.length)throw Error('Invalid question bank: '+check.errors.join('; '));const p=storage.get('ocrOrgPrefsV2',{});S.topics=(p.topics||[]).filter(id=>b.topics.some(t=>t.id===id));for(const key of ['types','difficulty','statuses'])if(Array.isArray(p[key])&&key!=='statuses')S[key]=p[key];const saved=storage.get('ocrOrgProgressV2',null);S.progress=C.restoreProgress(saved,b);const active=storage.get('ocrOrgActiveV2',null);const oldPractice=active?.mode==='practice'&&active.practicePolicy!=='practice-20-v1';if(active&&!oldPractice&&C.compatibleBankVersion(JSON.parse(active.config).bankVersion,b)&&JSON.parse(active.config).scoringVersion===b.meta.scoringVersion&&active.ids.every(id=>b.questions.some(q=>q.id===id&&q.enabled!==false))){S.session=active;S.response=active.response||{};const ui=active.ui||{};S.orders=ui.orders||{};S.activeStep=ui.activeStep||0;S.marked=!!ui.marked;S.result=ui.result||null;S.source=ui.source||null;delete S.session.response;delete S.session.ui;if(ui.view&&ui.view!=='practice'&&active.mode!=='challenge'){if(ui.view==='mistakes')showMistakeOverview();else if(ui.view==='progress')showProgress();else home()}else if(active.mode==='challenge'&&C.remaining(active.end)===0)finish();else resumePractice()}else{home();if(oldPractice){const notice=document.createElement('p');notice.className='notice';notice.textContent='Random practice now uses sessions of about 20 marks. Start a new session below; your first-attempt progress has been kept.';app().prepend(notice)}if(S.progress.reset){const notice=document.createElement('p');notice.className='notice';notice.textContent='The question bank or scoring rules have changed. Incompatible old progress has been cleared safely.';app().prepend(notice)}}const preview=new URLSearchParams(location.search).get('preview');if(preview&&!active){const q=b.questions.find(q=>q.id===preview&&(q.enabled!==false||window.CHEM_PREVIEW_ID));if(q){S.topics=q.prerequisites;start('preview',[q])}}save()}).catch(e=>{app().innerHTML=`<div class="card"><h1>Question bank could not load</h1><p>${U.esc(e.message)}</p><p>Use the hosted GitHub Pages site. A double-clicked local file cannot fetch its question bank. See README.md. </p></div>`});
