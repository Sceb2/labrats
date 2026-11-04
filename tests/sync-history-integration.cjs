'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {spawn}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const {generateUsername,generatePassword,provisionStudent}=require('../scripts/account-service.cjs');
const {makeEvent,recordsFor}=require('../src/learning-events.cjs');
const {pullHistory,cachedCursor}=require('../src/sync-history.cjs');
const Adaptive=require('../src/adaptive.cjs'),F=require('../src/flashcards.cjs');
const bank=require('../questions.json');
const url=process.env.SUPABASE_TEST_URL,key=process.env.SUPABASE_TEST_ANON_KEY;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Disposable local Supabase only.');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const root=createClient(url,process.env.SUPABASE_TEST_SERVICE_KEY,options);
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data};
function historyClient(client,student,table='learning_attempts',subject='chemistry'){
  let cache={history:[]};const transfers=[];
  const measured={from(table){
    const query=client.from(table),select=query.select.bind(query);
    query.select=(...args)=>{const q=select(...args),limit=q.limit.bind(q);
      q.limit=async n=>{const result=await limit(n);if(result.data)transfers.push({rows:result.data.length,bytes:Buffer.byteLength(JSON.stringify(result.data))});return result};return q};return query;
  }};
  return {get cache(){return cache},transfers,
    pull:()=>pullHistory({client:measured,student,subject,table,history:cache.history,cursor:cachedCursor(cache),closed:()=>false,
      commit(history,pullCursor){cache={history,pullCursor}}})};
}
// A controlled, old transaction demonstrates the danger of using transaction-start
// time for receipts. It is restricted to the runner's fictional local database.
async function oldTransaction(){
  const container=process.env.SUPABASE_TEST_DB_CONTAINER;
  assert.match(container,/^ocr-db-[a-f0-9]{10}$/);
  const child=spawn('docker',['exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});
  let output='',errors='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors+=b);
  const waitFor=async marker=>{for(let i=0;i<100;i++){if(output.includes(marker))return;if(child.exitCode!==null)throw Error(errors);await new Promise(r=>setTimeout(r,20))}throw Error('Local SQL barrier timed out: '+errors)};
  child.stdin.write("begin;\nselect 'OLD_TRANSACTION_STARTED';\n");await waitFor('OLD_TRANSACTION_STARTED');
  return {async insert(table,event,student,subject){
    // Fixture values are generated UUIDs and server-controlled catalogue identifiers.
    const fields={...event,student_id:student,subject_id:subject};
    const literal=JSON.stringify(fields).replaceAll("'","''");
    child.stdin.end(`insert into public.${table} select (jsonb_populate_record(null::public.${table},'${literal}'::jsonb)).*;\ncommit;\n`);
    const code=await new Promise(resolve=>child.once('close',resolve));assert.equal(code,0,errors);
  },close(){if(!child.stdin.writableEnded)child.stdin.end('rollback;\n')}};
}
test('incremental history preserves results and reduces real PostgREST transfers',async t=>{
  const users=[],clients=[];let pack;
  try{
    for(let i=0;i<2;i++){
      const username=generateUsername(),password=generatePassword();
      const id=await provisionStudent(root,{username,password:generatePassword()});users.push(id);
      ok(await root.auth.admin.updateUserById(id,{password}));
      const c=createClient(url,key,options);clients.push(c);ok(await c.auth.signInWithPassword({email:username+'@students.invalid',password}));
    }
    const [student,other]=clients,owner=users[0],q=bank.questions[0];
    const event=()=>makeEvent(bank,q,{mode:'practice'},'submit',{score:1},randomUUID);
    const upload=events=>student.rpc('sync_learning_attempts',{events,expected_student:owner});
    const history=historyClient(student,owner),events=Array.from({length:1201},event);
    await t.test('large history pages correctly and unchanged polls return zero history rows',async()=>{
      for(let i=0;i<events.length;i+=100)ok(await upload(events.slice(i,i+100)));
      await history.pull();assert.deepEqual(history.transfers.map(x=>x.rows),[500,500,201]);
      assert.deepEqual(recordsFor(history.cache.history,bank),recordsFor(events,bank));
      const now=Date.now();assert.deepEqual(Adaptive.ratings(bank,history.cache.history,now),Adaptive.ratings(bank,events,now));
      await history.pull();assert.deepEqual(history.transfers.at(-1),{rows:0,bytes:2});
      console.log('History transfer: initial '+history.transfers.slice(0,3).reduce((n,p)=>n+p.bytes,0)+' bytes / 1201 rows; unchanged poll 2 bytes / 0 rows (JSON bodies only).');
    });
    await t.test('legacy tied timestamps page without omissions through real tuple filters',async()=>{
      const legacy=events.slice(0,1001).map(e=>e.event_id);
      for(let i=0;i<legacy.length;i+=100)ok(await root.from('learning_attempts').update({received_at:'2000-01-01T00:00:00.123456Z'}).eq('student_id',owner).in('event_id',legacy.slice(i,i+100)));
      const restored=historyClient(student,owner);await restored.pull();assert.equal(restored.cache.history.length,1201);
      assert.equal(new Set(restored.cache.history.map(e=>e.event_id)).size,1201);
      assert.deepEqual(recordsFor(restored.cache.history,bank),recordsFor(events,bank));
    });
    await t.test('another device uploads an older answer and the next request returns only that new receipt',async()=>{
      const offline={...event(),attempted_at:events[0].attempted_at};ok(await upload([offline]));
      await history.pull();assert.equal(history.transfers.at(-1).rows,1);assert.equal(history.cache.history.length,1202);
      ok(await upload([offline]));await history.pull();assert.equal(history.transfers.at(-1).rows,0);
    });
    await t.test('student and subject filters prevent cross-account or cross-subject history',async()=>{
      const privateView=historyClient(other,owner);await privateView.pull();assert.equal(privateView.cache.history.length,0);
      const applied=historyClient(student,owner,'learning_attempts','applied-science');await applied.pull();assert.equal(applied.cache.history.length,0);
    });
    await t.test('a transaction begun before the checkpoint still receives a newer, visible receipt',async()=>{
      const tx=await oldTransaction();
      try{
        ok(await upload([event()]));await history.pull();
        const delayed={...event(),received_at:'2000-01-01T00:00:00Z'};
        await tx.insert('learning_attempts',delayed,owner,'chemistry');
        await history.pull();assert.equal(history.transfers.at(-1).rows,1);
        assert(history.cache.history.some(e=>e.event_id===delayed.event_id));
      }finally{tx.close()}
    });
    await t.test('concurrent uploads converge while another device checks history',async()=>{
      const batch=Array.from({length:12},event);
      const uploads=batch.map(e=>upload([e]).then(ok));
      await history.pull();await Promise.all(uploads);await history.pull();
      const saved=new Set(history.cache.history.map(e=>e.event_id));
      for(const e of batch)assert(saved.has(e.event_id));
      await history.pull();assert.equal(history.transfers.at(-1).rows,0);
    });
    await t.test('flashcards have a separate cursor and the same late-transaction safeguards',async()=>{
      pack=ok(await root.from('flashcard_packs').insert({subject_id:'chemistry',topic_id:'basic',title:'Fictional sync fixture',status:'published'}).select('id').single()).id;
      const card=ok(await root.from('flashcard_cards').insert({pack_id:pack,card_id:'sample',content_version:1,front:'Question',back:'Answer'}).select('*').single());
      const fb=F.learningBank('chemistry',[{...card,topic_id:'basic'}]),fq=fb.questions[0];
      const fe=()=>makeEvent(fb,fq,{mode:'practice'},'submit',{score:1},randomUUID);
      const uploadFlash=async e=>ok(await student.rpc('sync_flashcard_attempts',{events:[e],expected_student:owner}));
      const flash=historyClient(student,owner,'flashcard_attempts');await uploadFlash(fe());await flash.pull();assert.equal(flash.cache.history.length,1);
      await flash.pull();assert.equal(flash.transfers.at(-1).rows,0);
      const tx=await oldTransaction();try{await uploadFlash(fe());await flash.pull();const delayed={...fe(),received_at:'2000-01-01T00:00:00Z'};await tx.insert('flashcard_attempts',delayed,owner,'chemistry');await flash.pull();assert.equal(flash.transfers.at(-1).rows,1);assert.equal(flash.cache.history.length,3)}finally{tx.close()}
      assert.equal(history.cache.history.some(e=>e.bank_version==='flashcards-1'),false);
    });
  }finally{
    for(const c of clients)await c.auth.signOut();
    for(const user of users)await root.auth.admin.deleteUser(user);
    if(pack){await root.from('flashcard_cards').delete().eq('pack_id',pack);await root.from('flashcard_packs').delete().eq('id',pack)}
  }
});
