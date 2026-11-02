const frac=(a,b)=>`<span class="fraction"><span>${a}</span><span>${b}</span></span>`;
const rows=[
['Wave speed','v = fλ'],
['Speed of a transverse wave on a spring','<math><mi>v</mi><mo>=</mo><msqrt><mfrac><mi>T</mi><mi>μ</mi></mfrac></msqrt></math>'],
['Refractive index',`n = ${frac('c','v')} = ${frac('sin i','sin r')}`],
['Critical angle',`sin C = ${frac('1','n')}`],
['Inverse square law in relation to the intensity of the wave',`I = ${frac('k','r²')}`],
['Distance travelled = average speed × time',''],
['Acceleration = change in velocity ÷ time',`a = ${frac('(v − u)','t')}`],
['Force = mass × acceleration','F = m × a'],
['Weight = mass × gravitational field strength','W = m × g<br><span class="constant">g = 9.81 N/kg</span>'],
['Momentum = mass × velocity','p = m × v'],
['Force as rate of change of momentum',`F = ${frac('(mv − mu)','t')}`],
['Force due to friction','F = μN'],
['Kinematic equations of motion',`s = ${frac('(u + v)t','2')}<br>v = u + at<br>s = ut + ½at²<br>v² = u² + 2as`],
['Power = work done ÷ time taken',''],
['Power = energy transferred ÷ time taken',`P = ${frac('E','t')}`],
['Potential difference = current × resistance','V = I × R'],
['Electrical power = current × potential difference','P = I × V'],
['Energy','E = V × I × t'],
['Specific heat capacity','ΔQ = mcΔT'],
['Specific latent heat','ΔQ = mL']
];

// Source: Pearson BTEC AAQ Applied Science Unit 3 Physics SAM, Issue 3,
// May 2026, page 20. Keep the complete reference in examination order.
export function equationSheetButton(){
 return '<button type="button" class="btn eq-open" aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M8 7h8M8 11h8M8 15h3m3 0h2m-8 3h8"/></svg>Equation sheet</button>';
}
let dialog,previousOverflow='',opener;
export function bindEquationSheet(trigger){
 if(!trigger)return;
 if(!dialog){
  dialog=document.createElement('dialog');
  dialog.className='eq-dialog';
  dialog.setAttribute('aria-labelledby','eq-title');
  dialog.innerHTML=`<header class="eq-head"><h2 id="eq-title">Equation sheet</h2><button type="button" class="eq-close" aria-label="Close equation sheet">Close <span aria-hidden="true">×</span></button></header><div class="eq-scroll" tabindex="0" aria-label="Full equation sheet">${rows.map(([label,formula])=>`<div class="eq-row"><div class="eq-label">${label}</div>${formula?`<div class="eq-formula">${formula}</div>`:''}</div>`).join('')}<p class="eq-source">Equations reproduced from Pearson BTEC AAQ Applied Science, Unit 3 Physics sample assessment material, Issue 3, May 2026, p.20. © Pearson Education Limited 2026.</p></div>`;
  document.body.append(dialog);
  dialog.querySelector('.eq-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{
   if(event.target!==dialog)return;
   const r=dialog.getBoundingClientRect();
   if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();
  });
  dialog.addEventListener('close',()=>{
   document.body.style.overflow=previousOverflow;
   if(opener?.isConnected)opener.focus({preventScroll:true});
  });
 }
 trigger.onclick=()=>{
  previousOverflow=document.body.style.overflow;
  opener=trigger;
  document.body.style.overflow='hidden';
  dialog.showModal();
  dialog.querySelector('.eq-scroll').scrollTop=0;
  dialog.querySelector('.eq-close').focus({preventScroll:true});
 };
}
