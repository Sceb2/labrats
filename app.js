'use strict';
const C=ChemCore,$=s=>document.querySelector(s),app=()=>$('#app');
let nativeStorage;try{nativeStorage=window.localStorage}catch{nativeStorage={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}}
const storage=C.safeStorage(nativeStorage);
const S={suspended:null,view:'topics',bank:null,topics:[],types:[...C.TYPES],difficulty:[...C.DIFFICULTIES],statuses:['draft','teacher-review-required','teacher-approved'],progress:null,session:null,response:{},marked:false,result:null,orders:{},activeStep:0,source:null,timer:null,locked:false};
function snapshotPractice(){return {session:C.clone(S.session),response:C.clone(S.response),orders:C.clone(S.orders),activeStep:S.activeStep,marked:S.marked,result:C.clone(S.result),source:S.source}}
function suspendPractice(){if(S.session&&!S.session.finished)S.suspended=snapshotPractice()}
function save(){storage.set('ocrOrgPrefsV2',{topics:S.topics,types:S.types,difficulty:S.difficulty,statuses:S.statuses});if(!storage.set('ocrOrgProgressV2',S.progress))$('#storage-note').textContent=' Storage is unavailable; this visit still works.';const draft=S.session&&!S.session.finished?snapshotPractice():S.suspended;if(draft&&!draft.session.finished)storage.set('ocrOrgActiveV2',{...draft.session,response:draft.response,ui:{orders:draft.orders,activeStep:draft.activeStep,marked:draft.marked,result:draft.result,source:draft.source,view:S.view}});else storage.remove('ocrOrgActiveV2')}
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
 S.bank.topics.forEach(t=>(groups[t.module]??=[]).push(t));
 const noQuestions=!S.types.length?'Select at least one question type in Practice settings.':!S.difficulty.length?'Select at least one difficulty in Practice settings.':!S.topics.length?'Select a topic you have studied to start.':!S.topics.includes('basic')?'Select Basic concepts and nomenclature to include the required foundation.':'No questions match. Select the other required topics or broaden your Practice settings.';
 const settingsLabel=`${S.types.length===C.TYPES.length?'All question types':S.types.length+' question types'} · ${S.difficulty.length===C.DIFFICULTIES.length?'all difficulties':S.difficulty.length+' difficulties'}`;
 app().innerHTML=`<div class="card setup-page"><header class="page-heading"><h1>Choose your topics</h1><p>Select topics you have studied.</p></header><details class="selection-tools" data-disclosure="selection" ${setupDisclosures.selection?'open':''}><summary>Selection tools</summary><div class="row"><button class="btn text-button" id="all">Select all</button><button class="btn text-button" id="none">Clear topics</button></div><p class="muted">Questions appear when all their required topics are selected.</p></details>${Object.entries(groups).map(([module,topics],i)=>`<details class="module-section" data-disclosure="${U.esc(module)}" ${setupDisclosures[module]??i===0?'open':''}><summary><span>${U.esc(module)}</span><span class="module-selected">${topics.filter(t=>S.topics.includes(t.id)).length} selected</span></summary>${checklist(topics,S.topics,'topic')}</details>`).join('')}<p class="foundation-note">${S.topics.includes('basic')?'Basic concepts included automatically.':'Selecting a reaction topic includes Basic concepts.'}</p><details class="practice-settings" data-disclosure="settings" ${setupDisclosures.settings?'open':''}><summary>Practice settings <span>${U.esc(settingsLabel)}</span></summary><h2>Question types</h2>${checklist(C.TYPES.map(id=>({id,label:U.typeLabel(id)})),S.types,'type')}<h2>Difficulty</h2>${checklist(C.DIFFICULTIES.map(id=>({id,label:id})),S.difficulty,'difficulty')}<label class="topic"><input type="checkbox" id="celebration-effects" ${celebrationEffects?'checked':''}><span>Celebration effects<span class="topic-code">Reduced-motion preferences are always respected.</span></span></label>${celebrationSoundControl('celebration-sound')}<details><summary>About your session</summary><p>Untimed practice uses about 20 marks. Larger synthesis questions can give up to 23; small question pools give shorter sessions.</p></details></details><details class="challenge-settings" data-disclosure="challenge" ${setupDisclosures.challenge?'open':''}><summary>Personal challenge <span>Optional · timed</span></summary><label class="control" for="duration">Duration<select id="duration"><option value="5">5 minutes</option><option value="10">10 minutes</option></select></label><p>Feedback appears at the end.</p><button class="btn secondary" id="challenge" ${eligibleQ.length?'':'disabled'}>Begin challenge</button><details><summary>How challenge scores work</summary><p>Only first submissions count. Partial marks count; speed earns no bonus. Accuracy is marks earned ÷ marks available on submitted questions. Personal bests compare identical settings and use marks earned to break an accuracy tie. Questions do not repeat.</p></details></details>${mistakes.length?`<p class="setup-mistakes"><button class="btn text-button" id="mistakes">Review ${mistakes.length} first-attempt mistakes</button></p>`:''}<section class="setup-actions action-dock" aria-label="Start or resume practice"><p id="eligible-count" role="status">${S.topics.length} ${S.topics.length===1?'topic':'topics'} selected · ${eligibleQ.length} questions available · about 20 marks</p>${!eligibleQ.length?`<p id="start-help" class="start-help">${noQuestions}</p>`:''}${S.suspended?'<button class="btn" id="resume-practice">Resume practice</button>':''}<button class="btn ${S.suspended?'secondary':''}" id="practice" ${eligibleQ.length?'':'disabled aria-describedby="start-help"'}>Start ${S.suspended?'new ':''}practice</button></section></div>`;
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
function bindComponents(){document.querySelectorAll('[data-component]').forEach(el=>el.onchange=()=>{const pre=el.dataset.prefix;if(pre){const id=pre.slice(0,-1);(S.response[id]??={})[el.dataset.component]=el.value}else S.response[el.dataset.component]=el.value;save();if(current().type==='multistep')refreshRouteState(current())})}
function drawMechanism(q,readonly=false){
 const m=q.mechanism||q.site,anchors=m.anchors;
 const position=(a,i)=>({x:a.labelX??55+i*490/Math.max(1,anchors.length-1),y:a.labelY??37});
 return `<div class="mechanism-canvas">${U.image(S.bank,m.asset)}<svg class="anchor-guides" viewBox="0 0 600 320" aria-hidden="true">${anchors.map((a,i)=>{const p=position(a,i);return `<line x1="${p.x}" y1="${p.y+16}" x2="${a.x}" y2="${a.y}"/><circle cx="${a.x}" cy="${a.y}" r="4"/>`}).join('')}</svg>${anchors.map((a,i)=>{const p=position(a,i);return `<button class="anchor" type="button" data-anchor="${a.id}" style="left:${100*p.x/600}%;top:${100*p.y/320}%" aria-label="${i+1} — ${U.esc(a.label)} (${a.kind})" ${readonly?'disabled':''}>${i+1}</button><span class="anchor-marker" style="left:${100*p.x/600}%;top:${100*p.y/320}%" aria-hidden="true">${i+1}</span>`}).join('')}<svg class="arrow-layer" viewBox="0 0 600 320" aria-hidden="true"><defs><marker id="drawhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#0f766e"/></marker></defs><g id="student-arrows"></g></svg></div><div class="site-buttons grid">${anchors.map((a,i)=>`<button type="button" class="btn secondary" data-anchor="${a.id}" ${readonly?'disabled':''}>${i+1} — ${U.esc(a.label)}</button>`).join('')}</div>`
}
function arrowsControls(q){return `<p id="arrow-status" class="interaction-status" role="status">Choose an electron source, then its destination.</p>${drawMechanism(q)}<div class="mechanism-tools"><button type="button" class="btn text-button" id="undo">Undo last arrow</button><details><summary>Arrow tools</summary><button type="button" class="btn text-button" id="cancel-source">Cancel source selection</button><button type="button" class="btn text-button" id="clear-arrows">Clear arrows</button></details></div><ol id="arrow-list" aria-label="Placed electron arrows"></ol>`}

