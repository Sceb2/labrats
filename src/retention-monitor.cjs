'use strict';
const {health}=require('./retention-health.cjs');
async function monitor({url,key,webhook,fetchImpl=fetch,now=Date.now()}){
 const base=new URL(url);if(base.protocol!=='https:')throw Error('HTTPS Supabase URL required.');
 let last,policy,result;
 try{
  async function read(path){const r=await fetchImpl(new URL('/rest/v1/'+path,base),{redirect:'error',headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Status read failed');return r.json()}
  [policy]=await read('school_policy?select=retention_enabled&singleton=eq.true');
  [last]=await read('retention_runs?select=status,finished_at,failures,deleted_students,deleted_staff&order=started_at.desc&limit=1');
  result=health(policy,last,now);
 }catch{result={ok:false,reason:'status_unavailable'}}
 if(!result.ok&&webhook){
  const target=new URL(webhook);if(target.protocol!=='https:')throw Error('HTTPS school alert endpoint required.');
  const r=await fetchImpl(target,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),
   body:JSON.stringify({title:'LabRats retention needs attention',reason:result.reason,checked_at:new Date(now).toISOString(),
    last_finished_at:last?.finished_at||null,failures:last?.failures||0})});
  if(!r.ok)throw Error('School alert delivery failed');
 }
 return {...result,alertConfigured:Boolean(webhook)};
}
module.exports={health,monitor};
