'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const {execFileSync,spawnSync}=require('node:child_process');
const C=require('../core.js');
const bank={...require('../questions.json'),assets:require('../assets.json')};
const map=require('../content-drafts/mechanism-card-map.json');
const pack=require('../content-drafts/ocr-mechanism-markpoints.json');
const cards=bank.questions.filter(q=>q.markPointPractice?.pack===pack.id);
const perfect=q=>Object.fromEntries(q.components.map(c=>[c.id,q.validMethods[0].answers[c.id][0]]));

test('20 recognition cards cover each of the 16 source groups once in each format',()=>{
  assert.equal(cards.length,20);assert.equal(map.coverage.length,16);
  assert.deepEqual(cards.filter(q=>q.markPointPractice.mode==='combined').map(q=>q.maxMark),[5,4,3,4]);
  for(const family of pack.families)for(const group of family.groups){
    const rows=map.coverage.filter(row=>row.sourceId===family.sourceId&&row.group===group.id);
    assert.equal(rows.length,1);
    for(const id of [rows[0].combined,rows[0].focused]){
      const q=cards.find(q=>q.id===id);assert(q.markPointPractice.groups.includes(group.id));
      const component=q.components.find(c=>c.id===group.id.toLowerCase());
      assert.equal(component.marks,1);assert.equal(component.essential,true);
    }
  }
  assert.deepEqual(C.validate(bank).errors,[]);
});

test('every accepted choice earns its whole group, every distractor earns zero, and blank groups earn no mark',()=>{
  for(const q of cards){
    assert.equal(C.mark(q,{},bank).score,0,q.id);
    assert.equal(C.mark(q,perfect(q),bank).score,q.maxMark,q.id);
    for(const c of q.components)for(const option of c.options){
      const expected=q.validMethods[0].answers[c.id].includes(option)?1:0;
      assert.equal(C.mark(q,{[c.id]:option},bank).score,expected,`${q.id}/${c.id}/${option}`);
      const answer={...perfect(q),[c.id]:option};
      assert.equal(C.mark(q,answer,bank).score,q.maxMark-1+expected);
    }
  }
});

test('missing dipoles, either missing bromine opening arrow, and a missing catalyst equation lose the grouped mark',()=>{
  for(const id of ['MC27','MC33','MC37','MC41']){
    const q=cards.find(q=>q.id===id),c=q.components[0];
    for(const option of c.options.filter(id=>!q.validMethods[0].answers[c.id].includes(id)))assert.equal(C.mark(q,{[c.id]:option},bank).score,0);
  }
  assert.equal(bank.vocabulary['mp-br2-m1-2'].asset,'mp-br2-m1-2');
  assert.match(bank.assets['mp-br2-m1-2'].description,/no dipole/);
  assert.match(bank.assets['mp-br2-m1-3'].description,/no C=C attack/);
  assert.match(bank.assets['mp-br2-m1-4'].description,/no Br–Br breaking/);
});

test('H+ and water protonation, and complete Al/Fe catalyst pairs, are accepted',()=>{
  for(const [qid,cid,ids] of [['MC25','m3',['mp-hcn-m3-1','mp-hcn-m3-2']],['MC40','m1',['mp-eas-m1-1','mp-eas-m1-2']]]){
    const q=cards.find(q=>q.id===qid);
    for(const id of ids)assert.equal(C.mark(q,{...perfect(q),[cid]:id},bank).score,q.maxMark);
  }
});

test('retries and reveals do not inflate first-attempt marks for the new cards',()=>{
  const q=cards[0];
  let record=C.progressEvent(null,'submit',C.mark(q,{m1:perfect(q).m1},bank));
  record=C.progressEvent(record,'submit',C.mark(q,perfect(q),bank));
  assert.equal(record.first.score,1);assert.equal(record.correctAfterRetry,true);
  record=C.progressEvent(null,'reveal');record=C.progressEvent(record,'submit',C.mark(q,perfect(q),bank));
  assert.equal(record.first,null);assert.equal(record.revealed,true);
});

test('v6 guest progress is retained and all 216 original questions are unchanged',()=>{
  const original=bank.questions.filter(q=>!q.markPointPractice);
  assert.equal(original.length,216);
  // Canonical JSON of the original 216 records at ecdf908, before this adaptation.
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'),'d3c2809c967a56185559c41e1b93303c70be65877cab94011c493df01bc8388a');
  const first={score:1,max:2,outcome:'partial'};
  const restored=C.restoreProgress({bankVersion:'v6-216-questions-2026-10-15',scoringVersion:'2',records:{MC01:{first}},sessions:[],bests:{}},bank);
  assert.deepEqual(restored.records.MC01.first,first);assert(!restored.reset);
});

test('new catalogue includes all 236 versioned rows and refuses to overwrite an applied migration',()=>{
  const target='supabase/migrations/202610240007_mechanism_recognition_catalog.sql';
  execFileSync(process.execPath,['scripts/build-question-catalog.cjs','--output',target,'--check']);
  const sql=fs.readFileSync(target,'utf8');
  assert.equal((sql.match(/v7-236-questions-2026-10-24/g)||[]).length,236);
  assert(!sql.includes('mp-hcn-m1-1'));
  const original='supabase/migrations/202610230003_question_catalog.sql';
  const before=fs.readFileSync(original);
  const result=spawnSync(process.execPath,['scripts/build-question-catalog.cjs','--output',original]);
  assert.notEqual(result.status,0);assert.deepEqual(fs.readFileSync(original),before);
});

test('generated cards, diagrams and standalone preview are current',()=>{
  execFileSync(process.execPath,['scripts/build-mechanism-cards.cjs','--check']);
  execFileSync(process.execPath,['scripts/build-mechanism-preview.cjs','--check']);
});
