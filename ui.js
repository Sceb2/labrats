/* Shared display helpers; labels never determine correctness. */
'use strict';
const U={
 typeLabel(id){return {'reagents':'Reagents and conditions','multistep':'Synthesis routes','mechanism-id':'Identify a mechanism','mechanism-completion':'Complete a mechanism','sites':'Chemical sites','nomenclature':'Name a structure','product':'Predict a product','error':'Correct a mechanism error'}[id]||id},
 reviewLabel(status){return {'draft':'Draft','teacher-review-required':'Teacher review pending','teacher-approved':'Teacher approved'}[status]||status},
 arrowPath(x,y,X,Y){return Math.abs(X-x)<60&&Math.abs(Y-y)>=40?`M${x} ${y} Q${Math.max(x,X)+80} ${(y+Y)/2} ${X} ${Y}`:`M${x} ${y} Q${(x+X)/2} ${Math.min(y,Y)-85} ${X} ${Y}`},
 esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},
 label(bank,id){return bank.vocabulary[id]?.label||id},
 assetPath(bank,id){return window.CHEM_OFFLINE_ASSETS?.[id]||bank.assets[id]?.path},
 assetLink(bank,id){const data=window.CHEM_OFFLINE_ASSETS?.[id];if(!data)return bank.assets[id]?.path;window.CHEM_OFFLINE_LINKS??={};return window.CHEM_OFFLINE_LINKS[id]??=URL.createObjectURL(new Blob([Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0))],{type:'image/svg+xml'}))},
 image(bank,id,caption=''){const a=bank.assets[id];if(!a)return '<p>Missing diagram: '+U.esc(id)+'</p>';return `<figure class="chem"><img src="${U.esc(U.assetPath(bank,id))}" alt="${U.esc(a.description)}">${caption?`<figcaption>${U.esc(caption)}</figcaption>`:''}</figure>`},
 accepted(bank,unit){return unit.validMethods.map((m,i)=>`<section class="accepted-method">${unit.validMethods.length>1?`<h3>Accepted method ${i+1}</h3>`:''}<dl>${unit.components.map(c=>`<div><dt>${U.esc(c.label)}${c.essential?'':' · optional'}</dt><dd>${(m.answers[c.id]||[]).map(id=>U.answerValue(bank,id)).join(' <span class="answer-or">or</span> ')||'Not required'}</dd></div>`).join('')}</dl></section>`).join('')},
 modelAnswer(bank,q){
  let body='<section class="answer-review model-answer" aria-label="Model answer"><header class="feedback-heading"><h2>Model answer</h2><p>Not scored</p></header><p class="reveal-notice">Viewing this answer does not award first-attempt marks.</p>';
  if(q.type==='multistep')body+=q.steps.map((step,i)=>`<section class="step-review"><h3>Step ${i+1}</h3>${U.accepted(bank,step)}<p>${U.esc(step.feedback)}</p></section>`).join('');
  else if(q.interaction==='arrows')body+=U.image(bank,q.mechanism.completedAsset,'Completed displayed step')+`<dl class="model-arrows">${q.mechanism.requiredArrows.map(a=>`<div><dt>${U.esc(a.label)}</dt><dd>Start: ${a.sources.map(id=>U.esc(q.mechanism.anchors.find(x=>x.id===id).label)).join(' or ')} → End: ${a.destinations.map(id=>U.esc(q.mechanism.anchors.find(x=>x.id===id).label)).join(' or ')}</dd></div>`).join('')}</dl>`;
  else body+=U.accepted(bank,q);
  body+=`<p class="feedback-explanation">${U.esc(q.feedback)}</p>`;
  if(q.completedAsset)body+=U.image(bank,q.completedAsset,'Completed step');
  return body+'</section>';
 },
 answerValue(bank,id){const v=bank.vocabulary[id];return v?.asset?U.image(bank,v.asset,v.label):U.esc(U.label(bank,id))},
 componentReview(bank,unit,result,response={}){
  return `<div class="component-review">${result.details.map(d=>`<div class="mark-row ${!d.essential?'optional':d.ok?'right':'wrong'}"><span class="mark-symbol" aria-hidden="true">${!d.essential?'–':d.ok?'✓':'×'}</span><div><h3>${U.esc(d.label)}</h3>${!d.essential?'<p>Optional · no mark required</p>':d.ok?`<div>${U.answerValue(bank,d.selected)} <span class="mark-label">Correct · ${d.score}/${d.max}</span></div>`:`<div class="your-answer">Your answer: ${d.selected?U.answerValue(bank,d.selected):'Not selected'}</div><div class="correction"><strong>Use:</strong> ${d.expected.map(id=>U.answerValue(bank,id)).join(' <span class="answer-or">or</span> ')} <span class="mark-label">${d.score}/${d.max}</span></div>`}</div></div>`).join('')}</div>`;
 },
 feedbackTip(bank,q,result){
  if(q.interaction==='arrows'){const diagnosis=result.diagnoses.find(d=>d.direction!=='correct');return diagnosis?.message||q.feedback}
  const first=result.steps?result.steps.find(r=>r.score<r.max):result;
  const wrong=first?.details?.find(d=>d.essential&&!d.ok);
  if(wrong){const expected=wrong.expected.map(id=>U.label(bank,id)).join(' or ');return `${result.steps?first.label+'. ':''}${wrong.label}: ${expected}.`}
  return q.feedback;
 },
 feedback(bank,q,result,response={}){
  const correct=result.score===result.max,title=correct?'Correct':result.score?'Partly correct':'Not yet correct';
  let body=`<section class="answer-review" aria-label="Answer review"><header class="feedback-heading"><h2>${title}</h2><p>${result.score} / ${result.max} marks</p></header>`;
  if(q.type==='multistep'){
   const steps=result.steps.map((r,i)=>({r,step:q.steps[i],response:response[q.steps[i].id]||{},index:i}));
   const failed=steps.filter(({r})=>r.score<r.max),successful=steps.filter(({r})=>r.score===r.max);
   body+=failed.map(({r,step,response,index})=>`<section class="step-review"><h3>Step ${index+1} · ${r.score}/${r.max} marks</h3>${U.componentReview(bank,step,r,response)}<p>${U.esc(step.feedback)}</p></section>`).join('');
   if(successful.length)body+=`<p class="steps-correct">✓ ${successful.map(({index})=>'Step '+(index+1)).join(', ')} ${successful.length===1?'is':'are'} fully correct.</p>`;
   body+=`<p class="feedback-explanation">${U.esc(q.feedback)}</p><details class="marking-detail"><summary>All accepted answers by step</summary>${steps.map(({step,index})=>`<section><h3>Step ${index+1}</h3>${U.accepted(bank,step)}</section>`).join('')}</details>`;
   if(successful.length)body+=`<details class="marking-detail"><summary>View correct steps</summary>${successful.map(({step,r,response,index})=>`<section><h3>Step ${index+1}</h3>${U.componentReview(bank,step,r,response)}<p>${U.esc(step.feedback)}</p></section>`).join('')}</details>`;
  }else if(q.interaction==='arrows'){
   if(!correct)body+=`<div class="arrow-marking">${result.details.map(d=>`<p><span aria-hidden="true">${d.ok?'✓':'×'}</span> <strong>${U.esc(d.label)}</strong> · ${d.ok?'Correct':'Missing / incorrect'} · ${d.score}/${d.max}${d.ok?'':`<span class="arrow-correction">Start: ${d.expected.sources.map(id=>U.esc(q.mechanism.anchors.find(a=>a.id===id).label)).join(' or ')} → End: ${d.expected.destinations.map(id=>U.esc(q.mechanism.anchors.find(a=>a.id===id).label)).join(' or ')}</span>`}</p>`).join('')}</div>`;
   if(result.extras.length)body+=`<p class="deduction"><strong>${result.extras.length} extra or incorrect arrow${result.extras.length===1?'':'s'}: ${result.extras.length} mark${result.extras.length===1?'':'s'} deducted, minimum 0.</strong></p>`;
   body+=result.diagnoses.filter(d=>d.direction!=='correct').map(d=>`<p class="arrow-diagnosis">${U.esc(q.mechanism.anchors.find(a=>a.id===d.from)?.label||d.from)} → ${U.esc(q.mechanism.anchors.find(a=>a.id===d.to)?.label||d.to)}: ${U.esc(d.message)}</p>`).join('');
   body+=`<p class="feedback-explanation">${U.esc(q.feedback)}</p>${U.image(bank,q.mechanism.completedAsset,'Completed displayed step')}<details class="marking-detail"><summary>View marking detail</summary>${result.details.map(d=>`<p>${U.esc(d.label)}: ${d.ok?'Correct':'Missing / incorrect'} · ${d.score}/${d.max}</p>`).join('')}</details>`;
  }else{
   if(!correct)body+=U.componentReview(bank,q,result,response);
   const specific=result.details.filter(d=>d.essential&&!d.ok&&d.selected).map(d=>q.misconceptions[d.selected]||bank.vocabulary[d.selected]?.misconception).filter(s=>s&&!/^Check (the|this)|^Consider the|^Compare the/.test(s));
   body+=`<p class="feedback-explanation">${U.esc(q.feedback)}</p>`;
   const additional=[...new Set(specific)].filter(s=>s!==q.feedback);if(additional.length)body+=`<details class="marking-detail"><summary>Why my answer was wrong</summary>${additional.map(s=>`<p>${U.esc(s)}</p>`).join('')}</details>`;
   if(correct)body+=`<details class="marking-detail"><summary>View marking detail</summary>${U.componentReview(bank,q,result,response)}</details>`;
   body+=`<details class="marking-detail"><summary>All accepted answers</summary>${U.accepted(bank,q)}</details>`;
  }
  if(q.completedAsset)body+=U.image(bank,q.completedAsset,'Corrected completed step');
  return body+'</section>';
 },
 questionIntro(bank,q){if(q.display)return `<div class="transformation">${U.image(bank,q.display.start,'Starting compound')}<span aria-label="reacts to give">→</span>${U.image(bank,q.display.end,'Target product')}</div>`;if(q.structure)return U.image(bank,q.structure,'Displayed structure');if(q.interaction==='scaffold')return U.image(bank,q.assetRefs[0],'Structure relevant to the displayed step');return ''},
 async load(){const [b,a]=await Promise.all([fetch('questions.json').then(r=>{if(!r.ok)throw Error('bank');return r.json()}),fetch('assets.json').then(r=>{if(!r.ok)throw Error('assets');return r.json()})]);b.assets=a;return b},
 focusHeading(){const h=document.querySelector('main h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}},
 download(name,value){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
};
