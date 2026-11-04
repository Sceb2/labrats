'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {makeEvent,recordsFor}=require('../src/learning-events.cjs');
const Adaptive=require('../src/adaptive.cjs');
const {cachedCursor,pullHistory}=require('../src/sync-history.cjs');
const bank=require('../questions.json');
function receipt(n,extra={}){
  return {...makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:n%3},randomUUID),
    received_at:'2026-11-04T12:00:00.'+String(n).padStart(6,'0')+'+00:00',...extra};
}
function fixture(rows){
  const requests=[],writes=[];let cache={history:[]},failAt=0,closed=false,writeFails=false;
  const client={from(table){
    const request={table,filters:[],orders:[]};requests.push(request);
    const q={select(){return q},eq(k,v){request.filters.push([k,v]);return q},
      or(value){request.cursor=value;return q},order(k){request.orders.push(k);return q},
      async limit(limit){
        request.limit=limit;
        if(failAt===requests.length)return {error:Error('Interrupted download')};
        const c=request.cursor?.match(/^received_at.gt.(.*),and\(received_at.eq.(.*),event_id.gt.(.*)\)$/);
        const data=rows.filter(r=>!c||r.received_at>c[1]||r.received_at===c[1]&&r.event_id>c[3])
          .sort((a,b)=>a.received_at.localeCompare(b.received_at)||a.event_id.localeCompare(b.event_id)).slice(0,limit);
        return {data};
      }};return q;
  }};
  return {requests,writes,get cache(){return cache},set cache(c){cache=c},
    set failAt(n){failAt=n},set closed(v){closed=v},set writeFails(v){writeFails=v},
    pull:()=>pullHistory({client,table:'learning_attempts',student:'student-a',subject:'chemistry',
      history:cache.history,cursor:cachedCursor(cache),closed:()=>closed,
      commit(history,pullCursor){if(writeFails)throw Error('Storage unavailable');cache={history,pullCursor};writes.push(cache);}})};
}
test('history pages once, idle polls return nothing, and late offline attempts use receipt time',async()=>{
  const rows=Array.from({length:1201},(_,i)=>receipt(i+1)),f=fixture(rows);
  await f.pull();assert.equal(f.requests.length,3);assert.equal(f.cache.history.length,1201);
  assert.deepEqual(recordsFor(f.cache.history,bank),recordsFor(rows,bank));
  const now=Date.now();assert.deepEqual(Adaptive.ratings(bank,f.cache.history,now),Adaptive.ratings(bank,rows,now));
  await f.pull();assert.equal(f.requests.length,4);assert.equal(f.writes.length,3);
  assert.equal(f.requests.at(-1).cursor.includes(rows.at(-1).received_at),true);
  rows.push(receipt(1202,{attempted_at:rows[0].attempted_at}));
  await f.pull();assert.equal(f.cache.history.length,1202);assert.equal(f.writes.at(-1).history.length,1202);
  for(const r of f.requests){assert.deepEqual(r.filters,[['student_id','student-a'],['subject_id','chemistry']]);assert.deepEqual(r.orders,['received_at','event_id']);assert.equal(r.limit,500);}
});
test('tied legacy timestamps cross page boundaries using UUID, preserving microseconds',async()=>{
  const rows=Array.from({length:1001},()=>receipt(123456)),f=fixture(rows);
  await f.pull();assert.equal(f.cache.history.length,1001);assert.equal(f.requests.length,3);
  assert.match(f.requests[1].cursor,/\.123456\+00:00/);
  await f.pull();assert.equal(f.cache.history.length,1001);
});
test('an interrupted later page resumes from the last stored page without losing or duplicating results',async()=>{
  const rows=Array.from({length:1001},(_,i)=>receipt(i+1)),f=fixture(rows);f.failAt=2;
  await assert.rejects(f.pull(),/Interrupted/);assert.equal(f.cache.history.length,500);
  const checkpoint=f.cache.pullCursor;await f.pull();assert.equal(f.cache.history.length,1001);
  assert.equal(f.requests[2].cursor.includes(checkpoint.received_at),true);
  assert.equal(new Set(f.cache.history.map(e=>e.event_id)).size,1001);
});
test('uploads already in local history do not advance the remote checkpoint past unseen device events',async()=>{
  const first=receipt(1),unseen=receipt(2),uploaded=receipt(3),f=fixture([first,unseen,uploaded]);
  f.cache={history:[first,uploaded],pullCursor:{version:1,received_at:first.received_at,event_id:first.event_id}};
  await f.pull();assert.equal(f.cache.history.length,3);assert(f.cache.history.some(e=>e.event_id===unseen.event_id));
});
test('failed persistence cannot advance a checkpoint, and closing stops downloads',async()=>{
  const f=fixture([receipt(1)]);f.writeFails=true;await assert.rejects(f.pull(),/Storage/);assert.equal(f.cache.pullCursor,undefined);
  f.writeFails=false;await f.pull();assert.equal(f.cache.history.length,1);
  f.closed=true;await f.pull();assert.equal(f.requests.length,2);
});
test('legacy, missing-history and malformed cache checkpoints safely require a full reload',()=>{
  const row=receipt(1),cursor={version:1,received_at:row.received_at,event_id:row.event_id};
  assert.deepEqual(cachedCursor({history:[row],pullCursor:cursor}),cursor);
  for(const cache of [{history:[row]},{pullCursor:cursor},{history:[],pullCursor:cursor},
    {history:[row],pullCursor:{...cursor,version:2}},{history:[row],pullCursor:{...cursor,event_id:'bad,filter'}},
    {history:[row],pullCursor:{...cursor,received_at:'bad)'}}])assert.equal(cachedCursor(cache),null);
});
test('a response arriving after sign-out cannot commit account history',async()=>{
  let closed=false,committed=false,release;
  const response=new Promise(resolve=>{release=resolve});
  const query={select(){return query},eq(){return query},order(){return query},limit(){return response}};
  const request=pullHistory({client:{from:()=>query},table:'learning_attempts',student:'a',subject:'chemistry',history:[],cursor:null,
    closed:()=>closed,commit(){committed=true}});
  closed=true;release({data:[receipt(1)]});await request;assert.equal(committed,false);
});
