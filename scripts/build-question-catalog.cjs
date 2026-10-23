'use strict';
const fs = require('node:fs');
const bank = JSON.parse(fs.readFileSync('questions.json', 'utf8'));
const quote = text => `'${String(text).replace(/'/g, "''")}'`;
const rows = bank.questions.map(q => `(${quote(bank.meta.bankVersion)},${quote(bank.meta.scoringVersion)},${quote(q.id)},${q.maxMark},array[${q.prerequisites.map(quote).join(',')}],${quote(q.type)})`);
fs.writeFileSync('supabase/migrations/202610230003_question_catalog.sql',
  '-- Generated from questions.json by node scripts/build-question-catalog.cjs. No answer data.\nbegin;\n' +
  'insert into public.learning_question_versions (bank_version,scoring_version,question_id,maximum_marks,topic_ids,question_type) values\n' + rows.join(',\n') + '\non conflict do nothing;\ncommit;\n');
