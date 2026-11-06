'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {health,monitor}=require('../src/retention-monitor.cjs');
const {dashboardHealth}=require('../src/retention-health.cjs');
const now=Date.parse('2026-11-04T12:00:00Z');
test('dashboard distinguishes setup from failures and never describes a failed enabled policy as healthy',()=>{
 const last={status:'success',failures:0,finished_at:'2026-11-01T03:00:00Z'};
 assert.equal(dashboardHealth({enabled:false,last_run:last},now).attention,false);
 assert.equal(dashboardHealth({enabled:true,last_run:last},now).ok,true);
 for(const run of [null,{...last,status:'failed',failures:1},{...last,finished_at:'2026-10-01T00:00:00Z'}]){
  const result=dashboardHealth({enabled:true,last_run:run},now);
  assert.equal(result.attention,true);assert.equal(result.ok,false);assert.notEqual(result.reason,'healthy');
 }
 assert.match(dashboardHealth({enabled:true,last_run:{...last,status:'failed',failures:1}},now).title,/Cleanup failed/);
});
test('monitor distinguishes disabled, missing, failed and overdue weekly cleanups',()=>{
 assert.equal(health({retention_enabled:false},null,now).ok,false);
 assert.equal(health({retention_enabled:true},null,now).reason,'missing_run');
 const last={status:'success',failures:0,finished_at:'2026-11-01T03:00:00Z'};
 assert.equal(health({retention_enabled:true},last,now).ok,true);
 assert.equal(health({retention_enabled:true},{...last,status:'failed',failures:1},now).reason,'failed_run');
 assert.equal(health({retention_enabled:true},{...last,finished_at:'2026-10-01T00:00:00Z'},now).reason,'overdue_run');
});
test('school alerts expose only minimal operational metadata and no service credential',async()=>{
 const calls=[],fetchImpl=async(url,init)=>{calls.push({url:String(url),init});return {ok:true,json:async()=>String(url).includes('school_policy')?[{retention_enabled:true}]:[{status:'failed',failures:2,finished_at:'2026-11-01T03:00:00Z'}]}};
 const r=await monitor({url:'https://fictional.supabase.co',key:'private-service-test',webhook:'https://school.invalid/alert',fetchImpl,now});
 assert.equal(r.ok,false);const alert=calls.find(c=>c.init.method==='POST');assert(alert);assert(!alert.init.body.includes('private-service-test'));assert(!('Authorization' in alert.init.headers));
 assert.deepEqual(Object.keys(JSON.parse(alert.init.body)),['title','reason','checked_at','last_finished_at','failures']);
});
test('unreachable status service alerts independently; unconfigured alerts do not send',async()=>{
 let sends=0;const fetchImpl=async(url,init)=>{if(init.method==='POST'){sends++;return {ok:true}}throw Error('network')};
 const input={url:'https://fictional.supabase.co',key:'test',fetchImpl,now};
 assert.equal((await monitor(input)).reason,'status_unavailable');assert.equal(sends,0);
 await monitor({...input,webhook:'https://school.invalid/alert'});assert.equal(sends,1);
});
