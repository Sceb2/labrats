'use strict';
// Pure flashcard import, identity and session rules. No browser or database state.
const Adaptive=require('./adaptive.cjs');
const MAX_BYTES=1048576,MAX_CARDS=1000;
const ratingDescriptions={
 N:{label:'New',text:'No self-assessed recall yet. Try this card to start building a revision rating.'},
 A:{label:'Strong recall',text:'You have reported successful recall across several days. This card usually needs less frequent practice.'},
 B:{label:'Good recall',text:'You usually report recalling this card. Revisit it periodically.'},
 C:{label:'Developing recall',text:'Recall is mixed, or you have not practised across enough days yet. Keep practising.'},
 D:{label:'Needs practice',text:'Your reported recall is weak or needs refreshing. Practise this card soon.'},
 E:{label:'Priority practice',text:'Your first self-assessments show difficulty recalling this card. Revisit it more often.'}
};
function parseCSV(text,topics){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Use a CSV file no larger than 1 MB.');
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false,afterQuote=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=ch;continue;}
    if(afterQuote&&![',','\r','\n'].includes(ch))throw Error('Unexpected text after a closing quote.');
    if(ch==='"'){if(cell||afterQuote)throw Error('A quote inside a field must be doubled and the field quoted.');quoted=true;}
    else if(ch===','||ch==='\r'||ch==='\n'){
      row.push(cell);cell='';afterQuote=false;
      if(ch!==','){if(ch==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}
    }else cell+=ch;
  }
  if(quoted)throw Error('A quoted field is missing its closing quote.');
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  if(!rows.length||rows[0].join(',')!=='card_id,topic,front,back')throw Error('Use the columns card_id,topic,front,back in that order.');
  const allowed=new Set(topics.map(t=>t.id)),seen=new Set(),errors=[],cards=[];
  for(const [index,values]of rows.slice(1).entries()){
    const number=index+2;
    if(values.length!==4){errors.push(`Row ${number}: expected four fields.`);continue;}
    const [id,topic,front,back]=values.map(v=>v.replace(/\r\n?/g,'\n').trim());
    if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id))errors.push(`Row ${number}: invalid card_id (letters, numbers, hyphens and underscores; up to 80 characters).`);
    if(seen.has(id))errors.push(`Row ${number}: duplicate card_id ${id}.`);seen.add(id);
    if(!allowed.has(topic))errors.push(`Row ${number}: unknown topic ${topic}.`);
    if(!front||!back||front.length>2000||back.length>4000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(front+back))errors.push(`Row ${number}: provide a front (up to 2,000 characters) and back (up to 4,000), without control characters.`);
    cards.push({id,topic,front,back});
  }
  if(!cards.length||cards.length>MAX_CARDS)errors.push(`Provide 1–${MAX_CARDS} cards.`);
  if(new Set(cards.map(c=>c.topic)).size>1)errors.push('A pack must contain cards for exactly one topic.');
  return {cards,errors};
}
function identity(card){return card.pack_id+'/'+card.card_id+'@'+card.content_version;}
function learningBank(subject,cards){return {meta:{subjectId:subject,bankVersion:'flashcards-1',scoringVersion:'flashcards-1'},questions:cards.map(c=>({id:identity(c),maxMark:1,title:c.front,prerequisites:[c.topic_id],type:'flashcard',enabled:true}))};}
function createSession(cards,ratings,mode='twenty',random=Math.random){
  if(!['twenty','open'].includes(mode))throw Error('Choose a 20-card session or Open Mode.');
  const unique=[...new Map(cards.map(c=>[identity(c),c])).values()];
  const ordered=Adaptive.weightedOrder(unique.map(c=>({...c,id:identity(c)})),ratings,random).map(({id,...c})=>c);
  const selected=mode==='twenty'?ordered.slice(0,20):ordered;
  return {mode,planned:selected.length,queue:selected.map(card=>({card,retry:false,ready:0})),completed:0,initials:0,gotIt:0,retries:0,revealed:false,current:null};
}
function next(session){
  const due=session.queue.findIndex(e=>e.retry&&e.ready<=session.completed);
  const ready=due>=0?due:session.queue.findIndex(e=>!e.retry);
  // Tiny pools cannot supply three intervening cards; use the longest possible gap.
  const index=ready<0?0:ready;
  session.current=session.queue.length?session.queue.splice(index,1)[0]:null;session.revealed=false;
  return session.current;
}
function assess(session,gotIt){
  if(!session.current||!session.revealed||typeof gotIt!=='boolean')throw Error('Reveal the back before assessing this card.');
  const item=session.current;session.completed++;
  if(item.retry)session.retries++;else{session.initials++;if(gotIt)session.gotIt++;}
  if(!gotIt&&!item.retry)session.queue.push({card:item.card,retry:true,ready:session.completed+3});
  session.current=null;return item;
}
module.exports={parseCSV,identity,learningBank,createSession,next,assess,ratingDescriptions,MAX_BYTES,MAX_CARDS};
