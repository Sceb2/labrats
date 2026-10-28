'use strict';
const F=require('./flashcards.cjs'),A=require('./adaptive.cjs'),Badges=require('./rating-badges.cjs'),topics=require('../flashcards/topics.json'),sample=require('../flashcards/sample-pack.json');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function checked(r){if(r.error)throw Error(r.error.code==='42501'?'Your staff session cannot perform this action.':r.error.message);return r.data;}
async function paged(client,table,filter){const rows=[];for(let n=0;;n+=500){const data=checked(await filter(client.from(table).select(table==='flashcard_packs'?'id,subject_id,topic_id,title,status,revision,updated_at':'*')).order(table==='flashcard_attempts'?'event_id':table==='flashcard_cards'?'question_id':'id').range(n,n+499));rows.push(...data);if(data.length<500)return rows;}}
function csvText(cards,topic){const quote=s=>'"'+String(s).replace(/"/g,'""')+'"';return 'card_id,topic,front,back\n'+cards.map(c=>[c.id||c.card_id,c.topic||topic,c.front,c.back].map(quote).join(',')).join('\n');}
async function mount({connection,profile,subject,container}){
 const host=document.createElement('section');host.className='staff-card flashcard-pack-editor';container.append(host);
 const $=s=>host.querySelector(s);let packs=[],selected=null,preview=null,busy=false;
 function status(message){if(host.isConnected)$('#pack-status').textContent=message;}
 async function work(fn){if(busy)return;busy=true;host.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message+(/fetch|network|abort|timeout/i.test(e.message)?' The save may have completed. Use Refresh before retrying a save or publication.':''));}finally{busy=false;if(host.isConnected)host.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function markup(){
  host.innerHTML=`<h2>Flashcard packs</h2><p>One published pack per topic. Published cards stay available while you prepare a draft.</p><p id="pack-status" role="status"></p><label class="control">Pack<select id="pack-picker"><option value="">New pack</option>${packs.map(p=>`<option value="${p.id}">${esc(p.title)} · ${esc(p.status)}</option>`).join('')}</select></label><div class="pack-controls"><label class="control">Title<input id="pack-title" maxlength="120" required></label><label class="control">Topic<select id="pack-topic">${topics[subject].map(t=>`<option value="${esc(t.id)}">${esc(t.label)} (${esc(t.id)})</option>`).join('')}</select></label></div><label class="control">CSV file<input id="pack-file" type="file" accept=".csv,text/csv"></label><p>Columns: card_id,topic,front,back. Use stable IDs for reimports. All cards in a pack must have the same topic.</p><label class="control">CSV content<textarea id="pack-csv" spellcheck="false"></textarea></label><label class="control">Changes to existing cards<select id="pack-change"><option value="new_version">New learning requirement — start a new rating for changed cards</option><option value="minor">Minor correction — retain existing ratings</option></select></label><p class="small-note">Reimports replace the draft's card list. Omitted cards leave practice after publication, retaining their history.</p><div class="row"><button class="btn secondary" id="preview-pack">Preview import</button><button class="btn text-button" id="pack-template">Download CSV template</button>${subject==='chemistry'?'<button class="btn text-button" id="sample-pack">Use Organic names sample</button>':''}</div><div id="pack-preview"></div><div class="row"><button class="btn" id="save-pack" hidden>Save private draft</button><button class="btn" id="publish-pack" hidden>Publish pack</button><button class="btn secondary" id="archive-pack" hidden>Archive pack</button></div>`;
  $('#pack-picker').onchange=()=>void work(()=>select($('#pack-picker').value));
  $('#pack-file').onchange=()=>void work(async()=>{const file=$('#pack-file').files[0];if(!file)return;if(file.size>F.MAX_BYTES)throw Error('Use a CSV no larger than 1 MB.');$('#pack-csv').value=await file.text();invalidate();status('File loaded. Preview it before saving.');});
  for(const selector of ['#pack-csv','#pack-title','#pack-topic','#pack-change'])$(selector).oninput=invalidate;
  $('#preview-pack').onclick=()=>void work(showPreview);
  $('#pack-template').onclick=()=>{
   const text='\uFEFF'+csvText([{id:'example-card',front:'Replace with a question',back:'Replace with its answer'}],$('#pack-topic').value);
   const address=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');
   link.href=address;link.download='flashcards-'+subject+'-'+$('#pack-topic').value+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(address),1000);
  };
  $('#sample-pack')?.addEventListener('click',()=>{if(selected){status('Choose New pack before loading the sample.');return;}$('#pack-title').value=sample.title;$('#pack-topic').value=sample.topic_id;$('#pack-csv').value=csvText(sample.cards,sample.topic_id);invalidate();void work(showPreview);});
  $('#save-pack').onclick=()=>void work(save);
  $('#publish-pack').onclick=()=>void work(()=>operation('publish'));
  $('#archive-pack').onclick=()=>void work(async()=>{if(window.confirm('Archive this pack? Students will stop receiving its cards; saved history is retained.'))await operation('archive');});
 }
 function invalidate(){preview=null;$('#pack-preview').replaceChildren();$('#save-pack').hidden=true;$('#publish-pack').hidden=true;}
 async function load(){
  const all=checked(await connection.client.rpc('staff_flashcard_packs',{subject}));if(!host.isConnected)return;
  packs=all.filter(p=>profile.role==='admin'||p.owner_id===profile.user_id);markup();status('Ready for CSV import.');
 }
 async function select(id){
  selected=packs.find(p=>p.id===id)||null;invalidate();$('#pack-title').value=selected?.title||'';$('#pack-topic').disabled=!!selected;
  $('#pack-csv').value='';$('#archive-pack').hidden=!selected||selected.status==='archived';
  if(!selected){status('Create a pack for one topic.');return;}
  $('#pack-topic').value=selected.topic_id;
  const draft=checked(await connection.client.from('flashcard_pack_drafts').select('*').eq('pack_id',selected.id).maybeSingle());
  const cards=draft?.cards||await paged(connection.client,'flashcard_cards',q=>q.eq('pack_id',selected.id).eq('is_current',true));if(!host.isConnected)return;
  $('#pack-title').value=draft?.title||selected.title;$('#pack-change').value=draft?.change_kind||'new_version';$('#pack-csv').value=csvText(cards,selected.topic_id);
  $('#publish-pack').hidden=false;status(draft?'Private draft loaded. Preview any edits before saving.':selected.status==='published'?'Published pack loaded. Changes stay private until publication.':'Pack loaded.');
 }
 function showPreview(){
  invalidate();const title=$('#pack-title').value.trim();if(!title)throw Error('Enter a pack title.');
  const result=F.parseCSV($('#pack-csv').value,topics[subject]);
  if(result.errors.length){status(result.errors.slice(0,12).join(' '));return;}
  if(result.cards[0].topic!==$('#pack-topic').value)throw Error('The CSV topic must match the selected topic.');
  preview={title,cards:result.cards,change_kind:$('#pack-change').value};
  $('#pack-preview').innerHTML=`<h3>Import preview · ${result.cards.length} cards</h3><div class="table-wrap pack-preview-list"><table><thead><tr><th>Card ID</th><th>Front</th><th>Back</th></tr></thead><tbody>${result.cards.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(c.front)}</td><td>${esc(c.back)}</td></tr>`).join('')}</tbody></table></div>`;
  $('#save-pack').hidden=false;status('Preview only. No cards have been saved or published.');
 }
 async function save(){
  if(!preview)throw Error('Preview this import first.');
  const fields={...preview,subject_id:subject,topic_id:$('#pack-topic').value,...(selected?{pack_id:selected.id,expected_revision:selected.revision}:{})};
  const pack=checked(await connection.client.rpc('manage_flashcard_pack',{action:'import',payload:fields}));
  await load();if(!host.isConnected)return;$('#pack-picker').value=pack.id;await select(pack.id);status('Private draft saved. Published cards are unchanged until you publish.');
 }
 async function operation(action){
  if(!selected)return;
  if(action==='publish'&&!window.confirm('Publish this pack for everyone practising this topic, including guests?'))return;
  const pack=checked(await connection.client.rpc('manage_flashcard_pack',{action,payload:{pack_id:selected.id,expected_revision:selected.revision}}));
  await load();if(!host.isConnected)return;$('#pack-picker').value=pack.id;await select(pack.id);status(action==='publish'?'Pack published.':'Pack archived.');
 }
 markup();status('Loading your packs…');try{await load();}catch(e){status('Flashcard management is unavailable. '+e.message);}
}
async function report({connection,subject,student,container}){
 const host=document.createElement('section');host.className='flashcard-staff-report';container.append(host);
 host.innerHTML='<h3>Flashcard recall</h3><p role="status">Loading self-assessed flashcard results…</p>';
 try{
  const events=await paged(connection.client,'flashcard_attempts',q=>q.eq('subject_id',subject).eq('student_id',student));
  const ids=[...new Set(events.map(e=>e.question_id))];
  const published=await paged(connection.client,'flashcard_packs',q=>q.eq('subject_id',subject).eq('status','published'));
  const current=published.length?await paged(connection.client,'flashcard_cards',q=>q.in('pack_id',published.map(p=>p.id)).eq('is_current',true)):[];
  const cards=[...current],currentIds=new Set(current.map(c=>c.question_id));
  for(let i=0;i<ids.length;i+=100)cards.push(...await paged(connection.client,'flashcard_cards',q=>q.in('question_id',ids.slice(i,i+100))));
  if(!host.isConnected)return;
  const bank=F.learningBank(subject,[...new Map(cards.map(c=>[c.question_id,c])).values()].map(c=>({...c,topic_id:''}))),ratings=A.ratings(bank,events),first=events.filter(e=>!e.is_retry),now=Date.now();
  host.innerHTML=`<h3>Flashcard recall</h3><p>Student self-assessments, separate from automatically marked Active Learning results. ${new Set(first.map(e=>e.question_id)).size} card versions attempted.</p><p>${[1,7,30].map(days=>`${first.filter(e=>e.earned_marks===1&&Date.parse(e.attempted_at)>=now-days*A.DAY&&Date.parse(e.attempted_at)<=now).length} Got it in ${days} day${days===1?'':'s'}`).join(' · ')}</p><h4>Revision priorities (including new cards)</h4><ul class="flashcard-progress-list">${A.priority(bank.questions.filter(q=>currentIds.has(q.id)),ratings).slice(0,12).map(q=>`<li>${Badges.badgeHTML(ratings[q.id].grade,F.ratingDescriptions[ratings[q.id].grade])}<span>${esc(q.title)}</span></li>`).join('')||'<li>No published cards are available in this subject.</li>'}</ul>`;
 }catch{if(host.isConnected)host.innerHTML='<h3>Flashcard recall</h3><p>Results could not be loaded. Refresh your permitted student report to try again.</p>';}
}
module.exports={mount,report};