function refreshArrows(q){const an=q.mechanism.anchors;$('#student-arrows').innerHTML=(S.response.arrows||[]).map(p=>{const a=an.find(a=>a.id===p.from),b=an.find(a=>a.id===p.to);return a&&b?`<path d="${U.arrowPath(a.x,a.y,b.x,b.y)}" fill="none" stroke="#0f766e" stroke-width="3" marker-end="url(#drawhead)"/>`:''}).join('');$('#arrow-list').innerHTML=(S.response.arrows||[]).map(p=>`<li>${U.esc(an.find(a=>a.id===p.from)?.label)} → ${U.esc(an.find(a=>a.id===p.to)?.label)}</li>`).join('');document.querySelectorAll('[data-anchor]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.anchor===S.source)))}
function addArrow(q,from,to){if(from===to){$('#arrow-status').textContent='Use two distinct sites. The source is still selected.';return}S.response.arrows??=[];if(S.response.arrows.some(p=>p.from===from&&p.to===to)){S.source=null;refreshArrows(q);$('#arrow-status').textContent='That arrow is already present. Choose a new source.';return}S.response.arrows.push({from,to});S.source=null;refreshArrows(q);save();$('#arrow-status').textContent='Arrow added. Choose another source, or submit.'}
function bindArrows(q){refreshArrows(q);document.querySelectorAll('[data-anchor]').forEach(el=>el.onclick=()=>{if(S.marked)return;if(!S.source){S.source=el.dataset.anchor;$('#arrow-status').textContent='Source: '+q.mechanism.anchors.find(a=>a.id===S.source).label+'. Now choose a destination.';refreshArrows(q)}else addArrow(q,S.source,el.dataset.anchor)});$('#cancel-source').onclick=()=>{S.source=null;refreshArrows(q);$('#arrow-status').textContent='Source selection cancelled. Choose an electron source.'};$('#undo').onclick=()=>{S.response.arrows?.pop();S.source=null;refreshArrows(q);save();$('#arrow-status').textContent='Last arrow removed.'};$('#clear-arrows').onclick=()=>{S.response.arrows=[];S.source=null;refreshArrows(q);save();$('#arrow-status').textContent='Arrows cleared.'}}
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
function reportQuestionControls(q){return `<details class="question-report"><summary>Report question</summary><p>Question code: <strong>${U.esc(q.id)}</strong>. Describe the issue, then open an email draft. You can attach your own screenshot in the email app.</p><label for="report-issue">What looks wrong?</label><textarea id="report-issue" rows="3" maxlength="600" placeholder="Describe the science, diagram or marking problem…"></textarea><div class="row"><a class="btn secondary" id="report-email">Open email draft</a><button type="button" class="btn secondary" id="copy-report">Copy report</button></div><p id="report-recipient" class="muted"></p><label for="report-preview">Report text</label><textarea id="report-preview" rows="7" readonly></textarea><p id="report-status" role="status"></p></details>`}
function questionReportText(q,issue=''){
 let link='Offline preview';try{if(/^https?:/.test(location.protocol)){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('preview',q.id);link=url.href}}catch{}
 return `Question report — OCR Organic Chemistry\nQuestion code: ${q.id}\nQuestion: ${q.title}\nBank version: ${S.bank.meta.bankVersion}\nLink: ${link}\n\nQuestion wording:\n${q.prompt}\n\nProblem noticed:\n${issue.trim()||'[Describe the problem here]'}\n\nPlease attach a screenshot if it helps explain the issue.`;
}
function reportMailto(email,q,body){const recipient=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)?email:'';return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent('Question report: '+q.id+' — '+q.title)}&body=${encodeURIComponent(body.replace(/\r?\n/g,'\r\n'))}`}
function bindQuestionReport(q){
 let email=window.CHEM_REPORT_EMAIL||'';
 const update=()=>{const body=questionReportText(q,$('#report-issue').value||'');$('#report-preview').value=body;$('#report-email').href=reportMailto(email,q,body);$('#report-recipient').textContent=email?'To: '+email:'Add your teacher’s email address in the To field before sending.'};
 $('#report-issue').oninput=update;$('#report-email').onclick=()=>{$('#report-status').textContent='Opening your email app. Check the draft, add any screenshot and send it there. If nothing opens, use Copy report.'};
 $('#copy-report').onclick=async()=>{try{await navigator.clipboard.writeText($('#report-preview').value);$('#report-status').textContent='Report copied. Paste it into an email to your teacher.'}catch{$('#report-preview').focus();$('#report-preview').select();$('#report-status').textContent='Select and copy the report text, then paste it into your email.'}};
 update();if(!email&&location.protocol!=='file:')fetch('report-config.json',{cache:'no-store'}).then(x=>x.ok?x.json():{}).then(config=>{if(typeof config.email==='string'&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(config.email)){email=config.email;update()}}).catch(()=>{});
}
function taskInstructions(q){return `<section class="task-instructions" aria-label="Your task"><p class="task-sentence">${U.esc(q.prompt)}</p></section>`}
function renderQuestion(keepResponse=false){
 setNavigation('practice');document.body.dataset.screen='question';
 if(S.session.mode==='challenge'&&C.remaining(S.session.end)===0)return finish();if(S.session.i>=S.session.ids.length)return finish();
 const q=current();if(!keepResponse){S.response={};S.orders={};S.marked=false;S.result=null;S.source=null;S.activeStep=0}S.locked=false;
 app().innerHTML=`<article class="card question-screen ${q.type==='multistep'?'synthesis-screen':''}"><div class="question-chrome"><div id="clean-question-header">${questionHeader()}</div>${sessionMenu(q)}</div><h1>${U.esc(U.typeLabel(q.type))}</h1>${taskInstructions(q)}<div class="question-context">${U.questionIntro(S.bank,q)}</div><div id="task"></div><div id="fb"></div><div class="action-row answer-actions"><div class="secondary-actions">${S.session.mode!=='challenge'?'<button class="btn text-button" id="reveal">Reveal answer<span>No marks awarded</span></button>':''}</div><button class="btn" id="submit">${S.session.mode==='challenge'?'Submit answer':q.type==='multistep'?'Check all steps':'Check answer'}</button></div><p class="sr-only" id="answer-status" role="status" aria-atomic="true"></p></article>`;
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

function submit(){
 if(S.marked||S.locked)return;if(S.session.mode==='challenge'&&C.remaining(S.session.end)===0)return finish();
 const q=current(),previous=C.clone(S.progress.records[q.id]||{}),result=C.mark(q,S.response,S.bank);S.marked=true;S.result=result;record(q,result,'submit');disableTask();updateQuestionHeader();
 if(S.session.mode==='challenge')challengeFeedback();else displayFeedback(q,result,false,{animate:true,category:ChemExperience.category(result,previous)});
}

function displayFeedback(q,result,revealed=false,options={}){
 $('#task').hidden=true;document.body.dataset.screen='feedback';
 const context=$('.question-context');if(context?.children.length&&!context.querySelector('details'))context.innerHTML=`<details class="review-context"><summary>View question diagram</summary>${context.innerHTML}</details>`;
 $('#fb').innerHTML=`${revealed?'<p class="reveal-notice">Answer revealed — no first-attempt marks awarded</p>':'<div id="encouragement"></div>'}${U.feedback(S.bank,q,result,S.response)}${q.type==='multistep'?`<details class="completed-pathway"><summary>View completed pathway</summary>${pathway(q,true)}</details>`:''}`;
 $('.action-row').innerHTML=`<div class="secondary-actions"><button class="btn text-button" id="retry">Retry question</button><span class="retry-note">Retries do not change your first-attempt score.</span></div><button class="btn" id="next">${S.session.i===S.session.ids.length-1?'View summary':'Next question'}</button>`;
 $('#next').onclick=next;$('#retry').onclick=()=>renderQuestion();updateQuestionHeader();
 const text=revealed?'Answer revealed. No first-attempt marks awarded.':`${result.score===result.max?'Correct':result.score?'Partly correct':'Not yet correct'}. ${result.score} of ${result.max} marks.`;
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
 app().innerHTML=`<div class="card summary-page"><h1>${revisit?'Completed session':'Session summary'}</h1>${perfect?`<section class="perfect-celebration" aria-label="Perfect session"><span class="perfect-trophy-static" aria-hidden="true">${trophySVG()}</span><h2>${U.esc(pickMessage('perfect'))}</h2><p>Every question fully correct on its first attempt.</p></section>`:''}<p class="summary-score">${a.earned} / ${a.maximum}<span>first-submission marks · ${Math.round(a.accuracy*100)}% accuracy</span></p><p class="session-budget">${s.ids.length} questions · ${sessionMarks(s)} marks planned${s.timedOut?' · time finished':''}</p><div class="summary-outcomes"><span>${a.correct} correct</span><span>${a.partial} partly correct</span><span>${a.submitted-a.correct-a.partial} incorrect</span><span>${s.ids.filter(id=>s.attempts[id]?.revealed).length} revealed</span><span>${s.ids.filter(id=>!s.attempts[id]).length} not attempted</span></div><p class="muted">Retries and reveals do not increase first-attempt accuracy.</p>${s.mode==='challenge'&&pb?`<details><summary>Personal best</summary><p>${Math.round(pb.accuracy*100)}% accuracy · ${pb.earned}/${pb.maximum} marks for these exact settings.</p><p>Topics, types, difficulty, duration and question-bank/scoring versions must match.</p></details>`:''}<h2>Review your answers</h2><div class="summary-reviews">${s.ids.map((id,i)=>{const q=S.bank.questions.find(q=>q.id===id),attempt=s.attempts[id];return `<details><summary><span>Question ${i+1} · ${U.esc(q.title)}</span><span>${attempt?.result?attempt.result.score+'/'+attempt.result.max:attempt?.revealed?'Revealed':'Not attempted'}</span></summary>${attempt?.result?U.feedback(S.bank,q,attempt.result,attempt.response):!attempt?`<p>Not attempted.</p><button class="btn secondary" data-summary-reveal="${id}">Reveal answer · no first-attempt score</button>`:`<p>No scored first submission.</p>${q.interaction==='arrows'?U.image(S.bank,q.mechanism.completedAsset,'Completed step'):q.type==='multistep'?q.steps.map(step=>U.accepted(S.bank,step)).join(''):U.accepted(S.bank,q)}<p>${U.esc(q.feedback)}</p>`}</details>`}).join('')}</div><div class="action-dock"><button class="btn" id="choose">Choose topics</button>${S.suspended?'<button class="btn secondary" id="resume-practice">Resume practice</button>':''}</div><p id="summary-status" class="sr-only" role="status">${perfect?'Perfect session. ':''}${a.earned} of ${a.maximum} first-submission marks.</p></div>`;
 $('#choose').onclick=home;if($('#resume-practice'))$('#resume-practice').onclick=resumePractice;
 document.querySelectorAll('[data-summary-reveal]').forEach(el=>el.onclick=()=>{const id=el.dataset.summaryReveal;S.progress.records[id]=C.progressEvent(S.progress.records[id],'reveal');s.attempts[id]={response:{},result:null,first:false,revealed:true};const old=S.progress.sessions.findIndex(x=>x.id===s.id);if(old>=0)S.progress.sessions[old]=C.clone(s);save();summary(s,revisit)});
 U.focusHeading();document.querySelector('.summary-page h1')?.scrollIntoView({block:'start',behavior:'auto'});resizeActions();if(perfect&&!revisit&&!celebratedSessions.has(s.id)){celebratedSessions.add(s.id);celebrateSession({sound:true})}
}

function setNavigation(view){
 clearEffects();clearSessionControls();if(view==='topics')view='practice';S.view=view;document.body.dataset.screen=view;document.body.dataset.view=view;
 document.querySelectorAll('[data-nav]').forEach(el=>{const challenge=S.session?.mode==='challenge'&&!S.session.finished;el.disabled=challenge&&el.dataset.nav!=='practice';el.title=el.disabled?'Finish the challenge before opening this section':'';const active=el.dataset.nav===view;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
}

function questionHeader(){
 const s=S.session,progress=Math.min(s.ids.length,s.i+(S.marked?1:0)),challenge=s.mode==='challenge';return `<div class="question-topline"><p>Question ${s.i+1} of ${s.ids.length}</p>${challenge?'<strong id="time" role="timer" aria-live="off"></strong>':''}<span class="question-value">${current().maxMark} mark${current().maxMark===1?'':'s'}</span></div><div class="session-progress" role="progressbar" aria-label="Questions submitted" aria-valuemin="0" aria-valuemax="${s.ids.length}" aria-valuenow="${progress}" aria-valuetext="${progress} of ${s.ids.length} questions submitted"><i style="width:${100*progress/s.ids.length}%"></i></div>`;
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
const pickMessage=ChemExperience.messagePicker(),pickEffect=ChemExperience.effectPicker(),celebratedSessions=new Set();
let effectTimer=null,effectAnimations=[],actionObserver=null,partyAudio=null,effectRun=0;

function sessionMenu(q){
 const challenge=S.session.mode==='challenge';return `<details class="session-menu"><summary>Session menu</summary><div class="session-menu-panel"><p class="menu-score">${challenge?'Feedback at the end':`Score so far: ${sessionStats(S.session).earned} / ${sessionMarks(S.session)} marks`}</p>${challenge?'':`<button class="btn text-button" id="change-topics" data-session-action="topics">Change topics</button><button class="btn text-button" data-session-nav="mistakes" data-session-action="mistakes">Mistakes</button><button class="btn text-button" data-session-nav="progress" data-session-action="progress">Progress</button>`}<button class="btn text-button" id="exit" data-session-action="finish">Finish session</button><label class="topic"><input type="checkbox" id="question-effects" ${celebrationEffects?'checked':''}><span>Celebration effects</span></label>${celebrationSoundControl('question-sound')}${reportQuestionControls(q)}</div></details>`;
}
function challengeFeedback(){
 $('#task').hidden=true;$('.action-row').innerHTML=`<button class="btn" id="next">${S.session.i===S.session.ids.length-1?'View summary':'Next question'}</button>`;$('#fb').innerHTML='<p class="submission-saved">Submission saved. Feedback appears at the end of the challenge.</p>';$('#next').onclick=next;$('#answer-status').textContent='Submission saved. Feedback at the end.';updateQuestionHeader();resizeActions();
}
function trophySVG(){return '<svg viewBox="0 0 120 140" aria-hidden="true" focusable="false"><path d="M27 20H10v19c0 19 12 31 31 34M93 20h17v19c0 19-12 31-31 34" fill="none" stroke="#a77917" stroke-width="9"/><path d="M25 10h70v35c0 29-15 44-35 44S25 74 25 45Z" fill="#e3b649" stroke="#a77917" stroke-width="3"/><path d="M33 17h12v31c0 13 3 23 10 30-14-7-22-18-22-34Z" fill="#fff0ac"/><path d="M54 88h12v24H54Z" fill="#b6861c"/><path d="M42 109h36l9 16H33Z" fill="#d9ab38" stroke="#a77917" stroke-width="3"/><rect x="25" y="125" width="70" height="10" rx="3" fill="#14563e"/><text x="60" y="61" fill="#172d3a" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="35">1</text></svg>'}
function thumbSVG(){return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M37 43 52 18c4-7 13-4 13 4v18h14c8 0 11 6 9 13L78 80c-1 4-5 6-9 6H39Z" fill="#e3b649" stroke="#14563e" stroke-width="4" stroke-linejoin="round"/><rect x="15" y="43" width="23" height="45" rx="5" fill="#14563e"/><path d="M60 48h16M59 59h15M56 70h15" stroke="#a77917" stroke-width="3" stroke-linecap="round"/></svg>'}
function blowerSVG(){return '<svg viewBox="0 0 180 90" aria-hidden="true" focusable="false"><path d="M12 57 72 33v40Z" fill="#14563e" stroke="#172d3a" stroke-width="3"/><path d="m35 48 12 18M51 41l14 29" stroke="#e3b649" stroke-width="7"/><path class="blower-paper" d="M74 53h71c24 0 25-36 5-36-12 0-17 13-7 17" fill="none" stroke="#d9ab38" stroke-width="12" stroke-linecap="round"/><path d="M8 54h16v9H8Z" fill="#172d3a"/></svg>'}
function celebrationSoundControl(id){return `<label class="topic"><input type="checkbox" id="${id}" ${celebrationSound?'checked':''}><span>Party-blower sound<span class="topic-code">Perfect sessions only · off by default.</span></span></label>`}
function bindCelebrationSound(id){const control=document.getElementById(id);if(control)control.onchange=e=>{celebrationSound=e.target.checked;storage.set('ocrOrgCelebrationSoundV1',celebrationSound);if(!celebrationSound)stopPartySound()}}
function stopPartySound(){if(partyAudio){partyAudio.pause();try{partyAudio.currentTime=0}catch{}}}
function playPartySound(){
 if(!celebrationEffects||!celebrationSound||document.hidden)return;
 if(!partyAudio){partyAudio=new Audio(window.CHEM_PARTY_SOUND||'assets/audio/party-blowers.wav?v=20261013-v1.3');partyAudio.preload='auto';partyAudio.volume=.45}
 const run=effectRun;try{partyAudio.currentTime=0;const playing=partyAudio.play();playing?.then(()=>{if(run!==effectRun||!celebrationSound||!celebrationEffects||document.hidden)stopPartySound()}).catch(()=>{})}catch{}
}
function clearEffects(){effectRun++;clearTimeout(effectTimer);effectTimer=null;effectAnimations.forEach(a=>a.cancel());effectAnimations=[];document.querySelectorAll('.confetti-layer,.shooting-star-layer,.celebration-layer').forEach(el=>el.remove());stopPartySound()}
function reducedMotion(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false}
function showEncouragement(q,result,category,animate){
 const host=$('#encouragement');if(!host)return;
 const tip=U.feedbackTip(S.bank,q,result),variant=['tick','highlight','sparkle'][Math.floor(Math.random()*3)],symbol=category==='partial'?'½':category==='incorrect'?'↗':'✓';
 host.innerHTML=`<aside class="encouragement ${category} effect-${variant}"><button class="encouragement-dismiss" aria-label="Dismiss encouragement" type="button">×</button><span class="celebration-symbol" aria-hidden="true">${symbol}</span><div><h2>${U.esc(pickMessage(category))}</h2><p>${U.esc(tip)}</p></div></aside>`;
 host.querySelector('button').onclick=()=>{host.replaceChildren();$('#next')?.focus({preventScroll:true})};
 if(animate&&celebrationEffects&&!reducedMotion())host.querySelector('aside').classList.add('encouragement-enter');
}
function effectViewport(classes){
 const layer=document.createElement('div');layer.className='celebration-layer '+classes;layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const vv=window.visualViewport,width=vv?.width||innerWidth,height=vv?.height||innerHeight;
 Object.assign(layer.style,{top:(vv?.offsetTop||0)+'px',left:(vv?.offsetLeft||0)+'px',width:width+'px',height:height+'px'});
 return {layer,width,height};
}
function animateEffect(element,keyframes,options,cssClass){
 if(element.animate){try{const animation=element.animate(keyframes,options);effectAnimations.push(animation);return animation}catch{}}
 if(cssClass)element.classList.add(cssClass);return null;
}
function addConfetti(layer,height,duration){
 const colors=['#14563e','#b6861c','#759b8a','#172d3a'];
 for(let i=0;i<56;i++){
  const bit=document.createElement('span');bit.className='confetti-piece';bit.style.left=(Math.random()*100)+'%';bit.style.background=colors[i%colors.length];layer.append(bit);
  const drift=(Math.random()-.5)*160,distance=height+100,delay=Math.random()*180;
  bit.style.setProperty('--confetti-drift',drift+'px');bit.style.setProperty('--confetti-distance',distance+'px');bit.style.setProperty('--confetti-duration',duration+'ms');bit.style.setProperty('--confetti-delay',delay+'ms');
  animateEffect(bit,[{transform:'translateY(-18px) rotate(0deg)',opacity:1},{transform:`translate(${drift*.8}px,${distance*.8}px) rotate(520deg)`,opacity:1,offset:.7},{transform:`translate(${drift}px,${distance}px) rotate(650deg)`,opacity:0}],{duration,delay,easing:'ease-in',fill:'both'},'confetti-css');
 }
}
function questionConfetti(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();const {layer,height}=effectViewport('confetti-layer question-confetti');addConfetti(layer,height,2900);effectTimer=setTimeout(clearEffects,3200);
}
function thumbsUp(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();const {layer}=effectViewport('question-success-effect thumbs-up-layer');
 const symbol=document.createElement('div');symbol.className='question-effect-symbol thumbs-up';symbol.innerHTML=thumbSVG();layer.append(symbol);
 // Two finite back-and-forth cycles: upright → 180 degrees → upright.
 animateEffect(symbol,[{transform:'rotate(0deg)'},{transform:'rotate(180deg)',offset:.5},{transform:'rotate(0deg)'}],{duration:1450,iterations:2,easing:'ease-in-out',fill:'both'},'thumbs-up-css');
 animateEffect(layer,[{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.75},{opacity:0}],{duration:3300,fill:'both'},'question-effect-fade');effectTimer=setTimeout(clearEffects,3400);
}
function growingStar(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();const {layer,width,height}=effectViewport('question-success-effect growing-star-layer');
 const symbol=document.createElement('div');symbol.className='growing-star';symbol.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="m50 4 14 29 32 5-23 23 5 32-28-15-28 15 5-32L4 38l32-5Z" fill="#e3b649" fill-opacity=".14" stroke="#b6861c" stroke-opacity=".65" stroke-width="1.5"/></svg>';layer.append(symbol);
 const scale=Math.ceil(Math.hypot(width,height)/28);symbol.style.setProperty('--star-expand',scale);
 animateEffect(symbol,[{transform:'scale(.35)',opacity:0},{transform:'scale(1)',opacity:1,offset:.15},{transform:`scale(${scale})`,opacity:0}],{duration:3200,easing:'ease-in',fill:'both'},'growing-star-css');effectTimer=setTimeout(clearEffects,3300);
}
function celebrateQuestion(result){
 if(!celebrationEffects)return;const type=ChemExperience.questionCelebration(result,S.session.mode,{submitted:true,revealed:false});if(!type)return;
 const effect=type==='confetti'?'confetti':pickEffect();if(reducedMotion())return;
 if(effect==='confetti')questionConfetti();else if(effect==='thumbs-up')thumbsUp();else if(effect==='growing-star')growingStar();else shootingStar();
}
function celebrateSession({sound=false}={}){
 if(!celebrationEffects)return;clearEffects();
 if(!reducedMotion()){
  const {layer,height}=effectViewport('confetti-layer perfect-session-effects');addConfetti(layer,height,3900);
  const trophy=document.createElement('div');trophy.className='session-trophy';trophy.innerHTML=trophySVG();layer.append(trophy);
  for(const side of ['left','right']){const blower=document.createElement('div');blower.className='party-blower '+side;blower.innerHTML=blowerSVG();layer.append(blower);const paper=blower.querySelector('.blower-paper');animateEffect(paper,[{transform:'scaleX(.15)'},{transform:'scaleX(1)',offset:.35},{transform:'scaleX(1)',offset:.65},{transform:'scaleX(.15)'}],{duration:1400,iterations:2,easing:'ease-in-out',fill:'both'},'blower-unroll-css')}
  animateEffect(layer,[{opacity:0},{opacity:1,offset:.08},{opacity:1,offset:.52},{opacity:0}],{duration:4200,easing:'ease-out',fill:'both'},'perfect-effect-fade');
 }
 if(sound)playPartySound();if(!reducedMotion()||(sound&&celebrationSound))effectTimer=setTimeout(clearEffects,4400);
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
 document.body.insertAdjacentHTML('beforeend',`<nav class="mobile-session-controls" aria-label="Session controls"><button type="button" class="session-control" id="mobile-change-topics" data-session-action="topics" ${challenge?'disabled aria-describedby="mobile-challenge-help"':''}>Change Topics</button><button type="button" class="session-control" id="mobile-mistakes" data-session-action="mistakes" ${challenge?'disabled aria-describedby="mobile-challenge-help"':''}>Mistakes</button><button type="button" class="session-control finish-control" id="mobile-finish-session" data-session-action="finish">Finish Session</button>${challenge?'<p id="mobile-challenge-help">Topics and mistakes unlock when the challenge ends.</p>':''}</nav>`);
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
function shootingStar(){
 if(!celebrationEffects||reducedMotion())return;clearEffects();
 const {layer,width,height}=effectViewport('shooting-star-layer'),star=document.createElement('div');star.className='shooting-star';star.innerHTML='<span class="shooting-star-trail"></span><span class="shooting-star-head">★</span>';layer.append(star);
 const from=`translate(-90px,${Math.round(height*.18)}px) rotate(15deg)`,to=`translate(${width+90}px,${Math.round(height*.42)}px) rotate(15deg)`;
 star.style.setProperty('--star-from',from);star.style.setProperty('--star-to',to);
 animateEffect(star,[{transform:from,opacity:0},{transform:`translate(0px,${Math.round(height*.21)}px) rotate(15deg)`,opacity:1,offset:.12},{transform:`translate(${Math.round(width*.9)}px,${Math.round(height*.4)}px) rotate(15deg)`,opacity:1,offset:.86},{transform:to,opacity:0}],{duration:3000,easing:'ease-in-out',fill:'both'},'shooting-star-css');effectTimer=setTimeout(clearEffects,3100);
}

initialiseNavigation();
const bottomNav=document.querySelector('.side-nav');
if(bottomNav){const reserve=()=>document.documentElement.style.setProperty('--mobile-nav-space',(bottomNav.offsetHeight+18)+'px');reserve();if(window.ResizeObserver)new ResizeObserver(reserve).observe(bottomNav);window.addEventListener('resize',reserve)}

window.addEventListener('visibilitychange',tick);window.addEventListener('focus',tick);
U.load().then(b=>{S.bank=b;const check=C.validate(b);if(check.errors.length)throw Error('Invalid question bank: '+check.errors.join('; '));const p=storage.get('ocrOrgPrefsV2',{});S.topics=(p.topics||[]).filter(id=>b.topics.some(t=>t.id===id));for(const key of ['types','difficulty','statuses'])if(Array.isArray(p[key])&&key!=='statuses')S[key]=p[key];const saved=storage.get('ocrOrgProgressV2',null);S.progress=C.restoreProgress(saved,b);const active=storage.get('ocrOrgActiveV2',null);const oldPractice=active?.mode==='practice'&&active.practicePolicy!=='practice-20-v1';if(active&&!oldPractice&&active.config.includes(b.meta.bankVersion)&&JSON.parse(active.config).scoringVersion===b.meta.scoringVersion&&active.ids.every(id=>b.questions.some(q=>q.id===id&&q.enabled!==false))){S.session=active;S.response=active.response||{};const ui=active.ui||{};S.orders=ui.orders||{};S.activeStep=ui.activeStep||0;S.marked=!!ui.marked;S.result=ui.result||null;S.source=ui.source||null;delete S.session.response;delete S.session.ui;if(ui.view&&ui.view!=='practice'&&active.mode!=='challenge'){if(ui.view==='mistakes')showMistakeOverview();else if(ui.view==='progress')showProgress();else home()}else if(active.mode==='challenge'&&C.remaining(active.end)===0)finish();else resumePractice()}else{home();if(oldPractice){const notice=document.createElement('p');notice.className='notice';notice.textContent='Random practice now uses sessions of about 20 marks. Start a new session below; your first-attempt progress has been kept.';app().prepend(notice)}if(S.progress.reset){const notice=document.createElement('p');notice.className='notice';notice.textContent='The question bank or scoring rules have changed. Incompatible old progress has been cleared safely.';app().prepend(notice)}}const preview=new URLSearchParams(location.search).get('preview');if(preview&&!active){const q=b.questions.find(q=>q.id===preview&&(q.enabled!==false||window.CHEM_PREVIEW_ID));if(q){S.topics=q.prerequisites;start('preview',[q])}}save()}).catch(e=>{app().innerHTML=`<div class="card"><h1>Question bank could not load</h1><p>${U.esc(e.message)}</p><p>Use the hosted GitHub Pages site. A double-clicked local file cannot fetch its question bank. See README.md. </p></div>`});
