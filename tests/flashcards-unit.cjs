'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const F=require('../src/flashcards.cjs'),A=require('../src/adaptive.cjs'),E=require('../src/learning-events.cjs');
const topics=require('../flashcards/topics.json'),sample=require('../flashcards/sample-pack.json');
test('sample CSV round-trips OCR notation, multiline fields and quoted text without interpreting markup',()=>{
 const r=F.parseCSV(fs.readFileSync('docs/flashcards/organic-names-and-formulae.csv','utf8'),topics.chemistry);
 assert.deepEqual(r.errors,[]);assert.equal(r.cards.length,33);assert.equal(r.cards[5].back,'CH₃CH₂CH₃');assert(r.cards[10].back.includes('RCOOR′'));
 const quoted=F.parseCSV('\ufeffcard_id,topic,front,back\r\nx,basic,"Say ""hello""","Line one\r\nLine two <script>alert(1)</script>"',topics.chemistry);
 assert.deepEqual(quoted.errors,[]);assert.equal(quoted.cards[0].front,'Say "hello"');assert.equal(quoted.cards[0].back,'Line one\nLine two <script>alert(1)</script>');
});
test('CSV rejects invalid quotes, oversized imports, duplicate IDs, unknown/mixed topics and empty answers',()=>{
 assert.throws(()=>F.parseCSV('card_id,topic,front,back\nx,basic,"unclosed,b',topics.chemistry));
 assert.throws(()=>F.parseCSV('x'.repeat(F.MAX_BYTES+1),topics.chemistry));
 const r=F.parseCSV('card_id,topic,front,back\nx,basic,front,\nx,alkenes,front,back\ny,unknown,front,back',topics.chemistry);
 assert(r.errors.some(e=>e.includes('duplicate')));assert(r.errors.some(e=>e.includes('unknown')));assert(r.errors.some(e=>e.includes('exactly one')));assert(r.errors.some(e=>e.includes('provide a front')));
 assert.throws(()=>F.parseCSV('card_id,topic,front,back\nx,basic,"front"oops,back',topics.chemistry));
});
test('20-card and open sessions end, with at most one spaced retry per missed card',()=>{
 const bank=F.learningBank('chemistry',sample.cards),map=A.ratings(bank,[]);
 for(const mode of ['twenty','open']){
  const s=F.createSession(sample.cards,map,mode,()=>.5),counts=new Map();let last=[];F.next(s);
  assert.equal(s.planned,mode==='twenty'?20:33);
  while(s.current){
   const id=F.identity(s.current.card);counts.set(id,(counts.get(id)||0)+1);
   if(s.current.retry&&!last.slice(-3).every(x=>x!==id)){
    // At the end of a session, only recently seen retries may remain.
    assert(s.queue.every(e=>last.slice(-3).includes(F.identity(e.card))));
   }
   assert.throws(()=>F.assess(s,false));s.revealed=true;F.assess(s,false);last.push(id);F.next(s);
  }
  assert.equal(s.completed,s.planned*2);assert([...counts.values()].every(n=>n===2));
 }
 const tiny=F.createSession(sample.cards.slice(0,1),map,'open');F.next(tiny);tiny.revealed=true;F.assess(tiny,false);F.next(tiny);tiny.revealed=true;F.assess(tiny,false);assert.equal(F.next(tiny),null);
});
test('correct cards do not repeat; normal reveal allows an initial rating while a retry cannot inflate it',()=>{
 const cards=sample.cards.slice(0,1),bank=F.learningBank('chemistry',cards),q=bank.questions[0],s=F.createSession(cards,{},'twenty');
 F.next(s);s.revealed=true;F.assess(s,true);assert.equal(F.next(s),null);assert.equal(s.gotIt,1);
 const learning={mode:'practice'},wrong=E.makeEvent(bank,q,learning,'submit',{score:0});
 const baseline=A.ratings(bank,[wrong],Date.now()+1000)[q.id];
 const retry=E.makeEvent(bank,q,learning,'submit',{score:1});assert(retry.is_retry);assert(!wrong.answer_revealed);
 assert.deepEqual(A.ratings(bank,[wrong,retry],Date.now()+1000)[q.id].grade,baseline.grade);
 const other={...cards[0],pack_id:'different-pack'};assert.notEqual(F.identity(cards[0]),F.identity(other));assert.notEqual(F.identity(cards[0]),F.identity({...cards[0],content_version:2}));
});
test('a missed card returns after three intervening assessments, ahead of remaining fresh cards',()=>{
 const s=F.createSession(sample.cards,{},'twenty',()=>.5);const initial=F.next(s);s.revealed=true;F.assess(s,false);
 for(let i=0;i<3;i++){const other=F.next(s);assert(!other.retry);assert.notEqual(F.identity(other.card),F.identity(initial.card));s.revealed=true;F.assess(s,true);}
 const retry=F.next(s);assert(retry.retry);assert.equal(F.identity(retry.card),F.identity(initial.card));
});
test('release builds are stable and detect a diagram-only correction',()=>{
 const path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'labrats-release-regression-'));
 try{
  fs.cpSync(root,dir,{recursive:true,filter:file=>{const first=path.relative(root,file).split(path.sep)[0];return !['.git','node_modules','downloads','docs','tests'].includes(first)&&!first.startsWith('.env');}});
  const build=()=>{execFileSync(process.execPath,[path.join(root,'scripts/prepare-site-release.cjs')],{cwd:dir});return JSON.parse(fs.readFileSync(path.join(dir,'version.json'))).id;};
  const first=build();assert.equal(build(),first);
  const diagram=Object.values(require('../assets.json'))[0].path;fs.appendFileSync(path.join(dir,diagram),'\n<!-- diagram correction -->\n');
  assert.notEqual(build(),first);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
