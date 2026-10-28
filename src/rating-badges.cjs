'use strict';
const descriptions={
 N:{label:'New',text:'No unaided scored attempt yet. Try this question to start building a revision rating.'},
 A:{label:'Strong recall',text:'You have recalled this well across several days. It usually needs less frequent practice.'},
 B:{label:'Good recall',text:'You usually answer this well. Revisit it periodically to keep it secure.'},
 C:{label:'Developing recall',text:'Your answers are mixed, or there is not enough practice across different days yet. Keep practising.'},
 D:{label:'Needs practice',text:'Recent unaided marks are low, or earlier recall needs refreshing. Practise this soon.'},
 E:{label:'Priority practice',text:'Very little recent unaided recall is secure. Revisit the explanation and practise this more often.'}
};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function badgeHTML(grade,description){
 const info=description||descriptions[grade]||descriptions.N;
 return `<button type="button" class="rating-badge" data-grade="${esc(grade)}" data-rating-tip="${esc(info.text)}" aria-label="Revision rating ${esc(grade)}: ${esc(info.label)}" aria-expanded="false">${esc(grade)}</button>`;
}
function installRatingTips(){
 if(document.getElementById('revision-rating-tooltip'))return;
 const tip=document.createElement('div');tip.id='revision-rating-tooltip';tip.role='tooltip';tip.hidden=true;tip.className='rating-tooltip';document.body.append(tip);
 let active=null,pinned=false;
 function hide(){if(active){active.removeAttribute('aria-describedby');active.setAttribute('aria-expanded','false');}active=null;pinned=false;tip.hidden=true;}
 function show(button,pin=false){
  if(active!==button)hide();active=button;pinned=pin;tip.textContent=button.dataset.ratingTip;tip.hidden=false;
  button.setAttribute('aria-describedby',tip.id);button.setAttribute('aria-expanded','true');
  const box=button.getBoundingClientRect(),width=tip.offsetWidth,height=tip.offsetHeight;
  tip.style.left=Math.max(8,Math.min(innerWidth-width-8,box.left+box.width/2-width/2))+'px';
  tip.style.top=(box.bottom+height+12<innerHeight?box.bottom+8:Math.max(8,box.top-height-8))+'px';
 }
 document.addEventListener('pointerover',e=>{const button=e.target.closest?.('[data-rating-tip]');if(button&&!pinned)show(button);});
 document.addEventListener('pointerout',e=>{if(active&&!pinned&&!active.contains(e.relatedTarget)&&document.activeElement!==active)hide();});
 document.addEventListener('focusin',e=>{const button=e.target.closest?.('[data-rating-tip]');if(button)show(button);});
 document.addEventListener('focusout',e=>{if(e.target===active&&!pinned)hide();});
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-rating-tip]');if(button){const close=active===button&&pinned;hide();if(!close)show(button,true);}else if(!tip.contains(e.target))hide();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
}
module.exports={descriptions,badgeHTML,installRatingTips};
