/* Shared presentation for both subjects. Does not calculate or persist marks. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.RevisionFeedback=api})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function header({score,max,revealed=false,retry=false,self=false,status}={}){
  const title=revealed?'Answer revealed':`${score} of ${max}${self?' self-assessed marks'+(retry?' on retry':''):retry?' on retry':' marks'}`;
  const description=status??(revealed?'Not scored':self?'You awarded this score using the marking points.':score===max?'All marking points earned.':score>0?'Review the marking points to fix.':'Check the marking points below.');
  return `<header class="feedback-heading" data-feedback-state="${revealed?'revealed':self?'self-assessed':score===max?'correct':score>0?'partial':'incorrect'}"><h2 tabindex="-1">${esc(title)}</h2><p>${esc(description)}</p></header>`;
 }
 function point({title,score,max,body='',kind=score===max?'right':'wrong',optional=false}){
  const label=optional?'Optional · no mark required':`${score} / ${max}`;
  return `<section class="feedback-point mark-row ${esc(kind)}"><div class="point-heading"><h3><span aria-hidden="true">${optional?'–':kind==='right'||kind==='method'?'✓':'×'}</span> ${esc(title)}</h3><span class="point-marks">${esc(label)}</span></div><div class="point-body">${body}</div></section>`;
 }
 function attemptNote({retry=false,assisted=false,first,revealed=false}={}){
  if(revealed)return '<p class="feedback-attempt-note">This is not an unaided attempt and does not improve your revision rating.</p>';
  if(!retry&&!assisted)return '';
  const prior=first&&Number.isFinite(first.score)&&Number.isFinite(first.max)?`First attempt: ${first.score} of ${first.max} marks. `:'';
  const explanation=assisted?'An answer or hint was viewed. This attempt does not improve your unaided revision rating.':'Retries do not increase your unaided revision rating.';
  return `<p class="feedback-attempt-note">${esc(prior+explanation)}</p>`;
 }
 function foldQuestion(root,anchor,selectors){
  if(!root||!anchor||root.querySelector(':scope > .feedback-question'))return;
  const nodes=selectors.map(selector=>root.querySelector(':scope > '+selector)).filter(Boolean);
  if(!nodes.length)return;
  const disclosure=document.createElement('details');disclosure.className='feedback-question';
  const summary=document.createElement('summary');summary.textContent='View question and your answers';disclosure.append(summary);
  root.insertBefore(disclosure,anchor);nodes.forEach(node=>disclosure.append(node));
 }
 return {header,point,attemptNote,foldQuestion};
});
