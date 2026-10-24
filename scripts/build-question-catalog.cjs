'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const outputIndex = process.argv.indexOf('--output');
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : '';
if (!/^supabase\/migrations\/\d{12}_[a-z0-9_]+\.sql$/.test(output || '')) {
  throw new Error('Pass --output supabase/migrations/NEW_TIMESTAMP_question_catalog.sql. Existing migrations must not be rewritten. Use --check to verify an existing generated file.');
}
const subjectIndex=process.argv.indexOf('--subject');
const subjectId=subjectIndex<0?'chemistry':process.argv[subjectIndex+1];
const subject=require('../subjects.json').find(subject=>subject.id===subjectId);
if(!subject)throw Error('Choose a registered subject.');
const bankFile=subject.learningBankUrl;
const bank = JSON.parse(fs.readFileSync(path.join(root,bankFile), 'utf8'));
const quote = text => `'${String(text).replace(/'/g, "''")}'`;
const prefix=subjectId==='chemistry'?'':quote(subjectId)+',';
const columns=(subjectId==='chemistry'?'':'subject_id,')+'bank_version,scoring_version,question_id,maximum_marks,topic_ids,question_type';
const rows = bank.questions.map(q => `(${prefix}${quote(bank.meta.bankVersion)},${quote(bank.meta.scoringVersion)},${quote(q.id)},${q.maxMark},array[${q.prerequisites.map(quote).join(',')}],${quote(q.type)})`);
const sql =
  `-- Generated from ${bankFile} by node scripts/build-question-catalog.cjs. No answer data.\nbegin;\n` +
  `insert into public.learning_question_versions (${columns}) values\n` + rows.join(',\n') + '\non conflict do nothing;\ncommit;\n';
const target = path.join(root, output);
if (process.argv.includes('--check')) assert.equal(fs.readFileSync(target, 'utf8'), sql, 'Catalogue migration is stale.');
else fs.writeFileSync(target, sql, {flag: 'wx'});
