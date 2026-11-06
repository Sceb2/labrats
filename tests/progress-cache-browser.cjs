'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const {makeEvent}=require('../src/learning-events.cjs');
const bank=require('../questions.json'),root=path.resolve(__dirname,'..');

test('unchanged sync keeps progress cached while new, offline and rejected attempts remain safe',async t=>{
 const script=await fs.readFile(path.join(root,'progress-sync.js'));
 const server=http.createServer((req,res)=>{
  res.setHeader('Content-Type',req.url==='/progress-sync.js'?'text/javascript':'text/html');
  res.end(req.url==='/progress-sync.js'?script:'<!doctype html><div class="workspace"><main><div id="app"></div></main></div><script src="/progress-sync.js"></script>');
 });
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
  const initial={...makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:0}),received_at:'2026-11-06T12:00:00.000001+00:00'};
  async function fixture(run){
   const page=await browser.newPage();
   await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   try{
    await page.goto(base);await page.evaluate(async({bank,initial})=>{
     const owner={user_id:'fictional-student',username:'fictional-student',active:true,role:'student',must_change_password:false};
     const cacheKey='fixture-'+owner.user_id,values=new Map(),memory=new Map();
     const f=window.fixture={cacheKey,values,memory,writes:[],notices:[],remote:[],profileChecks:0,uploads:[],online:true,limited:false,blocked:false,deny:false,navigations:[]};
     Object.defineProperty(navigator,'onLine',{get:()=>f.online});
     window.setInterval=fn=>{f.tick=fn;return 1;};
     values.set(cacheKey,JSON.stringify({history:[initial],pullCursor:{version:1,received_at:initial.received_at,event_id:initial.event_id}}));
     const storage={
      getItem:key=>memory.has(key)?memory.get(key):values.get(key)??null,
      setItem(key,value){
       memory.set(key,value);
       const hasPending=JSON.parse(memory.get(cacheKey+':pending')||'[]').length>0;
       const saved=!f.blocked&&!(f.limited&&(key===cacheKey&&hasPending||key===cacheKey+':pending'&&hasPending&&values.has(cacheKey)));
       f.writes.push({key,value,saved});if(saved)values.set(key,value);return saved;
      },
      removeItem(key){memory.set(key,null);values.delete(key);}
     };
     const read=key=>JSON.parse(storage.getItem(key));
     const connection={prefix:'fixture-',sessionKey:'session',storage,read,cachedProfile:()=>owner,
      async profile(){f.profileChecks++;return {...owner,...(f.deny?{active:false}:{})};},
      pendingQueues:()=>[],pendingCount:()=>[':pending',':rejected'].reduce((n,s)=>n+(read(cacheKey+s)||[]).length,0),
      async signOut(){values.clear();memory.clear();},
      client:{auth:{async getSession(){return {data:{session:{access_token:'fictional'}}};}},
       from(){const query={select(){return query;},eq(){return query;},or(){return query;},order(){return query;},
        async limit(){return {data:f.remote.splice(0)};}};return query;},
       async rpc(name,payload){f.uploads.push(payload);return f.reject?{error:{code:'23514'}}:{data:payload.events.map(e=>e.event_id)};}}
     };
     f.sync=await window.RevisionSync.open(bank,records=>f.notices.push(records),{connection,navigate:path=>f.navigations.push(path)});
    },{bank,initial});
    await page.waitForFunction(()=>window.fixture.profileChecks>=2&&document.querySelector('#account-sync-status').textContent.includes('All progress saved'));
    await run(page);
   }finally{await page.close();}
  }
  await t.test('idle checks validate the account without rewriting history or notifying unchanged progress',()=>fixture(async page=>{
   const before=await page.evaluate(()=>({writes:fixture.writes.length,notices:fixture.notices.length,checks:fixture.profileChecks}));
   await page.evaluate(async()=>{for(let i=0;i<5;i++)await fixture.tick();});
   const after=await page.evaluate(()=>({writes:fixture.writes.length,notices:fixture.notices.length,checks:fixture.profileChecks}));
   assert.equal(after.writes,before.writes);assert.equal(after.notices,before.notices);assert.equal(after.checks,before.checks+5);
  }));
  await t.test('a new remote event updates progress and its checkpoint once',()=>fixture(async page=>{
   const fresh={...makeEvent(bank,bank.questions[0],{mode:'practice'},'submit',{score:bank.questions[0].maxMark}),received_at:'2026-11-06T12:00:00.000002+00:00'};
   await page.evaluate(async event=>{fixture.remote.push(event);await fixture.sync.flush();},fresh);
   const saved=await page.evaluate(()=>({cache:JSON.parse(fixture.values.get(fixture.cacheKey)),records:fixture.sync.records(),notices:fixture.notices.length,writes:fixture.writes.length}));
   assert.equal(saved.cache.history.length,2);assert.equal(saved.cache.pullCursor.event_id,fresh.event_id);
   assert.equal(saved.records[bank.questions[0].id].first.score,0);assert.equal(saved.records[bank.questions[0].id].attempts,2);
   assert.equal(saved.notices,2);
   await page.evaluate(()=>fixture.sync.flush());
   assert.deepEqual(await page.evaluate(()=>[fixture.notices.length,fixture.writes.length]),[saved.notices,saved.writes]);
  }));
  await t.test('offline results remain queued across idle checks and save on reconnect without answer text',()=>fixture(async page=>{
   await page.evaluate(bank=>{fixture.online=false;fixture.sync.record(bank.questions[0],{mode:'practice'},'submit',{score:1,response:'PRIVATE-ANSWER'});},bank);
   const before=await page.evaluate(()=>({writes:fixture.writes.length,notices:fixture.notices.length}));
   await page.evaluate(async()=>{for(let i=0;i<3;i++)await fixture.sync.flush();});
   const queued=await page.evaluate(()=>({events:JSON.parse(fixture.values.get(fixture.cacheKey+':pending')),text:[...fixture.values.values()].join(''),writes:fixture.writes.length,notices:fixture.notices.length}));
   assert.equal(queued.events.length,1);assert(!queued.text.includes('PRIVATE-ANSWER'));
   assert.equal(queued.writes,before.writes);assert.equal(queued.notices,before.notices);
   await page.evaluate(async()=>{fixture.online=true;await fixture.sync.flush();});
   assert.deepEqual(await page.evaluate(()=>[JSON.parse(fixture.values.get(fixture.cacheKey+':pending')).length,fixture.uploads.length,fixture.sync.events().length]),[0,1,2]);
  }));
  await t.test('storage pressure prioritises pending attempts and restores the history cache when space returns',()=>fixture(async page=>{
   await page.evaluate(bank=>{fixture.online=false;fixture.limited=true;fixture.sync.record(bank.questions[0],{mode:'practice'},'submit',{score:1});},bank);
   const queued=await page.evaluate(()=>({pending:JSON.parse(fixture.values.get(fixture.cacheKey+':pending')),hasDurableHistory:fixture.values.has(fixture.cacheKey),events:fixture.sync.events().length}));
   assert.equal(queued.pending.length,1);assert.equal(queued.hasDurableHistory,false);assert.equal(queued.events,2);
   await page.evaluate(async()=>{fixture.limited=false;fixture.online=true;await fixture.sync.flush();});
   assert.deepEqual(await page.evaluate(()=>[JSON.parse(fixture.values.get(fixture.cacheKey)).history.length,JSON.parse(fixture.values.get(fixture.cacheKey+':pending')).length]),[2,0]);
  }));
  await t.test('blocked storage keeps attempts in memory and retries persistence when available',()=>fixture(async page=>{
   await page.evaluate(bank=>{fixture.online=false;fixture.blocked=true;fixture.sync.record(bank.questions[0],{mode:'practice'},'submit',{score:1});},bank);
   assert.equal(await page.evaluate(()=>JSON.parse(fixture.memory.get(fixture.cacheKey+':pending')).length),1);
   await page.evaluate(async()=>{fixture.blocked=false;await fixture.sync.flush();});
   assert.equal(await page.evaluate(()=>JSON.parse(fixture.values.get(fixture.cacheKey+':pending')).length),1);
  }));
  await t.test('rejected attempts are saved for review before being removed from the pending queue',()=>fixture(async page=>{
   await page.evaluate(bank=>{fixture.online=false;fixture.sync.record(bank.questions[0],{mode:'practice'},'submit',{score:1});},bank);
   await page.evaluate(async()=>{fixture.reject=true;fixture.online=true;await fixture.sync.flush();});
   const saved=await page.evaluate(()=>({pending:JSON.parse(fixture.values.get(fixture.cacheKey+':pending')),rejected:JSON.parse(fixture.values.get(fixture.cacheKey+':rejected')),writes:fixture.writes.filter(w=>w.saved)}));
   assert.equal(saved.pending.length,0);assert.equal(saved.rejected.length,1);
   const rejectedWrite=saved.writes.findIndex(w=>w.key.endsWith(':rejected')&&JSON.parse(w.value).length===1);
   assert(rejectedWrite>=0);assert(saved.writes.slice(rejectedWrite+1).some(w=>w.key.endsWith(':pending')&&JSON.parse(w.value).length===0));
   assert(await page.locator('#sync-attention').isVisible());
  }));
  await t.test('unchanged history cannot suppress account revocation checks or sign-out cleanup',()=>fixture(async page=>{
   await page.evaluate(async()=>{fixture.deny=true;await fixture.sync.flush();});
   assert.equal(await page.locator('main').isVisible(),false);
   assert.match(await page.locator('#account-sync-status').innerText(),/Sign in again/);
   await page.locator('#practice-sign-out').click();
   assert.deepEqual(await page.evaluate(()=>({values:fixture.values.size,memory:fixture.memory.size,navigations:fixture.navigations})),{values:0,memory:0,navigations:['index.html']});
  }));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
