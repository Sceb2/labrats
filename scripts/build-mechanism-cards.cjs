'use strict';
// Original diagram-choice adaptations. Mark groups use the existing component scorer.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const pack = read('content-drafts/ocr-mechanism-markpoints.json');
const bank = read('questions.json'), assets = read('assets.json');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ink = '#17212b', green = '#14563e';
const text = (x,y,value,size=28,extra='') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" ${extra}>${esc(value)}</text>`;
const line = (x1,y1,x2,y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${ink}" stroke-width="2.5"/>`;
const arrow = d => `<path d="${d}" fill="none" stroke="${green}" stroke-width="3" marker-end="url(#head)"/>`;
const pair = (x,y) => `<circle cx="${x}" cy="${y}" r="2.4"/><circle cx="${x+8}" cy="${y}" r="2.4"/>`;
const double = (x1,y,x2) => line(x1,y-5,x2,y-5)+line(x1,y+5,x2,y+5);
const tripleV = (x,y1,y2) => line(x-5,y1,x-5,y2)+line(x,y1,x,y2)+line(x+5,y1,x+5,y2);
const note = value => text(300,325,value,16);
const ring = (circle=true) => `<path d="M190 170 L230 100 L310 100 L350 170 L310 240 L230 240 Z" fill="none" stroke="${ink}" stroke-width="2.5"/>`+(circle?'<circle cx="270" cy="170" r="52" fill="none" stroke="#17212b" stroke-width="2.5"/>':'');
function carbonyl(dipole=0,cn=false) {
  return text(300,168,'C')+text(430,168,'O')+double(322,159,405)+text(300,70,'H')+line(300,82,300,138)+text(210,225,'H')+line(226,213,283,172)
    +(dipole?text(326,126,dipole===1?'δ+':'δ−',20)+text(452,126,dipole===1?'δ−':'δ+',20):'')
    +(cn?text(115,168,'C')+text(115,260,'N')+tripleV(115,182,233)+text(91,152,'−',23)+pair(111,132)+pair(111,282):'');
}
function alkene(kind='hbr') {
  if(kind==='br2')return text(200,155,'CH₂')+text(390,155,'CH₂')+double(235,145,352);
  return text(220,155,'CH₂')+text(350,155,'C')+double(255,145,330)+line(368,134,432,88)+text(460,87,'CH₃')+line(368,160,432,205)+text(460,220,'CH₃');
}
function halogen(kind='hbr',dipole=0) {
  const a=kind==='hbr'?'H':'Br',left=200,right=390;
  return text(left,280,a)+line(left+25,270,right-27,270)+text(right,280,'Br')+(dipole?text(left,235,dipole===1?'δ+':'δ−',20)+text(right+10,235,dipole===1?'δ−':'δ+',20):'');
}
function hbrIon(variant) {
  if(variant===1)return text(170,165,'(CH₃)₂CH')+line(242,155,360,155)+text(400,165,'CH₂')+text(432,132,'+',22)+text(400,295,'Br')+text(426,270,'−',22)+pair(395,260)+arrow('M399 260 Q335 210 394 180');
  return text(300,160,'C')+text(325,127,variant===2?'δ+':'+',21)+text(130,160,'CH₃')+line(169,150,280,150)+line(317,138,402,87)+text(440,86,'CH₃')+line(317,163,404,226)+text(440,242,'CH₃')+text(300,310,'Br')+text(326,285,'−',22)+pair(296,274)+arrow(variant===3?'M287 167 Q230 222 296 272':'M300 274 Q230 222 287 169');
}
function brIon(variant) {
  return text(180,168,variant===1?'CH₃':'BrCH₂')+line(235,158,358,158)+text(400,168,'CH₂')+text(436,135,variant===2?'δ+':'+',21)+text(400,303,'Br')+text(425,277,'−',22)+pair(395,267)+arrow(variant===3?'M392 180 Q330 220 398 267':'M399 267 Q330 220 391 181');
}
function aromaticIntermediate(variant=0) {
  const arc=variant===3?'M296 125 A52 52 0 1 0 296 215':'M244 125 A52 52 0 1 1 244 215';
  return ring(variant===1)+line(190,170,113,109)+text(100,108,'H')+line(190,170,116,230)+text(100,250,'Cl')+(variant!==1?`<path d="${arc}" fill="none" stroke="${ink}" stroke-width="2.5"/>`:'')+(variant!==2?text(270,180,'+',26):'');
}
// Every product choice explicitly shows every atom and bond, including C-H/O-H.
function displayedProduct(family,variant,label) {
  const atoms=[],bonds=[];
  const atom=(element,x,y,charge=0)=>{atoms.push({element,x,y,charge});return atoms.length-1;};
  const bond=(a,b,order=1)=>bonds.push({a,b,order});
  const attach=(parent,element,x,y,order=1,charge=0)=>{const id=atom(element,x,y,charge);bond(parent,id,order);return id;};
  const methyl=(x,y,hydrogens)=>{const c=atom('C',x,y);for(const [hx,hy]of hydrogens)attach(c,'H',hx,hy);return c;};
  if(family==='HCN') {
    if(variant<2){
      const c=atom('C',270,175),o=attach(c,'O',160,175);attach(o,'H',85,175);attach(c,'H',270,75);attach(c,'H',270,275);
      const next=attach(c,variant===0?'C':'N',390,175,1,variant===0?0:1);
      attach(next,variant===0?'N':'C',510,175,3,variant===0?0:-1);
    }else if(variant===2){
      const c=atom('C',210,175);attach(c,'H',90,175);attach(c,'O',210,65,2);const next=attach(c,'C',350,175);attach(next,'N',490,175,3);
    }else{
      const c=methyl(240,175,[[100,175],[240,75],[240,275]]),next=attach(c,'C',370,175);attach(next,'N',500,175,3);
    }
  }else if(family==='HBR') {
    const centre=atom('C',300,175);
    const left=methyl(160,175,variant===3?[[160,85],[160,265]]:[[60,175],[160,85],[160,265]]);
    bond(centre,left,variant===3?2:1);
    const upper=methyl(300,75,[[230,75],[370,75],[300,25]]);bond(centre,upper);
    if(variant===1){
      attach(centre,'H',300,275);const right=attach(centre,'C',440,175);attach(right,'H',440,85);attach(right,'H',440,265);attach(right,'Br',540,175);
    }else{
      const lower=methyl(300,275,[[230,275],[370,275],[300,325]]);bond(centre,lower);
      if(variant===0)attach(centre,'Br',460,175);
      if(variant===2){const o=attach(centre,'O',450,175);attach(o,'H',530,175);}
    }
  }else if(family==='BR2') {
    const left=atom('C',230,175),right=attach(left,'C',370,175);
    attach(left,'H',230,85);attach(left,'H',230,265);attach(right,'H',370,85);
    attach(right,'Br',510,175);attach(right,variant===2?'Br':'H',370,275);
    if(variant===3){const o=attach(left,'O',120,175);attach(o,'H',45,175);}
    else attach(left,variant===0?'Br':'H',90,175);
  }else throw Error('Unknown displayed-product family');
  for(const [i,a]of atoms.entries()){
    const valence=bonds.filter(b=>b.a===i||b.b===i).reduce((sum,b)=>sum+b.order,0);
    const expected=a.element==='C'&&a.charge===-1?3:a.element==='N'&&a.charge===1?4:{C:4,N:3,O:2,H:1,Br:1}[a.element];
    assert.equal(valence,expected,`${family} product ${variant}: ${a.element} valence`);
  }
  const drawnBonds=bonds.map(b=>{
    const a=atoms[b.a],z=atoms[b.b],dx=z.x-a.x,dy=z.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
    return (b.order===1?[0]:b.order===2?[-4,4]:[-5,0,5]).map(offset=>line(a.x+14*ux-offset*uy,a.y+14*uy+offset*ux,z.x-14*ux-offset*uy,z.y-14*uy+offset*ux)).join('');
  }).join('');
  const body=drawnBonds+atoms.map(a=>text(a.x,a.y+9,a.element,26)+(a.charge?text(a.x+19,a.y-13,a.charge>0?'+':'−',19):'')).join('');
  return {body,description:'Displayed product (all atoms and bonds shown): '+label+'.',displayedFormula:{atoms,bonds}};
}
const definitions = {
  HCN: {
    context: {body:carbonyl(0,true),description:'Methanal H₂C=O and a separate cyanide ion, carbon and nitrogen shown explicitly; no arrows or carbonyl dipole are supplied.'},
    groups: [
      {label:'Choose the cyanide attack arrow', accepted:[0], options:[
        {body:carbonyl(0,true)+arrow('M115 132 C151 56 242 57 290 154'),description:'Arrow from the cyanide carbon lone pair to the carbonyl carbon.'},
        {body:carbonyl(0,true)+arrow('M115 282 C210 330 395 270 304 177'),description:'Arrow from the cyanide nitrogen lone pair to the carbonyl carbon.'},
        {body:carbonyl(0,true)+arrow('M290 154 C242 57 151 56 115 132'),description:'Arrow from the carbonyl carbon towards the cyanide carbon lone pair.'},
        {body:carbonyl(0,true)+arrow('M115 132 C115 -20 418 -20 418 153'),description:'Arrow from the cyanide carbon lone pair to the carbonyl oxygen.'}
      ]},
      {label:'Choose the carbonyl dipole AND bond-opening arrow',accepted:[0],options:[0,1,2,3].map(v=>({body:carbonyl(v===2?2:v===3?0:1)+arrow(v===1?'M430 136 Q380 65 360 154':'M360 154 Q397 70 426 138'),description:[
        'Carbonyl Cδ+ and Oδ−; arrow from the C=O bond to oxygen.',
        'Carbonyl Cδ+ and Oδ−; arrow from oxygen towards the C=O bond.',
        'Carbonyl Cδ− and Oδ+; arrow from the C=O bond to oxygen.',
        'No carbonyl dipole; arrow from the C=O bond to oxygen.'
      ][v]}))},
      {label:'Choose the intermediate AND protonation arrow (either proton source is allowed)',accepted:[0,1],options:[0,1,2,3].map(v=>({
        body:text(300,158,'C')+text(430,158,'O')+text(451,129,v===2?'+':'−',22)+line(322,149,407,149)+text(220,158,'H')+line(236,149,281,149)+text(300,70,'H')+line(300,82,300,130)+text(300,237,'C')+text(300,309,'N')+line(300,168,300,209)+tripleV(300,249,283)+pair(429,181)
          +(v===1?text(522,158,'H')+line(537,149,551,149)+text(570,158,'O')+line(570,169,570,210)+text(570,237,'H')+arrow('M545 148 Q555 88 568 132'):text(532,158,'H⁺'))
          +arrow(v===3?'M302 285 Q455 290 522 171':'M433 181 Q484 235 524 173'),
        description:[
          'Alkoxide −O–CH₂–C≡N with formal O−; arrow from its oxygen lone pair to H+.',
          'Alkoxide −O–CH₂–C≡N with formal O−; arrow from oxygen to H of water, with water O–H bond electrons returning to water oxygen.',
          'Intermediate has O+; arrow from its oxygen lone pair to H+.',
          'Alkoxide −O–CH₂–C≡N; arrow from the nitrile nitrogen end towards H+.'
        ][v]
      }))},
      {label:'Choose the organic product',accepted:[0],options:['HO–CH₂–C≡N','HO–CH₂–N⁺≡C⁻','H–C(=O)–C≡N','CH₃–C≡N'].map((value,i)=>displayedProduct('HCN',i,value))},
      {label:'Name the mechanism',accepted:[0],textOptions:['Nucleophilic addition','Nucleophilic substitution','Electrophilic addition','Electrophilic substitution']}
    ]
  },
  HBR: {
    context:{body:alkene()+halogen(),description:'2-Methylpropene CH₂=C(CH₃)₂ and separate hydrogen bromide H–Br; no dipole or arrows supplied.'},
    groups:[
      {label:'Choose the alkene-to-electrophile arrow',accepted:[0],options:[0,1,2,3].map(v=>({body:alkene()+halogen()+arrow([
        'M285 140 Q238 210 200 249','M200 248 Q238 210 285 140','M285 140 Q390 180 389 248','M350 148 Q320 245 213 263'
      ][v]),description:[
        'Arrow from the C=C bond to H of H–Br.', 'Arrow from H of H–Br to the C=C bond.', 'Arrow from the C=C bond to Br of H–Br.', 'Arrow starting on the substituted carbon atom, rather than the C=C pair, and ending at H.'
      ][v]}))},
      {label:'Choose the H–Br dipole AND bond-breaking arrow',accepted:[0],options:[0,1,2,3].map(v=>({body:halogen('hbr',v===1?2:v===3?0:1)+arrow(v===2?'M390 248 Q340 190 298 268':'M300 269 Q350 185 386 248'),description:[
        'Hδ+–Brδ−; arrow from the H–Br bond to Br.', 'Hδ−–Brδ+; arrow from the H–Br bond to Br.', 'Hδ+–Brδ−; arrow from Br towards the H–Br bond.', 'H–Br without a dipole; arrow from the bond to Br.'
      ][v]}))},
      {label:'Choose the major-route carbocation AND bromide attack arrow',accepted:[0],options:[0,1,2,3].map(v=>({body:hbrIon(v),description:[
        'Tertiary (CH₃)₃C+ with a formal positive charge; arrow from Br− lone pair to the charged carbon.', 'Primary (CH₃)₂CH–CH₂+; arrow from Br− lone pair to the charged carbon.', 'Tertiary carbon marked δ+ instead of formal +; arrow from Br− to that carbon.', 'Tertiary (CH₃)₃C+; arrow goes from the charged carbon towards Br−.'
      ][v]}))},
      {label:'Choose the major organic product',accepted:[0],options:['(CH₃)₃C–Br','(CH₃)₂CH–CH₂Br','(CH₃)₃C–OH','CH₂=C(CH₃)₂'].map((value,i)=>displayedProduct('HBR',i,value))}
    ]
  },
  BR2:{
    context:{body:alkene('br2')+halogen('br2'),description:'Ethene and separate bromine Br–Br; no induced dipole or arrows are supplied.'},
    groups:[
      {label:'Choose the induced dipole AND BOTH first-stage arrows',accepted:[0],options:[0,1,2,3].map(v=>({body:alkene('br2')+halogen('br2',v===1?0:1)+(v!==2?arrow('M295 140 Q252 218 200 249'):'')+(v!==3?arrow('M300 270 Q350 190 386 248'):''),description:[
        'Brδ+–Brδ−; arrow from C=C to Brδ+ and arrow from Br–Br bond to Brδ−.', 'Both first-stage arrows are present, but Br–Br has no dipole.', 'Brδ+–Brδ− and the Br–Br breaking arrow only; no C=C attack arrow.', 'Brδ+–Brδ− and the C=C-to-Brδ+ arrow only; no Br–Br breaking arrow.'
      ][v]}))},
      {label:'Choose the open-chain intermediate AND bromide attack arrow',accepted:[0],options:[0,1,2,3].map(v=>({body:brIon(v),description:[
        'BrCH₂–CH₂+ with a formal charge and arrow from Br− lone pair to the charged carbon.', 'CH₃–CH₂+ with no bonded bromine; arrow from Br− to the charged carbon.', 'BrCH₂–CH₂δ+ using partial rather than formal charge; arrow from Br− to that carbon.', 'BrCH₂–CH₂+; arrow goes from the charged carbon towards Br−.'
      ][v]}))},
      {label:'Choose the organic product',accepted:[0],options:['BrCH₂–CH₂Br','CH₃–CH₂Br','CH₃–CHBr₂','HO–CH₂–CH₂Br'].map((value,i)=>displayedProduct('BR2',i,value))}
    ]
  },
  EAS:{
    context:{body:ring()+text(460,145,'Cl₂')+text(460,210,'AlCl₃',24)+note('Halogen carrier'),description:'Benzene with its aromatic circle, chlorine Cl₂, and aluminium chloride AlCl₃ catalyst. No arrows or intermediate are shown.'},
    groups:[
      {label:'Choose a complete pair: electrophile generation AND catalyst regeneration',accepted:[0,1],options:[
        {body:text(300,130,'Cl₂ + AlCl₃ → Cl⁺ + AlCl₄⁻',26)+text(300,210,'H⁺ + AlCl₄⁻ → AlCl₃ + HCl',26),description:'Equation pair: Cl₂ + AlCl₃ → Cl+ + AlCl₄−; H+ + AlCl₄− → AlCl₃ + HCl.'},
        {body:text(300,130,'Cl₂ + FeCl₃ → Cl⁺ + FeCl₄⁻',26)+text(300,210,'H⁺ + FeCl₄⁻ → FeCl₃ + HCl',26),description:'Equation pair: Cl₂ + FeCl₃ → Cl+ + FeCl₄−; H+ + FeCl₄− → FeCl₃ + HCl.'},
        {body:text(300,130,'Cl₂ + AlCl₃ → Cl⁻ + AlCl₄⁺',26)+text(300,210,'H⁺ + AlCl₄⁻ → AlCl₃ + HCl',26),description:'Equation pair uses Cl− and AlCl₄+ in electrophile generation; its second equation uses H+ and AlCl₄− to regenerate AlCl₃.'},
        {body:text(300,130,'Cl₂ + AlCl₃ → Cl⁺ + AlCl₄⁻',26)+text(300,210,'AlCl₃ is consumed; no regeneration',23),description:'Electrophile generation equation followed by the claim that AlCl₃ is consumed without regeneration.'}
      ]},
      {label:'Choose the arrow for electrophilic attack',accepted:[0],options:[0,1,2,3].map(v=>({body:ring()+text(470,175,v===3?'Cl⁻':'Cl⁺')+(v===2?line(132,170,190,170)+text(110,179,'H'):'')+arrow([
        'M322 170 Q388 85 454 153','M454 153 Q388 85 322 170','M150 170 Q300 25 454 153','M322 170 Q388 85 454 153'
      ][v]),description:[
        'Arrow from the benzene π-circle to Cl+.', 'Arrow from Cl+ to the benzene π-circle.', 'Arrow from an explicit benzene C–H bond to Cl+.', 'Arrow from the benzene π-circle to Cl−.'
      ][v]}))},
      {label:'Choose the aromatic intermediate (partial-circle convention)',accepted:[0],options:[0,1,2,3].map(v=>({body:aromaticIntermediate(v),description:[
        'H and Cl on the same ring carbon; inner partial circle covers more than half the ring with its gap towards that carbon; + inside the hexagon.', 'H and Cl on the same ring carbon; a complete aromatic circle and + remain inside the hexagon.', 'H and Cl on the same ring carbon and a partial circle with the gap towards that carbon, but no positive charge.', 'H and Cl on the same ring carbon; partial-circle gap faces the opposite side of the ring; + inside.'
      ][v]}))},
      {label:'Choose the electron movement that restores aromaticity',accepted:[0],options:[0,1,2,3].map(v=>({body:aromaticIntermediate()+arrow([
        'M148 137 Q190 85 243 146','M101 108 Q170 60 243 146','M150 203 Q200 260 246 196','M243 146 Q190 85 148 137'
      ][v]),description:[
        'Aromatic intermediate with its partial π-system and formal + charge; arrow from the C–H bond at the Cl-bearing carbon into the ring.', 'Aromatic intermediate with its partial π-system and formal + charge; arrow starts at H itself and goes into the ring.', 'Aromatic intermediate with its partial π-system and formal + charge; arrow starts at the C–Cl bond and goes into the ring.', 'Aromatic intermediate with its partial π-system and formal + charge; arrow goes from the ring towards the C–H bond.'
      ][v]}))}
    ]
  }
};
const outputs = new Map();
function register(id, drawing, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 350" role="img" aria-labelledby="title"><title id="title">${esc(drawing.description)}</title><defs><marker id="head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="${green}"/></marker></defs><rect width="600" height="350" rx="12" fill="#fff"/><g font-family="Arial,Helvetica,sans-serif" fill="${ink}">${drawing.body}</g></svg>\n`;
  const filename = `assets/mechanism-markpoints/${id}.svg`;
  assets[id] = {path:filename,description:drawing.description,status:'teacher-review-required',review:'Original diagram; source-group mapping checked, teacher chemistry review pending.'};
  if(drawing.displayedFormula)assets[id].displayedFormula=drawing.displayedFormula;
  outputs.set(filename,svg);
  if(label) bank.vocabulary[id]={id,label,chemicalId:id,category:'mechanism-feature',aliases:[],asset:id};
  return id;
}
const existing = bank.questions.filter(q => q.markPointPractice?.pack !== pack.id);
let next = 25;
const additions = [], map = [];
for(const family of pack.families) {
  const def=definitions[family.id], source=pack.sources.find(s=>s.id===family.sourceId);
  assert.equal(def.groups.length,family.groups.length);
  const context=register(`mp-${family.id.toLowerCase()}-context`,def.context);
  const parts=def.groups.map((group,i)=>{
    const authored=family.groups[i], id=authored.id.toLowerCase();
    const options=(group.options||group.textOptions).map((option,j)=>{
      const oid=`mp-${family.id.toLowerCase()}-${id}-${j+1}`;
      if(group.options)return register(oid,option,option.description);
      const equivalent=Object.values(bank.vocabulary).find(value=>value.label.toLowerCase()===option.toLowerCase());
      if(equivalent)return equivalent.id;
      bank.vocabulary[oid]={id:oid,label:option,chemicalId:oid,category:'mechanism-feature',aliases:[]};
      return oid;
    });
    return {component:{id,label:group.label,options,essential:true,marks:1,...(group.options?{choiceLabel:'Diagram'}:{})},answers:group.accepted.map(j=>options[j]),authored};
  });
  function create(selected,mode) {
    const id='MC'+String(next++).padStart(2,'0');
    assert(!existing.some(q=>q.id===id),`Question ID collision: ${id}`);
    const all=mode==='combined';
    const prompts={
      HCN:'Methanal reacts with HCN in the presence of CN−. Select the mechanism features, product and mechanism name.',
      HBR:'2-Methylpropene reacts with HBr. Select the mechanism features and major product.',
      BR2:'Ethene reacts with Br₂. Use the open-chain carbocation representation and select the mechanism features and product.',
      EAS:'Benzene reacts with Cl₂ using a halogen carrier. Select the two catalyst equations and mechanism features. Either a consistent AlCl₃ or FeCl₃ pair is allowed.'
    };
    const focused={
      HCN:['Select the arrow showing cyanide attack on methanal.','Select the carbonyl dipole and bond-opening arrow for methanal. Both features are needed.','Select the intermediate and its protonation after cyanide adds to methanal. Either H⁺ or water is allowed.','Select the organic product when methanal reacts with HCN.','Name the mechanism when HCN reacts with methanal in the presence of CN−.'],
      HBR:['Select the first electron-pair arrow when 2-methylpropene reacts with HBr.','Select the H–Br dipole and bond-breaking arrow. Both features are needed.','Select the major-route carbocation and bromide attack after HBr reacts with 2-methylpropene.','Select the major product from electrophilic addition of HBr to 2-methylpropene.'],
      BR2:['Select the induced Br–Br dipole and BOTH first-stage arrows for bromine addition to ethene. All features together earn one mark.','Select the open-chain carbocation and bromide attack in addition of Br₂ to ethene.','Select the product when ethene reacts with Br₂.'],
      EAS:['Select BOTH catalyst equations for benzene chlorination. Use a consistent AlCl₃ or FeCl₃ pair. The pair earns one mark.','Select the electron-pair arrow when benzene attacks Cl⁺.','Select the aromatic intermediate using the partial-circle convention.','Select the electron-pair movement that restores aromaticity after benzene attacks Cl⁺.']
    };
    const answers=Object.fromEntries(selected.map(part=>[part.component.id,part.answers]));
    const misconceptions=Object.fromEntries(selected.flatMap(part=>part.component.options.map(option=>[option,part.authored.feedback+' Check: '+part.authored.requirements.join(' ')])));
    const q={id,type:'mechanism-completion',title:family.title+(all?' — mechanism features':' — '+selected[0].authored.label.toLowerCase()),
      prompt:all?prompts[family.id]:focused[family.id][family.groups.indexOf(selected[0].authored)],
      assessmentNotice:'Recognition practice · Choose one option for each part. All features within a part are needed for its single mark. Parts are marked independently.',
      difficulty:all?'Standard application':'Foundation recall',
      prerequisites:['basic',family.topic],specRefs:['4.1.1(b)',...family.specRefs],assetRefs:[context,...selected.flatMap(p=>p.component.options.filter(option=>bank.vocabulary[option].asset))],structure:context,
      interaction:'scaffold',components:selected.map(part=>part.component),validMethods:[{id:'recognition',answers}],maxMark:selected.length,
      feedback:selected.map(part=>part.authored.feedback).join(' ')+' Recognition practice: each complete feature group earns one mark. This is not freehand mechanism drawing or examiner error-carried-forward marking.',
      misconceptions,source:{...existing[0].source},status:'teacher-review-required',enabled:true,requirement:'mechanism-recognition',
      reviewNotes:'Original diagram-selection adaptation of the reviewed source mark groups; teacher chemistry review is pending. No freehand drawing, directional stereochemistry or examiner ECF is scored.',
      ambiguity:{issue:'Recognition options scaffold the mechanism and cannot reproduce examiner ECF or freehand production.',resolution:'Each group is scored independently against its displayed choices. The bromine questions specify an open-chain route; the bromonium alternative is not labelled chemically wrong. Either H+ or water protonation and consistent Al/Fe catalyst pairs are accepted where offered.',teacherJudgementNeeded:true},
      markPointPractice:{pack:pack.id,family:family.id,sourceId:family.sourceId,sourceQuestion:source.question,sourceSchemePrintedPages:source.schemePrintedPages,sourceSchemePdfPages:source.schemePdfPages,mode,groups:selected.map(p=>p.authored.id),assessment:'structured-recognition'}};
    additions.push(q);return id;
  }
  const combined=create(parts,'combined');
  for(const part of parts)map.push({sourceId:family.sourceId,group:part.authored.id,combined,focused:create([part],'focused')});
}
bank.questions=[...existing,...additions];
const previous=bank.meta.bankVersion;
bank.meta.version='7.0';bank.meta.bankVersion='v7-236-questions-2026-10-24';
bank.meta.compatibleBankVersions=[...new Set([...bank.meta.compatibleBankVersions,'v6-216-questions-2026-10-15'])];
assert(['v6-216-questions-2026-10-15',bank.meta.bankVersion].includes(previous),'Unexpected base bank version');
bank.meta.reviewNotice='236 questions are enabled on the prototype branch, including 20 mechanism recognition cards awaiting teacher chemistry review. Publication requires separate review.';
assert.equal(additions.length,20);assert.equal(map.length,16);assert.equal(existing.length,216);
outputs.set('questions.json',JSON.stringify(bank,null,2)+'\n');
outputs.set('assets.json',JSON.stringify(assets,null,2)+'\n');
outputs.set('content-drafts/mechanism-card-map.json',JSON.stringify({pack:pack.id,bankVersion:bank.meta.bankVersion,questions:additions.map(q=>q.id),coverage:map},null,2)+'\n');
const checkBank={...bank,assets};
assert.deepEqual(require('../core.js').validate(checkBank).errors,[]);
for(const [filename,contents]of outputs){
  const target=path.join(root,filename);
  if(process.argv.includes('--check'))assert.equal(fs.readFileSync(target,'utf8'),contents,filename+' is stale');
  else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,contents);}
}
console.log(`Validated ${additions.length} auto-scored cards, ${map.length} marking groups and ${outputs.size-3} original diagrams.`);
