/* One declarative catalogue; no per-question resource decisions in UI code. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ChemResources=api})(typeof globalThis==='object'?globalThis:this,()=>{
 'use strict';
 const safeURL=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}};
 function validate(data,bank){
  const errors=[],packs=data?.packs||{},resources=data?.resources||{},questionIds=new Set(bank?.questions?.map(q=>q.id)||[]),topicIds=new Set(bank?.topics?.map(t=>t.id)||[]);
  if(data?.schema!==1)errors.push('Unknown resource catalogue schema');
  for(const [id,r]of Object.entries(resources)){
   if(!r.title||!r.provider)errors.push(id+': missing title/provider');
   if(r.kind==='video'){if(!/^[A-Za-z0-9_-]{11}$/.test(r.videoId||''))errors.push(id+': invalid YouTube ID');if(r.durationSeconds!=null&&(!Number.isInteger(r.durationSeconds)||r.durationSeconds<=0))errors.push(id+': invalid duration')}
   else if(r.kind!=='link'||!safeURL(r.url))errors.push(id+': invalid HTTPS link');
  }
  for(const [id,p]of Object.entries(packs)){
   if(!p.title)errors.push(id+': missing pack title');
   if(!p.primary||resources[p.primary]?.kind!=='video')errors.push(id+': missing primary video');
   for(const r of [...(p.links||[]),...(p.videos||[])])if(!resources[r])errors.push(id+': unknown resource '+r);
  }
  const check=(ids,label)=>{if(!Array.isArray(ids))errors.push(label+': expected pack array');else for(const id of ids)if(!packs[id])errors.push(label+': unknown pack '+id)};
  check(data?.defaults||[],'defaults');
  for(const group of ['byTopic','byType','byQuestion'])for(const [id,ids]of Object.entries(data?.[group]||{})){
   check(ids,group+'/'+id);
   if(bank&&group==='byQuestion'&&!questionIds.has(id))errors.push('Unknown question '+id);
   if(bank&&group==='byTopic'&&!topicIds.has(id))errors.push('Unknown topic '+id);
  }
  return errors;
 }
 function resolve(data,q){
  if(!data)return {packs:[],videos:[],links:[]};
  // Explicit question assignments replace inferred topic packs. Type overrides
  // (e.g. nomenclature) take priority over broad topic prerequisites.
  const ids=data.byQuestion?.[q.id]??data.byType?.[q.type]??(q.prerequisites||[]).filter(t=>t!=='basic'||q.prerequisites.length===1).flatMap(t=>data.byTopic?.[t]||[]);
  const packs=[...new Set(ids.length?ids:data.defaults||[])].map(id=>data.packs[id]).filter(Boolean);
  const videos=[...new Set(packs.flatMap(p=>[p.primary,...(p.videos||[])]))].map(id=>({...data.resources[id],id})).filter(r=>r.kind==='video');
  const links=[...new Set(packs.flatMap(p=>p.links||[]))].map(id=>({...data.resources[id],id})).filter(r=>r.kind==='link'&&safeURL(r.url));
  return {packs,videos,links};
 }
 async function load(bank){
  if(typeof window!=='undefined'&&window.CHEM_RESOURCE_DATA){const data=window.CHEM_RESOURCE_DATA,errors=validate(data,bank);if(errors.length)throw Error(errors.join('; '));return data}
  const build=window.CHEM_BUILD||{},url=new URL('learning-resources.json',location.href);if(build.id)url.searchParams.set('v',build.id);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let response;
  try{response=await fetch(url,{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Learning resources could not load.');
  const text=await response.text();
  if(build.resourcesSha256&&window.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));if([...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('')!==build.resourcesSha256)throw Error('Learning resources are from a different release. Check for updates.')}
  const data=JSON.parse(text),errors=validate(data,bank);if(errors.length)throw Error(errors.join('; '));return data;
 }
 return {safeURL,validate,resolve,load};
});
