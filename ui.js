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
 accepted(bank,unit){return unit.validMethods.map(m=>`<div class="method"><strong>${U.esc(m.id)}</strong><ul>${unit.components.map(c=>`<li>${U.esc(c.label)} ${c.essential?'('+c.marks+' mark)':'(optional; 0 marks)'}: ${(m.answers[c.id]||[]).map(id=>bank.vocabulary[id]?.asset?U.image(bank,bank.vocabulary[id].asset,'Accepted product'):U.esc(U.label(bank,id))).join(' OR ')||'not required'}</li>`).join('')}</ul></div>`).join('')},
 feedback(bank,q,result,response){
 let html=`<h2>${result.score===result.max?'Correct':result.score>0?'Partly correct':'Not yet correct'} — ${result.score}/${result.max}</h2>`;
 const components=(unit,r,resp)=>`<ul class="marking">${r.details.map(d=>`<li><strong>${U.esc(d.label)}:</strong> ${!d.essential?'Optional — no mark required':d.ok?'Correct':'Incorrect / not selected'} (${d.score}/${d.max})${!d.ok&&d.essential&&d.selected?`<p>${U.esc(q.misconceptions[d.selected]||bank.vocabulary[d.selected]?.misconception||'Check this component against a complete accepted method.')}</p>`:''}</li>`).join('')}</ul><details open><summary>Accepted complete methods</summary>${U.accepted(bank,unit)}</details>`;
 if(q.type==='multistep')html+=result.steps.map((r,i)=>`<section><h3>${U.esc(r.label)} — ${r.score}/${r.max}</h3>${components(q.steps[i],r,response[q.steps[i].id])}<p>${U.esc(q.steps[i].feedback)}</p></section>`).join('');
 else if(q.interaction==='arrows'){html+=`<ul>${result.details.map(d=>`<li>${U.esc(d.label)}: ${d.ok?'Correct':'Missing / incorrect'} (${d.score}/${d.max})</li>`).join('')}</ul>`;if(result.extras.length)html+=`<p>${result.extras.length} extra or incorrect arrow(s): ${result.extras.length} mark(s) deducted, minimum 0. A full set plus an incorrect arrow is not fully correct.</p>`;html+=`<ul>${result.diagnoses.map(d=>`<li>${U.esc(q.mechanism.anchors.find(a=>a.id===d.from)?.label||d.from)} → ${U.esc(q.mechanism.anchors.find(a=>a.id===d.to)?.label||d.to)}: ${U.esc(d.message)}</li>`).join('')}</ul>${U.image(bank,q.mechanism.completedAsset,'Completed displayed step')}`;}
 else html+=components(q,result,response);
 html+=`<p>${U.esc(q.feedback)}</p>`;if(q.completedAsset)html+=U.image(bank,q.completedAsset,'Corrected completed step');return html;
 },
 questionIntro(bank,q){if(q.display)return `<div class="transformation">${U.image(bank,q.display.start,'Starting compound')}<span aria-label="reacts to give">→</span>${U.image(bank,q.display.end,'Target product')}</div>`;if(q.structure)return U.image(bank,q.structure,'Displayed structure');if(q.interaction==='scaffold')return U.image(bank,q.assetRefs[0],'Structure relevant to the displayed step');return ''},
 async load(){const [b,a]=await Promise.all([fetch('questions.json').then(r=>{if(!r.ok)throw Error('bank');return r.json()}),fetch('assets.json').then(r=>{if(!r.ok)throw Error('assets');return r.json()})]);b.assets=a;return b},
 focusHeading(){const h=document.querySelector('main h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true})}},
 download(name,value){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
};
